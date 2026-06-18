import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { Database } from '@auto-job-apply/db';
import { jobs } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'deduplication-engine' });

function stringSimilarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1;
  if (al.length === 0 || bl.length === 0) return 0;

  const longer = al.length > bl.length ? al : bl;
  const shorter = al.length > bl.length ? bl : al;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1]!;
        if (longer[i - 1] !== shorter[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]!) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return 1 - costs[shorter.length]! / longer.length;
}

@Injectable()
export class DeduplicationEngine {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async isDuplicate(
    userId: string,
    rawJob: { externalId?: string; sourceUrl?: string; title: string; companyName: string },
  ): Promise<{ isDuplicate: boolean; duplicateOfId?: string }> {
    // 1. Exact match on externalId
    if (rawJob.externalId) {
      const existing = await (this.db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.externalId, rawJob.externalId)) as any)
        .limit(1) as any);
      if (existing.length > 0) {
        logger.debug({ externalId: rawJob.externalId }, 'Duplicate found by externalId');
        return { isDuplicate: true, duplicateOfId: existing[0].id };
      }
    }

    // 2. Exact match on sourceUrl
    if (rawJob.sourceUrl) {
      const existing = await (this.db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.userId, userId), eq(jobs.sourceUrl, rawJob.sourceUrl)) as any)
        .limit(1) as any);
      if (existing.length > 0) {
        logger.debug({ sourceUrl: rawJob.sourceUrl }, 'Duplicate found by sourceUrl');
        return { isDuplicate: true, duplicateOfId: existing[0].id };
      }
    }

    // 3. Fuzzy match on title + company (threshold 0.85)
    const candidates = await (this.db
      .select({ id: jobs.id, title: jobs.title, companyName: jobs.companyName })
      .from(jobs)
      .where(eq(jobs.userId, userId) as any)
      .limit(500) as any) as Array<{ id: string; title: string; companyName: string }>;

    for (const candidate of candidates) {
      const titleSim = stringSimilarity(rawJob.title, candidate.title);
      const companySim = stringSimilarity(rawJob.companyName, candidate.companyName);
      const combined = (titleSim * 0.6) + (companySim * 0.4);

      if (combined >= 0.85) {
        logger.debug(
          { title: rawJob.title, matchTitle: candidate.title, score: combined },
          'Duplicate found by fuzzy match',
        );
        return { isDuplicate: true, duplicateOfId: candidate.id };
      }
    }

    return { isDuplicate: false };
  }
}
