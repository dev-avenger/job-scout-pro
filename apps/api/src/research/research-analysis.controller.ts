import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { RESEARCH_SERVICE } from './research.constants.js';
import type { IResearchService } from './interfaces/research-service.interface.js';

const SalarySchema = z.object({
  title: z.string().min(1),
  company: z.string().optional(),
  location: z.string().optional(),
  locationType: z.string().optional(),
  experienceLevel: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// Either resolve everything from an application, or pass explicit fields.
const SkillGapSchema = z
  .object({
    applicationId: z.string().uuid().optional(),
    jobTitle: z.string().min(1).optional(),
    jobDescription: z.string().optional(),
    requiredSkills: z.array(z.string()).optional(),
    profileSkills: z.array(z.string()).optional(),
    profileSummary: z.string().optional(),
  })
  .refine((d) => d.applicationId || (d.jobTitle && d.profileSkills), {
    message: 'Provide either applicationId, or jobTitle + profileSkills',
  });

const InterviewPrepSchema = z.object({
  applicationId: z.string().uuid(),
});

@Controller('api/v1/research')
@UseGuards(JwtAuthGuard)
export class ResearchAnalysisController {
  constructor(@Inject(RESEARCH_SERVICE) private readonly researchService: IResearchService) {}

  @Post('salary')
  async estimateSalary(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(SalarySchema)) body: z.infer<typeof SalarySchema>,
  ) {
    return this.researchService.estimateSalary(user.sub, body);
  }

  @Post('skill-gap')
  async analyzeSkillGap(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(SkillGapSchema)) body: z.infer<typeof SkillGapSchema>,
  ) {
    if (body.applicationId) {
      return this.researchService.analyzeSkillGapForApplication(user.sub, body.applicationId);
    }
    return this.researchService.analyzeSkillGap(user.sub, {
      jobTitle: body.jobTitle!,
      jobDescription: body.jobDescription,
      requiredSkills: body.requiredSkills,
      profileSkills: body.profileSkills!,
      profileSummary: body.profileSummary,
    });
  }

  @Post('interview-prep')
  async generateInterviewPrep(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(InterviewPrepSchema)) body: z.infer<typeof InterviewPrepSchema>,
  ) {
    return this.researchService.generateInterviewPrep(user.sub, body.applicationId);
  }
}
