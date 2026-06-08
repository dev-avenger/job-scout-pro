export interface IApplicationRepository {
  list(userId: string, params: { page: number; limit: number; status?: string }): Promise<{ items: unknown[]; total: number }>;
  getById(userId: string, applicationId: string): Promise<any | null>;
  findByIdempotencyKey(key: string): Promise<any | null>;
  create(data: Record<string, unknown>): Promise<void>;
  updateStatus(applicationId: string, data: Record<string, unknown>): Promise<void>;
  recordEvent(data: Record<string, unknown>): Promise<void>;
  getReviewQueue(userId: string): Promise<unknown[]>;
  getDeadLetter(userId: string): Promise<unknown[]>;
}
