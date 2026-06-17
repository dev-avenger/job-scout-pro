import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { stripHtml } from './html-utils.js';

const logger = createLogger({ name: 'linkedin-source' });

const PROFILE_ROOT = process.env.BROWSER_PROFILE_DIR || join(process.cwd(), '.browser-profiles');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const MAX_PAGES = 2; // guest endpoint returns ~25 cards/page
const MAX_DETAILS_PER_ROLE = 20; // cap detail fetches per role to limit rate-limit exposure

interface ParsedCard {
  externalId: string;
  title: string;
  companyName: string;
  location?: string;
}

interface JobDetail {
  /** True when the job is "Apply on company site" (offsite); false = Easy Apply. */
  isOffsite: boolean;
  description?: string;
}

/**
 * LinkedIn job source via the PUBLIC "jobs-guest" endpoints (no login):
 *   - list:   /jobs-guest/jobs/api/seeMoreJobPostings/search
 *   - detail: /jobs-guest/jobs/api/jobPosting/{jobId}
 *
 * We only surface "Apply on company site" jobs: the detail page embeds the
 * external apply URL in a hidden <code id="applyUrl">. Jobs that lack it are
 * LinkedIn "Easy Apply" (apply inside LinkedIn) and are SKIPPED — applying to
 * those would require an authenticated session, which we avoid.
 *
 * Plain fetch is used until LinkedIn rate-limits the IP (429/999), then we fall
 * back to a real-Chrome render (optionally the user's persistent profile).
 */
