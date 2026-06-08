export interface IInboxService {
  list(userId: string): Promise<unknown[]>;
  processEmail(userId: string, email: Record<string, unknown>): Promise<{ id: string }>;
}
