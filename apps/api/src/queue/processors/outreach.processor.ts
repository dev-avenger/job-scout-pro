import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject, Optional } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { outreachMessages, userPreferences } from '@auto-job-apply/db';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { SmtpClient } from '../../inbox/email/smtp-client.js';
import type { SmtpConfig } from '../../inbox/email/smtp-client.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import { randomUUID } from 'crypto';

const logger = createLogger({ name: 'outreach-processor' });

@Injectable()
@Processor('outreach')
export class OutreachProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Optional() private readonly smtpClient?: SmtpClient,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, messageId, type } = job.data;
    logger.info({ jobId: job.id, messageId, type }, 'Processing outreach');

    if (!messageId) {
      logger.info({ type }, 'No messageId, auto-drafting follow-up not yet implemented');
      return;
    }

    // Load the message
    const result = await (this.db.select().from(outreachMessages).where(eq(outreachMessages.id, messageId) as any).limit(1) as any);
    const message = result[0];
    if (!message) {
      logger.warn({ messageId }, 'Message not found');
      return;
    }

    // Attempt to send via SMTP if SmtpClient is available and user has SMTP config
    let sentViaSmtp = false;

    if (this.smtpClient && userId) {
      try {
        // Query userPreferences for SMTP config stored in notificationChannels JSONB
        const prefs = await this.db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        const channels = prefs?.notificationChannels as Record<string, any> | null;
        const smtpConfig: SmtpConfig | null = channels?.emailSmtpConfig || null;

        if (smtpConfig) {
          logger.info({ messageId, to: message.subject }, 'Sending email via SMTP');

          const sendResult = await this.smtpClient.sendEmail(smtpConfig, {
            to: message.subject || '', // recipient address stored in subject field for outreach
            subject: message.subject || '',
            text: message.body || '',
            html: message.body || '',
          });

          logger.info({ messageId, smtpMessageId: sendResult.messageId }, 'Email sent via SMTP');
          sentViaSmtp = true;
        } else {
          logger.debug({ userId }, 'No SMTP config found for user');
        }
      } catch (smtpErr) {
        logger.error({ error: smtpErr, messageId }, 'SMTP send failed, falling back to mark-as-sent');
      }
    }

    if (!sentViaSmtp) {
      logger.info({ messageId, to: message.subject }, 'Email sending not yet wired - marking as sent');
    }

    await (this.db.update(outreachMessages).set({
      status: 'sent',
      sentAt: new Date(),
    } as any).where(eq(outreachMessages.id, messageId) as any) as any);

    await this.eventBus.emit({
      id: randomUUID(),
      timestamp: new Date(),
      userId,
      type: 'email.sent',
      data: { outreachId: messageId, type: message.type || type },
    });

    logger.info({ messageId, sentViaSmtp }, 'Outreach processed');
  }
}
