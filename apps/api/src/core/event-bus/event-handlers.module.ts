import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BullModule } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Database } from '@auto-job-apply/db';
import { notifications } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../database/database.constants.js';
import { EVENT_BUS } from './event-bus.constants.js';
import type { IEventBus } from './interfaces/event-bus.interface.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'event-handlers' });

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'job-validation' },
      { name: 'application' },
    ),
  ],
})
export class EventHandlersModule implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @InjectQueue('job-validation') private readonly validationQueue: Queue,
  ) {}

  onModuleInit() {
    this.registerHandlers();
  }

  private registerHandlers() {
    // job.discovered -> queue validation, create notification
    this.eventBus.on('job.discovered', async (event) => {
      const { jobId, title, company } = event.data as any;
      logger.info({ jobId, title }, 'Job discovered, queuing validation');

      await this.validationQueue.add('validate', {
        userId: event.userId,
        jobId,
      });

      await this.db.insert(notifications).values({
        userId: event.userId,
        type: 'job_discovered',
        title: 'New Job Found',
        body: `${title} at ${company}`,
        priority: 'low',
        metadata: { jobId },
      } as any);
    });

    // application.submitted -> notification
    this.eventBus.on('application.submitted', async (event) => {
      const { applicationId, portal } = event.data as any;
      logger.info({ applicationId }, 'Application submitted');

      await this.db.insert(notifications).values({
        userId: event.userId,
        type: 'application_submitted',
        title: 'Application Submitted',
        body: `Application submitted via ${portal}`,
        priority: 'normal',
        metadata: { applicationId },
      } as any);
    });

    // application.failed -> notification
    this.eventBus.on('application.failed', async (event) => {
      const { applicationId, reason } = event.data as any;
      logger.warn({ applicationId, reason }, 'Application failed');

      await this.db.insert(notifications).values({
        userId: event.userId,
        type: 'application_failed',
        title: 'Application Failed',
        body: reason || 'An error occurred during application submission',
        priority: 'high',
        metadata: { applicationId },
      } as any);
    });

    // email.received (interview) -> notification + status update
    this.eventBus.on('email.received', async (event) => {
      const { emailId, classification, applicationId } = event.data as any;
      if (classification === 'interview') {
        logger.info({ emailId, applicationId }, 'Interview detected');
        await this.db.insert(notifications).values({
          userId: event.userId,
          type: 'interview_detected',
          title: 'Interview Invitation!',
          body: 'You received an interview invitation. Check your inbox.',
          priority: 'urgent',
          metadata: { emailId, applicationId },
        } as any);
      }
    });

    // budget.threshold -> notification
    this.eventBus.on('budget.threshold', async (event) => {
      const { period, percentage } = event.data as any;
      await this.db.insert(notifications).values({
        userId: event.userId,
        type: 'budget_warning',
        title: 'Budget Warning',
        body: `You have used ${percentage}% of your ${period} LLM budget`,
        priority: 'high',
        metadata: { period, percentage },
      } as any);
    });

    // budget.exhausted -> notification
    this.eventBus.on('budget.exhausted', async (event) => {
      const { period, spent, cap } = event.data as any;
      await this.db.insert(notifications).values({
        userId: event.userId,
        type: 'budget_exhausted',
        title: 'Budget Exhausted',
        body: `Your ${period} LLM budget is exhausted ($${(spent/100).toFixed(2)}/$${(cap/100).toFixed(2)}). Switching to Ollama fallback.`,
        priority: 'urgent',
        metadata: { period, spent, cap },
      } as any);
    });

    logger.info('Event handlers registered');
  }
}
