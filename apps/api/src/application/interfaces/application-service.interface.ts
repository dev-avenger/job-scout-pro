import type { ApplicationStatus } from '@auto-job-apply/shared-types';

export interface IApplicationService {
  list(userId: string, params: { page: number; limit: number; status?: string }): Promise<{ items: unknown[]; total: number; page: number; limit: number; totalPages: number }>;
  getById(userId: string, applicationId: string): Promise<unknown>;
  getDetail(userId: string, applicationId: string): Promise<unknown>;
  getResumeData(userId: string, applicationId: string): Promise<{ data: unknown; filename: string } | null>;
  getAutofill(userId: string, pageUrl: string): Promise<{ applicationId: string; answers: Array<{ fieldId: string; label?: string; value: unknown; type?: string }>; education: Array<Record<string, string>>; experience: Array<Record<string, string | boolean>>; resumeUrl: string; resumeFilename: string } | null>;
  updateFormAnswers(userId: string, applicationId: string, answers: unknown): Promise<void>;
  queue(userId: string, jobId: string, autonomyMode: string): Promise<{ id: string; alreadyExists: boolean }>;
  updateStatus(userId: string, applicationId: string, newStatus: ApplicationStatus): Promise<void>;
  approve(userId: string, applicationId: string): Promise<void>;
  reject(userId: string, applicationId: string): Promise<void>;
  retry(userId: string, applicationId: string): Promise<void>;
  getReviewQueue(userId: string): Promise<unknown[]>;
  getDeadLetter(userId: string): Promise<unknown[]>;
  getKanban?(userId: string): Promise<{ columns: unknown[] }>;
  getEvents?(userId: string, applicationId: string): Promise<unknown[]>;
  create?(userId: string, jobId: string): Promise<{ id: string }>;
  withdraw?(userId: string, applicationId: string): Promise<void>;
}