@Injectable()
export class LinkedInSource implements IJobSource {
  readonly name = 'linkedin';
  readonly channel = 'linkedin';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const location = criteria.locations?.[0] || '';
    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];
    const excludeKeywords = criteria.excludeKeywords?.map((k) => k.toLowerCase()) || [];
    const seenIds = new Set<string>();
    const seconds = (criteria.postedWithinDays || 7) * 86400;

    // LinkedIn treats `keywords` as one phrase, so query each role separately.
    const roles = (criteria.keywords.length ? criteria.keywords : ['']).slice(0, 4);

    let browser: import('playwright-core').BrowserContext | null = null;
    let blocked = false;

    try {
      for (const role of roles) {
        // 1) Collect candidate cards across pages.
        const cards: ParsedCard[] = [];
        for (let page = 0; page < MAX_PAGES; page++) {
          const params = new URLSearchParams({ start: String(page * 25), f_TPR: `r${seconds}` });
          if (role) params.set('keywords', role);
          if (location) params.set('location', location);
          const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`;

          let html = blocked ? null : await this.fetchHtml(url);
          if (html === null) {
            blocked = true;
            if (!browser) browser = await this.openContext(criteria.userId);
            html = browser ? await this.renderHtml(browser, url) : null;
          }
          if (!html) break;

          const pageCards = this.parseCards(html);
          logger.info({ role, page, count: pageCards.length }, 'LinkedIn cards parsed');
          if (pageCards.length === 0) break;
          cards.push(...pageCards);
          await this.sleep(blocked ? 2500 : 1000);
        }

        // 2) Resolve each card's apply type; yield only company-site jobs.
        let details = 0;
        for (const card of cards) {
          if (details >= MAX_DETAILS_PER_ROLE) break;
          if (!card.title || !card.companyName) continue;
          if (card.externalId && seenIds.has(card.externalId)) continue;
          if (card.externalId) seenIds.add(card.externalId);
          const titleLc = card.title.toLowerCase();
          if (excludeKeywords.some((k) => titleLc.includes(k))) continue;
          if (excludeCompanies.some((c) => card.companyName.toLowerCase().includes(c))) continue;
          if (!card.externalId) continue;

          details++;
          if (blocked && !browser) browser = await this.openContext(criteria.userId);
          const detail = await this.fetchDetail(card.externalId, blocked ? browser : null);
          await this.sleep(blocked ? 2000 : 800);

          // Only keep "Apply on company site" jobs — skip LinkedIn Easy Apply.
          if (!detail || !detail.isOffsite) continue;

          const viewUrl = `https://www.linkedin.com/jobs/view/${card.externalId}`;
          yield {
            externalId: card.externalId,
            sourceChannel: 'linkedin',
            sourceUrl: viewUrl,
            title: card.title,
            companyName: card.companyName,
            location: card.location || location || undefined,
            description: detail.description,
            postedAt: new Date(),
            // LinkedIn gates the real company URL behind login, so we store the
            // job page; the apply pipeline resolves the offsite destination in
            // the browser (using the user's LinkedIn session) at apply time.
            applyUrl: viewUrl,
          } as RawJobListing;
        }
      }
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
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
      if (res.status === 429 || res.status === 999) {
        logger.warn({ status: res.status }, 'LinkedIn rate-limited a plain fetch — falling back to browser');
        return null;
      }
      if (!res.ok) return '';
      return await res.text();
    } catch {
      return null;
    }
  }

  private parseCards(html: string): ParsedCard[] {
    const $ = cheerio.load(html);
    const cards: ParsedCard[] = [];

    $('li').each((_, el) => {
      const card = $(el);
      const base = card.find('[data-entity-urn], .base-card').first();
      const urn = base.attr('data-entity-urn') || card.find('[data-entity-urn]').attr('data-entity-urn') || '';
      const externalId = urn.split(':').pop() || '';
      const title = card.find('.base-search-card__title').first().text().trim();
      const companyName = card.find('.base-search-card__subtitle').first().text().trim();
      const location = card.find('.job-search-card__location').first().text().trim();
      if (!title || !externalId) return;

      cards.push({ externalId, title, companyName, location: location || undefined });
    });

    return cards;
  }

  /**
   * Fetch a job's detail page and determine whether it's an offsite
   * ("Apply on company site") job, plus its description.
   */
  private async fetchDetail(
    jobId: string,
    browser: import('playwright-core').BrowserContext | null,
  ): Promise<JobDetail | null> {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
    let html = browser ? null : await this.fetchHtml(url);
    if (html === null && browser) html = await this.renderHtml(browser, url);
    if (!html) return null;

    return { isOffsite: this.isOffsiteApply(html), description: this.extractDescription(html) };
  }

  /**
   * The guest detail page tags its apply button with a tracking name:
   *   public_jobs_apply-link-offsite → "Apply on company site"
   *   public_jobs_apply-link-onsite  → LinkedIn Easy Apply
   * (LinkedIn hides the actual destination URL from guests, so we only detect
   * the type here and resolve the URL in the browser at apply time.)
   */
  private isOffsiteApply(html: string): boolean {
    if (/apply-link-offsite/i.test(html)) return true;
    if (/apply-link-onsite/i.test(html)) return false;
    return false; // unknown → treat as Easy Apply and skip
  }

  private extractDescription(html: string): string | undefined {
    const $ = cheerio.load(html);
    const node = $('.description__text, .show-more-less-html__markup').first();
    const text = node.length ? stripHtml(node.html() ?? '') : '';
    return text || undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async openContext(
    userId: string | undefined,
  ): Promise<import('playwright-core').BrowserContext | null> {
    try {
      const playwright = await import('playwright-core');
      if (userId) {
        const profileDir = join(PROFILE_ROOT, userId, 'linkedin');
        return await playwright.chromium.launchPersistentContext(profileDir, {
          headless: process.env.BROWSER_HEADLESS !== 'false',
          channel: 'chrome',
          userAgent: BROWSER_UA,
          viewport: { width: 1366, height: 900 },
        });
      }
      const b = await playwright.chromium
        .launch({ headless: true, channel: 'chrome' })
        .catch(() => playwright.chromium.launch({ headless: true }));
      return await b.newContext({ userAgent: BROWSER_UA });
    } catch (err) {
      logger.warn({ error: err }, 'Could not open Chrome context for LinkedIn');
      return null;
    }
  }

  private async renderHtml(
    context: import('playwright-core').BrowserContext,
    url: string,
  ): Promise<string | null> {
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      return await page.content();
    } catch (err) {
      logger.warn({ error: err, url }, 'LinkedIn browser render failed');
      return null;
    }
  }

  async validate(_job: RawJobListing): Promise<JobValidationResult> {
    // LinkedIn blocks HEAD probes; trust freshly-scraped listings.
    return { isValid: true, status: 'valid' };
  }
}
