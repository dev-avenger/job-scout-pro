export interface IApplicationRepository {
  list(userId: string, params: { page: number; limit: number; status?: string }): Promise<{ items: unknown[]; total: number }>;
  getById(userId: string, applicationId: string): Promise<any | null>;
  getDefaultProfileId(userId: string): Promise<string | null>;
  getDefaultProfile(userId: string): Promise<any | null>;
  getApplicationsForAutofill(userId: string): Promise<Array<{ id: string; applyUrl: string | null; formAnswers: unknown }>>;
  findByIdempotencyKey(key: string): Promise<any | null>;
  create(data: Record<string, unknown>): Promise<void>;
  updateStatus(applicationId: string, data: Record<string, unknown>): Promise<void>;
  recordEvent(data: Record<string, unknown>): Promise<void>;
  getReviewQueue(userId: string): Promise<unknown[]>;
  getDeadLetter(userId: string): Promise<unknown[]>;
  getLlmRequestsForApplication(applicationId: string): Promise<unknown[]>;
  updateFormAnswers(applicationId: string, formAnswers: unknown): Promise<void>;
  getEventsForApplication(applicationId: string): Promise<unknown[]>;
  getEmailsForApplication(applicationId: string): Promise<unknown[]>;
  getCompanyByName(name: string): Promise<any | null>;
}
