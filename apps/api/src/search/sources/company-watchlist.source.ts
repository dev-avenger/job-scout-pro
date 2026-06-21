import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { matchesKeywords } from '../keyword-match.js';
import { stripHtml } from './html-utils.js';

const logger = createLogger({ name: 'company-watchlist-source' });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

type WatchlistEntry = {
  company: string;
  adapter: 'workable' | 'greenhouse' | 'lever' | 'html' | 'successfactors' | 'bamboohr';
  ref: string;
  city?: string;
  country?: string;
};

interface FoundJob {
  externalId?: string;
  title: string;
  url: string;
  /** Canonical ATS-hosted URL when the public URL is a custom domain. */
  applyUrl?: string;
  location?: string;
  postedAt?: Date;
  description?: string;
}

/**
 * Polls the career pages / ATS boards of companies the user explicitly
 * watches. Most company portals only require login to APPLY — listings are
 * public via the ATS APIs (Workable, Greenhouse, Lever) or the careers page
 * HTML itself.
 */
@Injectable()
export class CompanyWatchlistSource implements IJobSource {
  readonly name = 'company_watchlist';
  readonly channel = 'company_watchlist';

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const watchlist = (criteria.watchlist ?? []) as WatchlistEntry[];
    if (watchlist.length === 0) return;

    const excludeCompanies = criteria.excludeCompanies?.map((c) => c.toLowerCase()) || [];

