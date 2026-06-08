import type { JobFilter, SearchCriteria } from '@auto-job-apply/shared-types';

export interface ISearchService {
  listJobs(userId: string, filters: JobFilter): Promise<{ items: unknown[]; total: number; page: number; limit: number; totalPages: number }>;
  getJob(userId: string, jobId: string): Promise<unknown | null>;
  addJobByUrl(userId: string, url: string): Promise<{ id: string }>;
  deleteJob(userId: string, jobId: string): Promise<void>;
  runSearch(userId: string, criteria: SearchCriteria): Promise<number>;
}
