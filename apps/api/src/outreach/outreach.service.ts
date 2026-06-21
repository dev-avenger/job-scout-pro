import { Injectable, Inject } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { OUTREACH_REPOSITORY } from './outreach.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IOutreachRepository } from './interfaces/outreach-repository.interface.js';
import type { IOutreachService } from './interfaces/outreach-service.interface.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';
import { OutreachWriterAgent } from './agents/outreach-writer.agent.js';

@Injectable()
export class OutreachService implements IOutreachService {
  constructor(
    @Inject(OUTREACH_REPOSITORY) private readonly repo: IOutreachRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly writerAgent: OutreachWriterAgent,
  ) {}

  /**
   * Suggest people to contact at a company for a role and draft an outreach
   * email. Returns the suggestions; the caller decides whether to save a
   * contact / draft message.
   */
  async suggestOutreach(
    userId: string,
    data: { companyName: string; jobTitle: string; candidateName?: string; candidateSummary?: string },
  ) {
    const { result, costCents } = await this.writerAgent.suggest(data, { userId });
    return { ...result, costCents };
  }

  async listMessages(userId: string) {
    return this.repo.listMessages(userId);
  }

  async createMessage(userId: string, data: { applicationId?: string; contactId?: string; type: string; subject: string; body: string }) {
    const id = generateId();
    await this.repo.createMessage({
      id,
      userId,
      applicationId: data.applicationId,
      contactId: data.contactId,
      type: data.type,
      subject: data.subject,
      body: data.body,
      status: 'draft',
    });
    return { id };
  }

  async approveAndSend(userId: string, messageId: string) {
    await this.repo.updateMessageStatus(messageId, { status: 'sent', sentAt: new Date() });

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'email.sent',
      data: { outreachId: messageId, type: 'outreach' },
    });
  }

  async listContacts(userId: string) {
    return this.repo.listContacts(userId);
  }

  async createContact(userId: string, data: { name: string; email?: string; title?: string; company?: string; linkedinUrl?: string; relationshipType?: string }) {
    const id = generateId();
    await this.repo.createContact({ id, userId, ...data });
    return { id };
  }
}
