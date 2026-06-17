import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'indeed-source' });

const PROFILE_ROOT = process.env.BROWSER_PROFILE_DIR || join(process.cwd(), '.browser-profiles');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

interface ParsedCard {
  externalId: string;
  title: string;
  companyName: string;
  location?: string;
  snippet?: string;
  url: string;
}

/**
 * Indeed job source. Indeed has no public API, so this scrapes the public
 * search results. A plain fetch usually works; when Indeed serves a JS
 * challenge instead of results, it falls back to headless Chromium.
 */
@Injectable()
export class IndeedApiSource implements IJobSource {
  readonly name = 'indeed_api';
  readonly channel = 'indeed_api';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const location = criteria.locations?.[0] || '';
    const host = this.hostForLocation(location);
    const isCountryDomain = host !== 'www.indeed.com';
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];
    const seenIds = new Set<string>();

    // Indeed treats `q` as a single phrase, so search each target role
    // separately (capped) and aggregate.
    const roles = (criteria.keywords.length ? criteria.keywords : ['']).slice(0, 4);

    // Open ONE persistent Chrome context for the whole search. Reusing the
    // user's logged-in Indeed profile makes country domains (pk/uk) trust the
    // session and skip the "Security Check" they throw at cold requests.
    const browser = await this.openContext(criteria.userId, isCountryDomain);

    try {
      for (const role of roles) {
        const params = new URLSearchParams({ sort: 'date', fromage: String(criteria.postedWithinDays || 7) });
        if (role) params.set('q', role);
        if (location) params.set('l', location);
        const url = `https://${host}/jobs?${params.toString()}`;

        let cards: ParsedCard[] = [];
        try {
          if (browser) {
            // Reuse the trusted browser context
            cards = await this.renderInContext(browser, url, host);
          } else {
            const html = await this.fetchHtml(url);
            cards = html ? this.parseCards(html, host) : [];
            if (cards.length === 0) cards = await this.renderCards(url, host);
          }
        } catch (err) {
          logger.error({ error: err, url }, 'Indeed search failed');
          continue;
        }
        logger.info({ host, role, count: cards.length }, 'Indeed cards parsed');

        for (const card of cards) {
          if (!card.title || !card.companyName) continue;
          if (card.externalId && seenIds.has(card.externalId)) continue;
          if (card.externalId) seenIds.add(card.externalId);
          const fullText = `${card.title} ${card.snippet ?? ''}`.toLowerCase();
          if (!matchesKeywords(fullText, criteria.keywords)) continue;
          if (excludeCompanies.some((c) => card.companyName.toLowerCase().includes(c))) continue;

          yield {
            externalId: card.externalId || undefined,
            sourceChannel: 'indeed_api',
            sourceUrl: card.url,
            title: card.title,
            companyName: card.companyName,
            location: card.location || location || undefined,
            description: card.snippet || undefined,
            postedAt: new Date(),
            applyUrl: card.url,
          } as RawJobListing;
        }

        // Human-like pacing between role queries to avoid the escalating
        // security challenge.
        if (browser) await new Promise((r) => setTimeout(r, 2500));
      }
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  private hostForLocation(location: string): string {
    const l = location.toLowerCase();
    if (l.includes('pakistan')) return 'pk.indeed.com';
    if (l.includes('united kingdom') || l.includes('uk') || l.includes('london')) return 'uk.indeed.com';
    if (l.includes('canada')) return 'ca.indeed.com';
    if (l.includes('uae') || l.includes('dubai')) return 'ae.indeed.com';
    if (l.includes('india')) return 'in.indeed.com';
    return 'www.indeed.com';
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  private parseCards(html: string, host: string): ParsedCard[] {
    const $ = cheerio.load(html);
    const cards: ParsedCard[] = [];
    const seen = new Set<string>();

    // Prefer the beacon container; fall back to result rows. Avoid selecting
    // the inner title anchors directly (they also carry data-jk).
    let cardEls = $('.job_seen_beacon');
    if (cardEls.length === 0) cardEls = $('td.resultContent');
    if (cardEls.length === 0) cardEls = $('div.cardOutline');

    cardEls.each((_, el) => {
      const card = $(el);
      const titleAnchor = card.find('a.jcs-JobTitle, h2.jobTitle a, [id^="jobTitle"]').first();
      const externalId =
        titleAnchor.attr('data-jk') ||
        card.find('[data-jk]').attr('data-jk') ||
        card.attr('data-jk') ||
        '';
      if (!externalId || seen.has(externalId)) return;
      seen.add(externalId);

      // Title: the anchor's text (works whether the title sits in a span)
      const title = (titleAnchor.text() || card.find('h2 span').first().text()).trim();
      const companyName = card.find('[data-testid="company-name"], span.companyName').first().text().trim();
      const location = card.find('[data-testid="text-location"], div.companyLocation').first().text().trim();
      const snippet = card.find('[data-testid="belowJobSnippet"], div.job-snippet, [class*="jobMetaDataGroup"]').first().text().replace(/\s+/g, ' ').trim();
      if (!title) return;

      cards.push({
        externalId,
        title,
        companyName,
        location: location || undefined,
        snippet: snippet || undefined,
        url: `https://${host}/viewjob?jk=${externalId}`,
      });
    });

    return cards;
  }

  /**
   * Open a Chrome context for the search. For country domains we prefer the
   * user's PERSISTENT Indeed profile (logged-in, trusted) so Indeed doesn't
   * throw its Security Check; falls back to a fresh real-Chrome context.
   */
  private async openContext(
    userId: string | undefined,
    preferPersistent: boolean,
  ): Promise<import('playwright-core').BrowserContext | null> {
    if (!preferPersistent) return null; // www.indeed works fine via plain fetch
    try {
      const playwright = await import('playwright-core');
      if (userId) {
        const profileDir = join(PROFILE_ROOT, userId, 'indeed');
        return await playwright.chromium.launchPersistentContext(profileDir, {
          headless: process.env.BROWSER_HEADLESS !== 'false',
          channel: 'chrome',
          userAgent: BROWSER_UA,
          viewport: { width: 1366, height: 900 },
        });
      }
      const browser = await playwright.chromium
        .launch({ headless: true, channel: 'chrome' })
        .catch(() => playwright.chromium.launch({ headless: true }));
      return await browser.newContext({ userAgent: BROWSER_UA });
    } catch (err) {
      logger.warn({ error: err }, 'Could not open Chrome context for Indeed — using plain fetch');
      return null;
    }
  }

  /** Navigate an existing context to a search URL and parse the rendered DOM. */
  private async renderInContext(
    context: import('playwright-core').BrowserContext,
    url: string,
    host: string,
  ): Promise<ParsedCard[]> {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    const html = await page.content();
    if (/Security Check|just a moment|verify you are human/i.test(await page.title())) {
      logger.warn({ url }, 'Indeed security check during render — session may need a fresh login');
    }
    return this.parseCards(html, host);
  }

  private async renderCards(url: string, host: string): Promise<ParsedCard[]> {
    let browser: import('playwright-core').Browser | null = null;
    try {
      const playwright = await import('playwright-core');
      // Real Chrome clears Indeed's "Security Check" far more often than the
      // bundled chromium-shell, which Indeed flags on country domains (pk/uk).
      browser = await playwright.chromium
        .launch({ headless: true, channel: 'chrome' })
        .catch(() => playwright.chromium.launch({ headless: true }));
      const page = await browser.newPage({ userAgent: BROWSER_UA });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);
      const raw = await page.evaluate(() => {
        const doc = (globalThis as { document?: any }).document;
        const els = Array.from(doc.querySelectorAll('.job_seen_beacon, [data-jk]')) as any[];
        const seen = new Set<string>();
        const out: any[] = [];
        for (const c of els) {
          const externalId =
            c.getAttribute('data-jk') || c.querySelector('[data-jk]')?.getAttribute('data-jk') || '';
          if (!externalId || seen.has(externalId)) continue;
          seen.add(externalId);
          const title = c.querySelector('h2.jobTitle a, a.jcs-JobTitle, [id^=jobTitle]')?.textContent?.trim();
          if (!title) continue;
          out.push({
            externalId,
            title,
            companyName: c.querySelector('[data-testid=company-name]')?.textContent?.trim() ?? '',
            location: c.querySelector('[data-testid=text-location]')?.textContent?.trim() ?? '',
            snippet: c.querySelector('[data-testid=belowJobSnippet]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          });
        }
        return out;
      });
      return (raw as any[]).map((r) => ({
        externalId: r.externalId,
        title: r.title,
        companyName: r.companyName,
        location: r.location || undefined,
        snippet: r.snippet || undefined,
        url: `https://${host}/viewjob?jk=${r.externalId}`,
      }));
    } catch (err) {
      logger.warn({ error: err, url }, 'Indeed browser render failed');
      return [];
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  async validate(_job: RawJobListing): Promise<JobValidationResult> {
    // Indeed blocks HEAD probes; trust freshly-scraped listings
    return { isValid: true, status: 'valid' };
  }
}
