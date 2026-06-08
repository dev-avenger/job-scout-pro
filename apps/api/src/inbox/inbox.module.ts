import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { InboxController } from './inbox.controller.js';
import { InboxService } from './inbox.service.js';
import { InboxRepository } from './inbox.repository.js';
import { EmailClassifierAgent } from './agents/email-classifier.agent.js';
import { INBOX_SERVICE, INBOX_REPOSITORY } from './inbox.constants.js';

@Module({
  imports: [LlmModule],
  controllers: [InboxController],
  providers: [
    { provide: INBOX_REPOSITORY, useClass: InboxRepository },
    { provide: INBOX_SERVICE, useClass: InboxService },
    EmailClassifierAgent,
  ],
  exports: [INBOX_SERVICE],
})
export class InboxModule {}
