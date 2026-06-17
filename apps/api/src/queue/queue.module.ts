import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { createLogger } from '@auto-job-apply/shared-utils';
import { SearchModule } from '../search/search.module.js';
import { ResumeModule } from '../resume/resume.module.js';
import { ApplicationModule } from '../application/application.module.js';
import { InboxModule } from '../inbox/inbox.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { JobSearchProcessor } from './processors/job-search.processor.js';
import { JobValidationProcessor } from './processors/job-validation.processor.js';
import { ApplicationProcessor } from './processors/application.processor.js';
import { OutreachProcessor } from './processors/outreach.processor.js';
import { InboxScanProcessor } from './processors/inbox-scan.processor.js';
import { ResearchProcessor } from './processors/research.processor.js';
import { FollowUpProcessor } from './processors/follow-up.processor.js';
import { MaintenanceProcessor } from './processors/maintenance.processor.js';

const logger = createLogger({ name: 'queue-module' });

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: new URL(configService.get<string>('REDIS_URL') || 'redis://localhost:6379').hostname,
          port: parseInt(new URL(configService.get<string>('REDIS_URL') || 'redis://localhost:6379').port || '6379'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'job-search' },
      { name: 'job-validation' },
      { name: 'application' },
      { name: 'outreach' },
      { name: 'inbox-scan' },
      { name: 'research' },
      { name: 'follow-up' },
      { name: 'maintenance' },
    ),
    SearchModule,
    ResumeModule,
    ApplicationModule,
    InboxModule,
    LlmModule,
    SchedulingModule,
  ],
  providers: [
    JobSearchProcessor,
    JobValidationProcessor,
    ApplicationProcessor,
    OutreachProcessor,
    InboxScanProcessor,
    ResearchProcessor,
    FollowUpProcessor,
    MaintenanceProcessor,
  ],
})
export class QueueModule implements OnModuleInit {
  constructor(
    @InjectQueue('job-search') private readonly jobSearchQueue: Queue,
    @InjectQueue('inbox-scan') private readonly inboxScanQueue: Queue,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    @InjectQueue('job-validation') private readonly jobValidationQueue: Queue,
    @InjectQueue('follow-up') private readonly followUpQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      await this.jobSearchQueue.upsertJobScheduler('scheduled-search', {
        every: 6 * 60 * 60 * 1000,
      }, {
        name: 'scheduled-search',
        data: { trigger: 'cron' },
      });

      await this.inboxScanQueue.upsertJobScheduler('scheduled-inbox-scan', {
        every: 15 * 60 * 1000,
      }, {
        name: 'scheduled-inbox-scan',
        data: { trigger: 'cron' },
      });

      await this.maintenanceQueue.upsertJobScheduler('daily-maintenance', {
        pattern: '0 3 * * *',
      }, {
        name: 'daily-maintenance',
        data: { trigger: 'cron' },
      });

      await this.jobValidationQueue.upsertJobScheduler('liveness-check', {
        every: 24 * 60 * 60 * 1000,
      }, {
        name: 'liveness-check',
        data: { trigger: 'cron' },
      });

      // Follow-up sweep: daily at 9am. FollowUpProcessor existed but nothing ever
      // triggered it, so submitted applications never generated follow-ups.
      await this.followUpQueue.upsertJobScheduler('daily-follow-up', {
        pattern: '0 9 * * *',
      }, {
        name: 'daily-follow-up',
        data: { trigger: 'cron' },
      });

      logger.info('Scheduled jobs configured');
    } catch (err) {
      logger.error({ error: err }, 'Failed to configure scheduled jobs');
    }
  }
}
