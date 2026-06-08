import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { RESUME_SERVICE } from './resume.constants.js';
import type { IResumeService } from './interfaces/resume-service.interface.js';

const CreateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  contactInfo: z.record(z.unknown()),
  isDefault: z.boolean().optional(),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  contactInfo: z.record(z.unknown()).optional(),
  summary: z.string().optional(),
  skills: z.array(z.unknown()).optional(),
  experience: z.array(z.unknown()).optional(),
  education: z.array(z.unknown()).optional(),
  projects: z.array(z.unknown()).optional(),
  certifications: z.array(z.unknown()).optional(),
  languages: z.array(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

const ScoreAtsSchema = z.object({
  profile: z.record(z.unknown()),
  jobDescription: z.string().optional(),
});

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(@Inject(RESUME_SERVICE) private readonly resumeService: IResumeService) {}

  @Get('profiles')
  async listProfiles(@CurrentUser() user: JwtPayload) {
    return this.resumeService.listProfiles(user.sub);
  }

  @Get('profiles/:id')
  async getProfile(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.resumeService.getProfile(user.sub, id);
  }

  @Post('profiles')
  async createProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateProfileSchema)) body: any,
  ) {
    return this.resumeService.createProfile(user.sub, body);
  }

  @Put('profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: any,
  ) {
    await this.resumeService.updateProfile(user.sub, id, body);
  }

  @Delete('profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.resumeService.deleteProfile(user.sub, id);
  }

  @Post('resumes/score')
  async scoreAts(@Body(new ZodValidationPipe(ScoreAtsSchema)) body: any) {
    return this.resumeService.scoreAts(body.profile, body.jobDescription);
  }

  @Get('resumes/templates')
  async listTemplates() {
    return {
      regions: [
        { id: 'us_standard', name: 'US Standard', description: 'Standard US resume format' },
        { id: 'uk_standard', name: 'UK Standard', description: 'Standard UK CV format' },
        { id: 'eu_europass', name: 'EU Europass', description: 'European Europass format' },
        { id: 'de_lebenslauf', name: 'German Lebenslauf', description: 'German CV with photo' },
        { id: 'fr_cv', name: 'French CV', description: 'French CV format' },
        { id: 'au_standard', name: 'Australian Standard', description: 'Australian resume format' },
        { id: 'ca_standard', name: 'Canadian Standard', description: 'Canadian resume format' },
        { id: 'in_biodata', name: 'Indian Biodata', description: 'Indian biodata format' },
        { id: 'pk_cv', name: 'Pakistan CV', description: 'Pakistani CV format' },
        { id: 'ae_cv', name: 'UAE CV', description: 'UAE/Gulf CV format' },
        { id: 'general', name: 'General', description: 'Universal format' },
      ],
      layouts: ['classic', 'modern', 'minimal', 'creative'],
      themes: ['default', 'blue', 'green', 'dark'],
    };
  }
}
