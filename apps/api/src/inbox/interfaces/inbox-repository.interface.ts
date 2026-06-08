export interface IInboxRepository {
  list(userId: string): Promise<unknown[]>;
  create(data: Record<string, unknown>): Promise<void>;
}
