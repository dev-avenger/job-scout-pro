export interface IOutreachService {
  listMessages(userId: string): Promise<unknown[]>;
  createMessage(userId: string, data: { applicationId?: string; contactId?: string; type: string; subject: string; body: string }): Promise<{ id: string }>;
  approveAndSend(userId: string, messageId: string): Promise<void>;
  listContacts(userId: string): Promise<unknown[]>;
  createContact(userId: string, data: { name: string; email?: string; title?: string; company?: string; linkedinUrl?: string; relationshipType?: string }): Promise<{ id: string }>;
}
