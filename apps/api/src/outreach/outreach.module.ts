import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { OutreachController } from './outreach.controller.js';
import { OutreachService } from './outreach.service.js';
import { OutreachRepository } from './outreach.repository.js';
import { OutreachWriterAgent } from './agents/outreach-writer.agent.js';
import { OUTREACH_SERVICE, OUTREACH_REPOSITORY } from './outreach.constants.js';

@Module({
  imports: [LlmModule],
  controllers: [OutreachController],
  providers: [
    { provide: OUTREACH_REPOSITORY, useClass: OutreachRepository },
    { provide: OUTREACH_SERVICE, useClass: OutreachService },
    OutreachWriterAgent,
  ],
  exports: [OUTREACH_SERVICE, OutreachWriterAgent],
})
export class OutreachModule {}
