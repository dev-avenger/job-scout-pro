import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LlmModule } from '../llm/llm.module.js';
import { InboxController } from './inbox.controller.js';
import { InboxService } from './inbox.service.js';
import { InboxRepository } from './inbox.repository.js';
import { EmailClassifierAgent } from './agents/email-classifier.agent.js';
import { ImapClient } from './email/imap-client.js';
import { SmtpClient } from './email/smtp-client.js';
import { EmailParser } from './email/email-parser.js';
import { INBOX_SERVICE, INBOX_REPOSITORY } from './inbox.constants.js';

@Module({
  imports: [LlmModule, BullModule.registerQueue({ name: 'inbox-scan' })],
  controllers: [InboxController],
  providers: [
    { provide: INBOX_REPOSITORY, useClass: InboxRepository },
    { provide: INBOX_SERVICE, useClass: InboxService },
    EmailClassifierAgent,
    ImapClient,
    SmtpClient,
    EmailParser,
  ],
  exports: [INBOX_SERVICE, EmailClassifierAgent, ImapClient, SmtpClient, EmailParser],
})
export class InboxModule {}
