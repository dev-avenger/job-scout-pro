import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Inject, Optional } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { inboxEmails, userPreferences } from '@auto-job-apply/db';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { EVENT_BUS } from '../../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../../core/event-bus/interfaces/event-bus.interface.js';
import { EmailClassifierAgent } from '../../inbox/agents/email-classifier.agent.js';
import { ImapClient } from '../../inbox/email/imap-client.js';
import { EmailParser } from '../../inbox/email/email-parser.js';
import type { ImapConfig } from '../../inbox/email/imap-client.js';
import { createLogger } from '@auto-job-apply/shared-utils';
import { randomUUID } from 'crypto';

const logger = createLogger({ name: 'inbox-scan-processor' });

@Injectable()
@Processor('inbox-scan')
export class InboxScanProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly emailClassifier: EmailClassifierAgent,
    @Optional() private readonly imapClient?: ImapClient,
    @Optional() private readonly emailParser?: EmailParser,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { userId, trigger } = job.data;
    logger.info({ jobId: job.id, userId, trigger }, 'Processing inbox scan');

    if (!userId) {
      logger.warn('No userId provided for inbox scan');
      return;
    }

    // --- IMAP fetch + parse + insert ---
    if (this.imapClient && this.emailParser) {
      try {
        // Query userPreferences for IMAP config stored in notificationChannels JSONB
        const prefs = await this.db.query.userPreferences.findFirst({
          where: eq(userPreferences.userId, userId),
        });

        const channels = prefs?.notificationChannels as Record<string, any> | null;
        const imapConfig: ImapConfig | null = channels?.emailImapConfig || null;

        if (imapConfig) {
          // Determine sinceDate: look for the most recent email in the DB for this user
          const lastEmail = await (this.db
            .select({ createdAt: inboxEmails.createdAt })
            .from(inboxEmails)
            .where(eq(inboxEmails.userId, userId))
            .orderBy((await import('drizzle-orm')).desc(inboxEmails.createdAt))
            .limit(1) as any);

          const sinceDate = lastEmail?.[0]?.createdAt
            ? new Date(lastEmail[0].createdAt)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

          logger.info({ userId, since: sinceDate.toISOString() }, 'Fetching emails via IMAP');

          const fetchedEmails = await this.imapClient.fetchNewEmails(imapConfig, sinceDate);

          for (const fetched of fetchedEmails) {
            try {
              // Parse the raw email source
              const parsed = await this.emailParser.parse(fetched.textBody);

              // Check for duplicate by messageId
              const existing = await (this.db
                .select({ id: inboxEmails.id })
                .from(inboxEmails)
                .where(eq(inboxEmails.messageId, parsed.messageId))
                .limit(1) as any);

              if (existing?.length > 0) {
                logger.debug({ messageId: parsed.messageId }, 'Email already exists, skipping');
                continue;
              }

              // Insert into inboxEmails table
              await (this.db.insert(inboxEmails).values({
                id: randomUUID(),
                userId,
                messageId: parsed.messageId,
                fromAddress: parsed.from,
                subject: parsed.subject,
                bodyPreview: parsed.bodyPreview,
                createdAt: parsed.date,
              }) as any);

              logger.debug({ messageId: parsed.messageId, subject: parsed.subject }, 'Inserted new email');
            } catch (parseErr) {
              logger.error({ error: parseErr, uid: fetched.uid }, 'Failed to parse/insert email');
            }
          }
        } else {
          logger.debug({ userId }, 'No IMAP config found for user, skipping IMAP fetch');
        }
      } catch (imapErr) {
        logger.error({ error: imapErr, userId }, 'IMAP fetch failed, continuing with classification');
      }
    }

    // --- Classify unclassified emails ---
    const unclassified = await (this.db
      .select()
      .from(inboxEmails)
      .where((await import('drizzle-orm')).and(
        (await import('drizzle-orm')).eq(inboxEmails.userId, userId),
        (await import('drizzle-orm')).isNull(inboxEmails.classification),
      ) as any) as any) as any[];

    logger.info({ unclassifiedCount: unclassified.length }, 'Found unclassified emails');

    const context = { userId };

    for (const email of unclassified) {
      try {
        const { classification } = await this.emailClassifier.classifyEmail(
          email.subject || '',
          email.bodyPreview || '',
          email.fromAddress || '',
          context,
        );

        await (this.db.update(inboxEmails).set({
          classification: classification.classification,
          classificationConfidence: classification.confidence,
          processedAt: new Date(),
        } as any).where((await import('drizzle-orm')).eq(inboxEmails.id, email.id) as any) as any);

        await this.eventBus.emit({
          id: randomUUID(),
          timestamp: new Date(),
          userId,
          type: 'email.received',
          data: {
            emailId: email.id,
            classification: classification.classification,
            applicationId: email.applicationId,
          },
        });

        logger.debug({ emailId: email.id, classification: classification.classification }, 'Email classified');
      } catch (err) {
        logger.error({ error: err, emailId: email.id }, 'Email classification failed');
      }
    }

    logger.info({ processed: unclassified.length }, 'Inbox scan complete');
  }
}
