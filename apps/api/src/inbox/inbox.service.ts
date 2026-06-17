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
    // Only surface emails about jobs the user applied to through this portal:
    // job-related classification AND mentioning an applied-to company (or
    // explicitly linked to an application).
    const [emails, companies] = await Promise.all([
      this.repo.list(userId),
      this.repo.getAppliedCompanyNames(userId),
    ]);

    const jobClassifications = new Set([
      'interview',
      'offer',
      'rejection',
      'acknowledgement',
      'recruiter',
    ]);
    const companyNeedles = companies
      .map((c) => c.toLowerCase().trim())
      .filter((c) => c.length > 2);

    return (emails as Array<Record<string, unknown>>).filter((email) => {
      if (email.applicationId) return true;
      const classification = String(email.classification ?? '');
      if (!jobClassifications.has(classification)) return false;
      if (companyNeedles.length === 0) return false;
      const haystack = [email.fromAddress, email.subject, email.bodyPreview]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      return companyNeedles.some((c) => haystack.includes(c));
    });
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
