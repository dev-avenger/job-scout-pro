export interface IInboxRepository {
  list(userId: string): Promise<unknown[]>;
  getAppliedCompanyNames(userId: string): Promise<string[]>;
  create(data: Record<string, unknown>): Promise<void>;
}
