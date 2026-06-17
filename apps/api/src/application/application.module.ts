import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LlmModule } from '../llm/llm.module.js';
import { InboxModule } from '../inbox/inbox.module.js';
import { ResumeModule } from '../resume/resume.module.js';
import { ApplicationController } from './application.controller.js';
import { AnswerBankController } from './answer-bank.controller.js';
import { ApplicationService } from './application.service.js';
import { ApplicationRepository } from './application.repository.js';
import { AnswerBank } from './answer-bank.js';
import { PortalMappingCache } from './portal-mapping-cache.js';
import { DomAnalyzerAgent } from './agents/dom-analyzer.agent.js';
import { FormFillerAgent } from './agents/form-filler.agent.js';
import { AtsApplyService } from './ats-apply.service.js';
import { BrowserApplyService } from './browser-apply.service.js';
import { APPLICATION_SERVICE, APPLICATION_REPOSITORY } from './application.constants.js';

@Module({
  imports: [
    LlmModule,
    InboxModule,
    ResumeModule,
    BullModule.registerQueue({ name: 'application' }),
  ],
  controllers: [ApplicationController, AnswerBankController],
  providers: [
    { provide: APPLICATION_REPOSITORY, useClass: ApplicationRepository },
    { provide: APPLICATION_SERVICE, useClass: ApplicationService },
    AnswerBank,
    PortalMappingCache,
    DomAnalyzerAgent,
    FormFillerAgent,
    AtsApplyService,
    BrowserApplyService,
  ],
  exports: [
    APPLICATION_SERVICE,
    AnswerBank,
    PortalMappingCache,
    DomAnalyzerAgent,
    FormFillerAgent,
    AtsApplyService,
    BrowserApplyService,
  ],
})
export class ApplicationModule {}