    for (const entry of watchlist) {
      if (excludeCompanies.some((c) => entry.company.toLowerCase().includes(c))) continue;

      let jobs: FoundJob[] = [];
      try {
        switch (entry.adapter) {
          case 'workable':
            jobs = await this.fetchWorkable(entry.ref);
            break;
          case 'greenhouse':
            jobs = await this.fetchGreenhouse(entry.ref);
            break;
          case 'lever':
            jobs = await this.fetchLever(entry.ref);
            break;
          case 'html':
            jobs = await this.fetchHtml(entry.ref, criteria.keywords);
            break;
          case 'successfactors':
            jobs = await this.fetchSuccessFactors(entry.ref);
            break;
          case 'bamboohr':
            jobs = await this.fetchBambooHr(entry.ref);
            break;
        }
      } catch (err) {
        logger.error({ error: err, company: entry.company }, 'Watchlist company fetch failed');
        continue;
      }

      logger.info({ company: entry.company, adapter: entry.adapter, count: jobs.length }, 'Watchlist company checked');

      // Match on title first (descriptions arrive lazily), then enrich only
      // the survivors so we never fetch 160 descriptions to keep 3.
      const matched = jobs.filter(
        (job) => criteria.keywords.length === 0 || matchesKeywords(job.title.toLowerCase(), criteria.keywords),
      );
      if (entry.adapter === 'workable') {
        await this.enrichWorkableDescriptions(entry.ref, matched.slice(0, 20));
      }
      if (entry.adapter === 'bamboohr') {
        await this.enrichBambooHrDescriptions(entry.ref, matched.slice(0, 20));
      }

      for (const job of matched) {
        yield {
          externalId: job.externalId,
          sourceChannel: 'company_watchlist',
          sourceUrl: job.url,
          title: job.title,
          companyName: entry.company,
          location:
            job.location ??
            [entry.city, entry.country].filter(Boolean).join(', ') ??
            undefined,
          description: job.description?.substring(0, 2000),
          postedAt: job.postedAt ?? new Date(),
          applyUrl: job.applyUrl ?? job.url,
        } as RawJobListing;
      }
    }
  }

  private async fetchWorkable(slug: string): Promise<FoundJob[]> {
    const response = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${slug}`, {
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      jobs?: Array<{
        title?: string;
        shortcode?: string;
        url?: string;
        city?: string;
        country?: string;
        published_on?: string;
        description?: string;
      }>;
    };
    const jobs = (data.jobs ?? [])
      .filter((j) => j.title)
      .map((j) => ({
        externalId: j.shortcode,
        title: j.title!,
        url: j.url || `https://apply.workable.com/${slug}/j/${j.shortcode ?? ''}`,
        location: [j.city, j.country].filter(Boolean).join(', ') || undefined,
        postedAt: j.published_on ? new Date(j.published_on) : undefined,
        description: j.description,
      }));

    return jobs;
  }

  /** Fill in descriptions for the given Workable jobs from the per-job API. */
  private async enrichWorkableDescriptions(slug: string, jobs: FoundJob[]): Promise<void> {
    await Promise.all(
      jobs.map(async (job) => {
        if (job.description || !job.externalId) return;
        try {
          const res = await fetch(
            `https://apply.workable.com/api/v2/accounts/${slug}/jobs/${job.externalId}`,
            { headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA } },
          );
          if (!res.ok) return;
          const detail = (await res.json()) as { description?: string; requirements?: string };
          const text = [detail.description, detail.requirements]
            .filter(Boolean)
            .map((t) => stripHtml(String(t)))
            .join('\n\n');
          if (text) job.description = text;
        } catch {
          // listing stays usable without the description
        }
      }),
    );
  }

  private async fetchGreenhouse(slug: string): Promise<FoundJob[]> {
    // content=true includes the full job description (HTML-escaped)
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      {
        headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as {
      jobs?: Array<{
        id?: number;
        title?: string;
        absolute_url?: string;
        updated_at?: string;
        location?: { name?: string };
        content?: string;
      }>;
    };
    return (data.jobs ?? [])
      .filter((j) => j.title && j.absolute_url)
      .map((j) => ({
        externalId: j.id != null ? String(j.id) : undefined,
        title: j.title!,
        url: j.absolute_url!,
        // Companies like Elastic serve Greenhouse jobs from custom domains;
        // the canonical boards URL keeps the form API reachable.
        applyUrl:
          j.id != null ? `https://boards.greenhouse.io/${slug}/jobs/${j.id}` : undefined,
        location: j.location?.name,
        postedAt: j.updated_at ? new Date(j.updated_at) : undefined,
        // Greenhouse escapes the HTML, so decode once (first pass) then strip
        description: j.content ? stripHtml(stripHtml(j.content)) : undefined,
      }));
  }

  private async fetchLever(slug: string): Promise<FoundJob[]> {
    const response = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as Array<{
      id?: string;
      text?: string;
      hostedUrl?: string;
      createdAt?: number;
      categories?: { location?: string };
      descriptionPlain?: string;
    }>;
    if (!Array.isArray(data)) return [];
    return data
      .filter((j) => j.text && j.hostedUrl)
      .map((j) => ({
        externalId: j.id,
        title: j.text!,
        url: j.hostedUrl!,
        location: j.categories?.location,
        postedAt: j.createdAt ? new Date(j.createdAt) : undefined,
        description: j.descriptionPlain,
      }));
  }

  /**
   * Generic fallback for custom career pages: collect links that look like
   * job postings. Tries plain HTML first (cheap); when the page is
   * JavaScript-rendered (almost no anchors in the raw HTML), renders it with
   * headless Chromium and extracts links from the live DOM.
   */
  private async fetchHtml(url: string, keywords: string[]): Promise<FoundJob[]> {
    let anchors: Array<{ text: string; href: string }> = [];

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
      });
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        $('a').each((_, el) => {
          anchors.push({
            text: $(el).text().replace(/\s+/g, ' ').trim(),
            href: $(el).attr('href') ?? '',
          });
        });
      }
    } catch {
      // fall through to the browser path
    }

    // JS-rendered page (e.g. Systems Ltd, NetSol, Contour): few real anchors
    // in raw HTML — render with Playwright instead.
    const meaningful = anchors.filter((a) => a.text.length >= 6 && a.href);
    if (meaningful.length < 5) {
      const rendered = await this.renderWithBrowser(url);
      if (rendered.length > 0) anchors = rendered;
    }

    return this.extractJobLinks(anchors, url, keywords);
  }

  /**
   * SAP SuccessFactors career sites (career{N}.sapsf.eu/career?company=X).
   * The listing only appears after clicking "Search Jobs" in the rendered
   * page, so this drives a headless browser: load → click search → collect
   * job-listing links. One adapter covers every SF-based enterprise.
   */
  private async fetchSuccessFactors(careerUrl: string): Promise<FoundJob[]> {
    let browser: import('playwright-core').Browser | null = null;
    try {
      const playwright = await import('playwright-core');
      browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage({ userAgent: BROWSER_UA });
      await page.goto(careerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(5000);

      // Submit the (empty) search to list all openings
      const clicked = await page.evaluate(() => {
        const doc = (globalThis as { document?: any }).document;
        const els = Array.from(
          doc.querySelectorAll('button, input[type=submit], input[type=button]'),
        ) as any[];
        const target = els.find((el) => /search/i.test(el.textContent || el.value || ''));
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      if (!clicked) {
        logger.warn({ careerUrl }, 'SuccessFactors search button not found');
        return [];
      }
      await page.waitForTimeout(6000);

      const anchors = await page.$$eval('a', (els) =>
        els.map((el) => ({
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
          href: el.getAttribute('href') ?? '',
        })),
      );

      const base = new URL(careerUrl);
      const seen = new Set<string>();
      const jobs: FoundJob[] = [];
      for (const { text, href } of anchors) {
        if (!text || !/career_ns=job_listing|career%5fns=job%5flisting/i.test(href)) continue;
        let absolute: string;
        try {
          absolute = new URL(href, base).toString();
        } catch {
          continue;
        }
        if (seen.has(absolute)) continue;
        seen.add(absolute);
        jobs.push({ title: text, url: absolute });
      }
      // Visit each posting (capped) to pull its description text
      for (const job of jobs.slice(0, 8)) {
        try {
          await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2500);
          const text = await page.evaluate(() => {
            const doc = (globalThis as { document?: any }).document;
            const el =
              doc.querySelector('.joqReqDescription, .jobDisplay, [class*="jobdescription" i]') ??
              doc.body;
            return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
          });
          if (text) job.description = text.substring(0, 2000);
        } catch {
          // keep the listing without a description
        }
      }

      logger.info({ careerUrl, count: jobs.length }, 'SuccessFactors listings extracted');
      return jobs;
    } catch (err) {
      logger.warn({ error: err, careerUrl }, 'SuccessFactors fetch failed');
      return [];
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  /**
   * BambooHR-hosted careers ({company}.bamboohr.com). The public widget feed
   * `/careers/list` returns every open posting as JSON — no auth, no scraping.
   * `ref` is the company subdomain (e.g. "acme" for acme.bamboohr.com).
   */
  private async fetchBambooHr(subdomain: string): Promise<FoundJob[]> {
    const base = `https://${subdomain}.bamboohr.com`;
    const response = await fetch(`${base}/careers/list`, {
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      result?: Array<{
        id?: number | string;
        jobOpeningName?: string;
        locationLabel?: string;
        atsLocation?: { city?: string; state?: string; addressCountry?: string };
        employmentStatusLabel?: string;
        jobOpeningShareUrl?: string;
      }>;
    };
    return (data.result ?? [])
      .filter((j) => j.jobOpeningName && j.id != null)
      .map((j) => {
        const id = String(j.id);
        const location =
          j.locationLabel ||
          [j.atsLocation?.city, j.atsLocation?.state, j.atsLocation?.addressCountry]
            .filter(Boolean)
            .join(', ') ||
          undefined;
        return {
          externalId: id,
          title: j.jobOpeningName!,
          url: j.jobOpeningShareUrl || `${base}/careers/${id}`,
          // Canonical BambooHR posting URL keeps the apply detection reachable
          // even when jobOpeningShareUrl points at a custom domain.
          applyUrl: `${base}/careers/${id}`,
          location,
        };
      });
  }

  /** Fill in descriptions for BambooHR jobs from the per-posting detail JSON. */
  private async enrichBambooHrDescriptions(subdomain: string, jobs: FoundJob[]): Promise<void> {
    const base = `https://${subdomain}.bamboohr.com`;
    await Promise.all(
      jobs.map(async (job) => {
        if (job.description || !job.externalId) return;
        try {
          const res = await fetch(`${base}/careers/${job.externalId}/detail`, {
            headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
          });
          if (!res.ok) return;
          const detail = (await res.json()) as {
            result?: { jobOpening?: { description?: string }; description?: string };
          };
          const html = detail.result?.jobOpening?.description ?? detail.result?.description;
          if (html) job.description = stripHtml(String(html)).substring(0, 2000);
        } catch {
          // listing stays usable without the description
        }
      }),
    );
  }

  /** Render a JS-heavy careers page in headless Chromium and read its DOM. */
  private async renderWithBrowser(url: string): Promise<Array<{ text: string; href: string }>> {
    let browser: import('playwright-core').Browser | null = null;
    try {
      const playwright = await import('playwright-core');
      browser = await playwright.chromium.launch({ headless: true });
      const page = await browser.newPage({ userAgent: BROWSER_UA });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Give client-side frameworks a moment to paint the listings
      await page.waitForTimeout(3500);
      const anchors = await page.$$eval('a', (els) =>
        els.map((el) => ({
          text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
          href: el.getAttribute('href') ?? '',
        })),
      );
      logger.info({ url, anchorCount: anchors.length }, 'Rendered careers page with Chromium');
      return anchors;
    } catch (err) {
      logger.warn({ error: err, url }, 'Browser rendering failed (is Chromium installed? npx playwright install chromium)');
      return [];
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  private extractJobLinks(
    anchors: Array<{ text: string; href: string }>,
    pageUrl: string,
    keywords: string[],
  ): FoundJob[] {
    const base = new URL(pageUrl);
    const jobs: FoundJob[] = [];
    const seen = new Set<string>();

    for (const { text, href } of anchors) {
      if (!text || text.length < 6 || text.length > 120 || !href) continue;
      const looksLikeJobUrl = /job|career|vacanc|opening|position/i.test(href);
      const matchesRole = keywords.length > 0 && matchesKeywords(text.toLowerCase(), keywords);
      if (!matchesRole && !looksLikeJobUrl) continue;
      if (!matchesRole && keywords.length > 0) continue;

      let absolute: string;
      try {
        absolute = new URL(href, base).toString();
      } catch {
        continue;
      }
      if (absolute === pageUrl || seen.has(absolute)) continue;
      seen.add(absolute);
      jobs.push({ title: text, url: absolute });
    }

    return jobs.slice(0, 25);
  }

  async validate(job: RawJobListing): Promise<JobValidationResult> {
    try {
      const response = await fetch(job.sourceUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': BROWSER_UA },
      });
      return { isValid: response.ok, status: response.ok ? 'valid' : 'expired' };
    } catch {
      return { isValid: false, status: 'expired' };
    }
  }
}
