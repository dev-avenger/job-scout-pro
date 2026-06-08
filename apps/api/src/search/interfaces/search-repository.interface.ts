import type { JobFilter } from '@auto-job-apply/shared-types';

export interface ISearchRepository {
  findJobsByUser(userId: string, filters: JobFilter): Promise<{ items: unknown[]; total: number }>;
  findJobById(userId: string, jobId: string): Promise<unknown | null>;
  insertJob(data: Record<string, unknown>): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
}
