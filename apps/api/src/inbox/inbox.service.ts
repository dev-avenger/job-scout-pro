import { Injectable, Inject } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { INBOX_REPOSITORY } from './inbox.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IInboxRepository } from './interfaces/inbox-repository.interface.js';
import type { IInboxService } from './interfaces/inbox-service.interface.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';

@Injectable()
export class InboxService implements IInboxService {
  constructor(
    @Inject(INBOX_REPOSITORY) private readonly repo: IInboxRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async list(userId: string) {
    return this.repo.list(userId);
  }

  async processEmail(userId: string, email: Record<string, unknown>) {
    const id = generateId();
    await this.repo.create({
      id,
      userId,
      messageId: email.messageId,
      fromAddress: email.fromAddress,
      subject: email.subject,
      bodyPreview: email.bodyPreview,
      classification: email.classification,
      classificationConfidence: email.classificationConfidence,
      applicationId: email.applicationId,
      processedAt: new Date(),
    });

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'email.received',
      data: {
        emailId: id,
        classification: email.classification as string,
        applicationId: email.applicationId as string | undefined,
      },
    });

    return { id };
  }
}
