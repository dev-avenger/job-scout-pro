import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { ResumeController } from './resume.controller.js';
import { ResumeService } from './resume.service.js';
import { ResumeRepository } from './resume.repository.js';
import { AtsScorer } from './ats-scorer.js';
import { ResumeTailorAgent } from './agents/resume-tailor.agent.js';
import { CoverLetterAgent } from './agents/cover-letter.agent.js';
import { RESUME_SERVICE, RESUME_REPOSITORY } from './resume.constants.js';

@Module({
  imports: [LlmModule],
  controllers: [ResumeController],
  providers: [
    { provide: RESUME_REPOSITORY, useClass: ResumeRepository },
    { provide: RESUME_SERVICE, useClass: ResumeService },
    AtsScorer,
    ResumeTailorAgent,
    CoverLetterAgent,
  ],
  exports: [RESUME_SERVICE],
})
export class ResumeModule {}
