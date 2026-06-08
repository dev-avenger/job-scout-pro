import type { ApplicationStatus } from '@auto-job-apply/shared-types';

export interface IApplicationService {
  list(userId: string, params: { page: number; limit: number; status?: string }): Promise<{ items: unknown[]; total: number; page: number; limit: number; totalPages: number }>;
  getById(userId: string, applicationId: string): Promise<unknown>;
  queue(userId: string, jobId: string, autonomyMode: string): Promise<{ id: string; alreadyExists: boolean }>;
  updateStatus(userId: string, applicationId: string, newStatus: ApplicationStatus): Promise<void>;
  approve(userId: string, applicationId: string): Promise<void>;
  reject(userId: string, applicationId: string): Promise<void>;
  retry(userId: string, applicationId: string): Promise<void>;
  getReviewQueue(userId: string): Promise<unknown[]>;
  getDeadLetter(userId: string): Promise<unknown[]>;
}
