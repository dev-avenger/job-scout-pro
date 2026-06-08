export interface IOutreachRepository {
  listMessages(userId: string): Promise<unknown[]>;
  createMessage(data: Record<string, unknown>): Promise<void>;
  updateMessageStatus(messageId: string, data: Record<string, unknown>): Promise<void>;
  listContacts(userId: string): Promise<unknown[]>;
  createContact(data: Record<string, unknown>): Promise<void>;
}
