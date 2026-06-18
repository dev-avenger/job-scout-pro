import { Injectable } from '@nestjs/common';
import RssParser from 'rss-parser';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { matchesKeywords } from '../keyword-match.js';

const logger = createLogger({ name: 'rss-feed-source' });

// Default job board RSS feeds (key-free, working endpoints —
// the old stackoverflow.com/jobs feed is dead and remoteok now has a dedicated source)
const DEFAULT_FEEDS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://remotive.com/remote-jobs/feed',
];

@Injectable()
export class RssFeedSource implements IJobSource {
  readonly name = 'rss_feed';
  readonly channel = 'rss_feed';

  private customFeedUrls: string[] = [];

  setFeedUrls(urls: string[]) {
    this.customFeedUrls = urls;
  }

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    const parser = new RssParser();
    // Per-user feeds from the search criteria win, then instance-level custom
    // feeds, then the built-in defaults.
    const feedUrls = criteria.rssFeedUrls?.length
      ? criteria.rssFeedUrls
      : this.customFeedUrls.length > 0
        ? this.customFeedUrls
        : DEFAULT_FEEDS;
    const keywords = criteria.keywords.map(k => k.toLowerCase());
    const excludeCompanies = criteria.excludeCompanies?.map(c => c.toLowerCase()) || [];

    for (const feedUrl of feedUrls) {
      try {
        const feed = await parser.parseURL(feedUrl);
        logger.info({ feedUrl, itemCount: feed.items.length }, 'Parsed RSS feed');

        for (const item of feed.items) {
          const title = item.title || '';
          const description = item.contentSnippet || item.content || '';
          const fullText = (title + ' ' + description).toLowerCase();

          // Filter by keywords if provided
          if (!matchesKeywords(fullText, keywords)) {
            continue;
          }

          // Extract company from various RSS fields
          const companyName = item.creator || item.author || extractCompanyFromTitle(title) || 'Unknown';

          if (excludeCompanies.some(c => companyName.toLowerCase().includes(c))) continue;

          // Filter by posting date
          const postedAt = item.pubDate ? new Date(item.pubDate) : new Date();
          if (criteria.postedWithinDays) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - criteria.postedWithinDays);
            if (postedAt < cutoff) continue;
          }

          yield {
            sourceChannel: 'rss_feed',
            sourceUrl: item.link || feedUrl,
            title,
            companyName,
            description: description.substring(0, 2000),
            postedAt,
            applyUrl: item.link,
          } as RawJobListing;
        }
      } catch (err) {
        logger.warn({ error: err, feedUrl }, 'Failed to parse RSS feed');
      }
    }
  }

  async validate(job: RawJobListing): Promise<JobValidationResult> {
    try {
      const response = await fetch(job.sourceUrl, { method: 'HEAD' });
      return { isValid: response.ok, status: response.ok ? 'valid' : 'expired' };
    } catch {
      return { isValid: false, status: 'expired' };
    }
  }
}

function extractCompanyFromTitle(title: string): string {
  // Common patterns: "Title at Company", "Title - Company", "Company: Title"
  const atMatch = title.match(/\bat\s+(.+?)(?:\s*[-|]|$)/i);
  if (atMatch) return (atMatch[1] ?? '').trim();

  const dashMatch = title.match(/\s[-|]\s(.+?)$/);
  if (dashMatch) return (dashMatch[1] ?? '').trim();

  const colonMatch = title.match(/^(.+?):\s/);
  if (colonMatch) return (colonMatch[1] ?? '').trim();

  return '';
}
