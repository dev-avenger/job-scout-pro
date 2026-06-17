import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { ResumeController } from './resume.controller.js';
import { ResumeService } from './resume.service.js';
import { ResumeRepository } from './resume.repository.js';
import { AtsScorer } from './ats-scorer.js';
import { ResumeTailorAgent } from './agents/resume-tailor.agent.js';
import { CoverLetterAgent } from './agents/cover-letter.agent.js';
import { ResumeExtractorAgent } from './agents/resume-extractor.agent.js';
import { AtsAnalysisAgent } from './agents/ats-analysis.agent.js';
import { JobTailorAgent } from './agents/job-tailor.agent.js';
import { PdfGenerator } from './export/pdf-generator.js';
import { HtmlPdfGenerator } from './export/html-pdf-generator.js';
import { DocxGenerator } from './export/docx-generator.js';
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
    ResumeExtractorAgent,
    AtsAnalysisAgent,
    JobTailorAgent,
    PdfGenerator,
    HtmlPdfGenerator,
    DocxGenerator,
  ],
  exports: [RESUME_SERVICE, AtsScorer, ResumeTailorAgent, CoverLetterAgent, ResumeExtractorAgent, AtsAnalysisAgent, JobTailorAgent, PdfGenerator, HtmlPdfGenerator, DocxGenerator],
})
export class ResumeModule {}
