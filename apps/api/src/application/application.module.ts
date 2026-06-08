import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { ApplicationController } from './application.controller.js';
import { ApplicationService } from './application.service.js';
import { ApplicationRepository } from './application.repository.js';
import { AnswerBank } from './answer-bank.js';
import { PortalMappingCache } from './portal-mapping-cache.js';
import { DomAnalyzerAgent } from './agents/dom-analyzer.agent.js';
import { FormFillerAgent } from './agents/form-filler.agent.js';
import { APPLICATION_SERVICE, APPLICATION_REPOSITORY } from './application.constants.js';

@Module({
  imports: [LlmModule],
  controllers: [ApplicationController],
  providers: [
    { provide: APPLICATION_REPOSITORY, useClass: ApplicationRepository },
    { provide: APPLICATION_SERVICE, useClass: ApplicationService },
    AnswerBank,
    PortalMappingCache,
    DomAnalyzerAgent,
    FormFillerAgent,
  ],
  exports: [APPLICATION_SERVICE],
})
export class ApplicationModule {}
