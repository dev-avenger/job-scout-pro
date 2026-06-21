import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { ResearchController } from './research.controller.js';
import { ResearchAnalysisController } from './research-analysis.controller.js';
import { ResearchService } from './research.service.js';
import { ResearchRepository } from './research.repository.js';
import { ScamDetectorAgent } from './agents/scam-detector.agent.js';
import { InterviewPrepAgent } from './agents/interview-prep.agent.js';
import { SalaryEstimatorAgent } from './agents/salary-estimator.agent.js';
import { SkillGapAgent } from './agents/skill-gap.agent.js';
import { RESEARCH_SERVICE, RESEARCH_REPOSITORY } from './research.constants.js';

@Module({
  imports: [LlmModule],
  controllers: [ResearchController, ResearchAnalysisController],
  providers: [
    { provide: RESEARCH_REPOSITORY, useClass: ResearchRepository },
    { provide: RESEARCH_SERVICE, useClass: ResearchService },
    ScamDetectorAgent,
    InterviewPrepAgent,
    SalaryEstimatorAgent,
    SkillGapAgent,
  ],
  exports: [RESEARCH_SERVICE, ScamDetectorAgent, InterviewPrepAgent, SalaryEstimatorAgent, SkillGapAgent],
})
export class ResearchModule {}
