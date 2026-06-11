import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Inject, HttpCode, HttpStatus, Res, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { RESUME_SERVICE } from './resume.constants.js';
import type { IResumeService } from './interfaces/resume-service.interface.js';
import { PdfGenerator } from './export/pdf-generator.js';
import { HtmlPdfGenerator } from './export/html-pdf-generator.js';
import { DocxGenerator } from './export/docx-generator.js';
import type { ResumeData } from './export/pdf-generator.js';
import { getTemplateConfig } from './export/template-registry.js';
import { ResumeTailorAgent } from './agents/resume-tailor.agent.js';
import { CoverLetterAgent } from './agents/cover-letter.agent.js';
import { AtsScorer } from './ats-scorer.js';
import type { LayoutType, ThemeType } from '@auto-job-apply/shared-types';
import { TemplateConfigSchema, BuilderLayoutStateSchema, BuilderLayoutStateV2Schema, migrateLayoutState, legacyPlacementFromLayout } from '@auto-job-apply/shared-types';

const VALID_LAYOUTS = ['classic', 'modern', 'minimal', 'creative'] as const;
const VALID_THEMES = ['default', 'blue', 'green', 'dark'] as const;

const VALID_SECTION_TYPES = ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'publications', 'volunteer', 'references'] as const;

/* ---- Validation Schemas ---- */

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
  publications: z.array(z.unknown()).optional(),
  volunteer: z.array(z.unknown()).optional(),
  references: z.array(z.unknown()).optional(),
  regionFields: z.record(z.unknown()).optional(),
  /** v1: SectionOrderItem[]  |  v2/v3: BuilderLayoutState object */
  sectionOrder: z.union([z.array(z.unknown()), z.record(z.unknown())]).optional(),
  customSections: z.array(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

const ImportResumeFileSchema = z.object({
  filename: z.string().min(1).max(255),
  /** base64-encoded file content (PDF or DOCX, max ~10MB) */
  contentBase64: z.string().min(1),
});

const ExportPdfWysiwygSchema = z.object({
  config: TemplateConfigSchema,
  /** current v3 shape, or the legacy v2 shape (migrated in the handler) */
  layoutState: z.union([BuilderLayoutStateSchema, BuilderLayoutStateV2Schema]),
});

const ScoreAtsSchema = z.object({
  profile: z.record(z.unknown()),
  jobDescription: z.string().optional(),
});

const TailorResumeSchema = z.object({
  jobDescription: z.string().min(1),
});

const CoverLetterSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  jobDescription: z.string().min(1),
});

const CreateVersionSchema = z.object({
  templateRegion: z.string().optional(),
  templateLayout: z.string().optional(),
  templateTheme: z.string().optional(),
  tailoredContent: z.record(z.unknown()).optional(),
  atsScore: z.number().int().min(0).max(100).optional(),
  coverLetter: z.string().optional(),
});

const ImproveBulletSchema = z.object({
  bullet: z.string().min(1),
  jobTitle: z.string().optional(),
  jobDescription: z.string().optional(),
});

const AtsScoreProfileSchema = z.object({
  jobDescription: z.string().optional(),
});

/* ---- Dynamic per-section-type Zod schemas ---- */

const sectionSchemas: Record<string, z.ZodSchema> = {
  experience: z.object({
    title: z.string().optional(),
    company: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  }).passthrough(),
  education: z.object({
    degree: z.string().optional(),
    institution: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
  }).passthrough(),
  skills: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    proficiency: z.string().optional(),
  }).passthrough(),
  projects: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    technologies: z.array(z.string()).optional(),
  }).passthrough(),
  certifications: z.object({
    name: z.string().optional(),
    issuer: z.string().optional(),
    date: z.string().optional(),
    expiryDate: z.string().optional(),
    credentialUrl: z.string().optional(),
  }).passthrough(),
  languages: z.object({
    language: z.string().optional(),
    proficiency: z.string().optional(),
  }).passthrough(),
  publications: z.object({
    title: z.string().optional(),
    publisher: z.string().optional(),
    date: z.string().optional(),
    url: z.string().optional(),
  }).passthrough(),
  volunteer: z.object({
    organization: z.string().optional(),
    role: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  }).passthrough(),
  references: z.object({
    name: z.string().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).passthrough(),
};

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(
    @Inject(RESUME_SERVICE) private readonly resumeService: IResumeService,
    private readonly pdfGenerator: PdfGenerator,
    private readonly htmlPdfGenerator: HtmlPdfGenerator,
    private readonly docxGenerator: DocxGenerator,
    private readonly resumeTailorAgent: ResumeTailorAgent,
    private readonly coverLetterAgent: CoverLetterAgent,
    private readonly atsScorer: AtsScorer,
  ) {}

  /* ======================================================================== */
  /*  Profile CRUD                                                            */
  /* ======================================================================== */

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

  /* ======================================================================== */
  /*  Section CRUD  (JSONB array columns)                                     */
  /* ======================================================================== */

  @Get('profiles/:profileId/sections/:sectionType')
  async getSectionItems(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('sectionType') sectionType: string,
  ) {
    this.validateSectionType(sectionType);
    return this.resumeService.getSectionItems(user.sub, profileId, sectionType);
  }

  @Post('profiles/:profileId/sections/:sectionType')
  async addSectionItem(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('sectionType') sectionType: string,
    @Body() body: any,
  ) {
    this.validateSectionType(sectionType);
    const schema = sectionSchemas[sectionType]!;
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Invalid section item',
        details: result.error.flatten(),
      });
    }
    return this.resumeService.addSectionItem(user.sub, profileId, sectionType, result.data as Record<string, unknown>);
  }

  @Put('profiles/:profileId/sections/:sectionType/:itemId')
  async updateSectionItem(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('sectionType') sectionType: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    this.validateSectionType(sectionType);
    const schema = sectionSchemas[sectionType]!;
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Invalid section item',
        details: result.error.flatten(),
      });
    }
    return this.resumeService.updateSectionItem(user.sub, profileId, sectionType, itemId, result.data as Record<string, unknown>);
  }

  @Delete('profiles/:profileId/sections/:sectionType/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSectionItem(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('sectionType') sectionType: string,
    @Param('itemId') itemId: string,
  ) {
    this.validateSectionType(sectionType);
    await this.resumeService.deleteSectionItem(user.sub, profileId, sectionType, itemId);
  }

  /* ======================================================================== */
  /*  Resume Versions                                                         */
  /* ======================================================================== */

  @Get('profiles/:profileId/versions')
  async listVersions(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
  ) {
    return this.resumeService.listResumeVersions(user.sub, profileId);
  }

  @Get('profiles/:profileId/versions/:versionId')
  async getVersion(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.resumeService.getResumeVersion(user.sub, profileId, versionId);
  }

  @Post('profiles/:profileId/versions')
  async createVersion(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(CreateVersionSchema)) body: any,
  ) {
    return this.resumeService.createResumeVersion(user.sub, profileId, body);
  }

  @Delete('profiles/:profileId/versions/:versionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVersion(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Param('versionId') versionId: string,
  ) {
    await this.resumeService.deleteResumeVersion(user.sub, profileId, versionId);
  }

  /* ======================================================================== */
  /*  AI Endpoints                                                            */
  /* ======================================================================== */

  @Post('profiles/:profileId/tailor')
  async tailorResume(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(TailorResumeSchema)) body: { jobDescription: string },
  ) {
    const profile = await this.resumeService.getProfile(user.sub, profileId) as Record<string, unknown>;
    const result = await this.resumeTailorAgent.tailorResume(
      profile,
      body.jobDescription,
      { userId: user.sub, profileId },
    );
    return result;
  }

  @Post('profiles/:profileId/cover-letter')
  async generateCoverLetter(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(CoverLetterSchema)) body: { jobTitle: string; companyName: string; jobDescription: string },
  ) {
    const profile = await this.resumeService.getProfile(user.sub, profileId) as Record<string, unknown>;
    const result = await this.coverLetterAgent.generateCoverLetter(
      profile,
      body.jobTitle,
      body.companyName,
      body.jobDescription,
      { userId: user.sub, profileId },
    );
    return result;
  }

  @Post('profiles/:profileId/ai/improve-bullet')
  async improveBullet(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(ImproveBulletSchema)) body: { bullet: string; jobTitle?: string; jobDescription?: string },
  ) {
    const profile = await this.resumeService.getProfile(user.sub, profileId) as Record<string, unknown>;
    const result = await this.resumeTailorAgent.improveBullet(
      profile,
      body.bullet,
      body.jobTitle,
      body.jobDescription,
      { userId: user.sub, profileId },
    );
    return result;
  }

  @Post('profiles/:profileId/ats-score')
  async scoreProfileAts(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
    @Body() body: { jobDescription?: string },
  ) {
    const profile = await this.resumeService.getProfile(user.sub, profileId) as Record<string, unknown>;
    return this.atsScorer.score(profile, body.jobDescription);
  }

  /* ======================================================================== */
  /*  ATS Scoring (standalone)                                                */
  /* ======================================================================== */

  @Post('resumes/score')
  async scoreAts(@Body(new ZodValidationPipe(ScoreAtsSchema)) body: any) {
    return this.resumeService.scoreAts(body.profile, body.jobDescription);
  }

  /* ======================================================================== */
  /*  Templates & Export                                                      */
  /* ======================================================================== */

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

  @Get('profiles/:id/export/pdf')
  async exportPdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('layout') layout?: string,
    @Query('theme') theme?: string,
    @Res() res?: FastifyReply,
  ) {
    const validLayout = (VALID_LAYOUTS as readonly string[]).includes(layout ?? '') ? layout as LayoutType : 'classic';
    const validTheme = (VALID_THEMES as readonly string[]).includes(theme ?? '') ? theme as ThemeType : 'default';
    const templateConfig = getTemplateConfig(validLayout, validTheme);

    const profile = await this.resumeService.getProfile(user.sub, id) as Record<string, any>;
    const resumeData = this.toResumeData(profile);

    // WYSIWYG engine first (same React renderer as the web preview), pdfkit as fallback
    const layoutState = migrateLayoutState(profile.sectionOrder, templateConfig);
    let buffer: Buffer | null = null;
    if ((process.env.PDF_ENGINE ?? 'chromium') !== 'pdfkit') {
      buffer = await this.htmlPdfGenerator.generate(profile, templateConfig, layoutState);
    }
    buffer ??= await this.pdfGenerator.generate(resumeData, {
      ...templateConfig,
      ...legacyPlacementFromLayout(layoutState),
    });
    res!.headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resumeData.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf"`,
      'Content-Length': buffer.length,
    });
    res!.send(buffer);
  }

  /**
   * WYSIWYG export: the builder posts its exact current design
   * (template config + page layout) so the PDF matches the canvas 1:1.
   */
  @Post('profiles/:id/export/pdf')
  async exportPdfWysiwyg(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ExportPdfWysiwygSchema)) body: any,
    @Res() res?: FastifyReply,
  ) {
    const profile = await this.resumeService.getProfile(user.sub, id) as Record<string, any>;
    const config = body.config;
    // Accepts both v2 and v3 payloads — normalise to v3 before rendering
    const layoutState = migrateLayoutState(body.layoutState, config);

    let buffer: Buffer | null = null;
    if ((process.env.PDF_ENGINE ?? 'chromium') !== 'pdfkit') {
      buffer = await this.htmlPdfGenerator.generate(profile, config, layoutState);
    }
    buffer ??= await this.pdfGenerator.generate(this.toResumeData(profile), {
      ...config,
      ...legacyPlacementFromLayout(layoutState),
    });
    res!.headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(profile.name ?? 'resume').replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf"`,
      'Content-Length': buffer.length,
    });
    res!.send(buffer);
  }

  @Get('profiles/:id/export/docx')
  async exportDocx(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('layout') layout?: string,
    @Query('theme') theme?: string,
    @Res() res?: FastifyReply,
  ) {
    const validLayout = (VALID_LAYOUTS as readonly string[]).includes(layout ?? '') ? layout as LayoutType : 'classic';
    const validTheme = (VALID_THEMES as readonly string[]).includes(theme ?? '') ? theme as ThemeType : 'default';
    const templateConfig = getTemplateConfig(validLayout, validTheme);

    const profile = await this.resumeService.getProfile(user.sub, id) as Record<string, any>;
    const resumeData = this.toResumeData(profile);
    const buffer = await this.docxGenerator.generate(resumeData, templateConfig);
    res!.headers({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${resumeData.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.docx"`,
      'Content-Length': buffer.length,
    });
    res!.send(buffer);
  }

  /**
   * Server-side resume import: extracts text from an uploaded PDF/DOCX,
   * heuristically maps contact info/summary/skills, and stores the full
   * text in rawImport. (specs.md: "Importing your existing resume")
   */
  @Post('profiles/:id/import')
  async importResume(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ImportResumeFileSchema)) body: any,
  ) {
    const profile = await this.resumeService.getProfile(user.sub, id);
    if (!profile) throw new BadRequestException('Profile not found');

    const buffer = Buffer.from(body.contentBase64, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large (max 10MB)');
    }

    const { extractResumeText, parseResumeText } = await import('./import/resume-parser.js');
    let text: string;
    try {
      text = await extractResumeText(body.filename, buffer);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Could not parse file');
    }
    const parsed = parseResumeText(text);

    const update: Record<string, unknown> = {
      rawImport: { filename: body.filename, text: parsed.rawText, importedAt: new Date().toISOString() },
    };
    const existing = profile as Record<string, any>;
    const existingContact = (existing.contactInfo ?? {}) as Record<string, unknown>;
    update.contactInfo = {
      ...existingContact,
      ...(parsed.contactInfo.email && !existingContact.email ? { email: parsed.contactInfo.email } : {}),
      ...(parsed.contactInfo.phone && !existingContact.phone ? { phone: parsed.contactInfo.phone } : {}),
      ...(parsed.contactInfo.linkedin && !existingContact.linkedin ? { linkedin: parsed.contactInfo.linkedin } : {}),
      ...(parsed.contactInfo.github && !existingContact.github ? { github: parsed.contactInfo.github } : {}),
    };
    if (parsed.summary && !existing.summary) update.summary = parsed.summary;
    if (parsed.skills.length > 0 && !(existing.skills as unknown[] | undefined)?.length) {
      update.skills = parsed.skills;
    }

    await this.resumeService.updateProfile(user.sub, id, update);

    return {
      imported: true,
      textLength: parsed.rawText.length,
      extracted: {
        name: parsed.name,
        contactInfo: parsed.contactInfo,
        summary: Boolean(parsed.summary),
        skills: parsed.skills.length,
      },
    };
  }

  /* ======================================================================== */
  /*  Profile Cloning                                                         */
  /* ======================================================================== */

  @Post('profiles/:profileId/clone')
  async cloneProfile(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
  ) {
    const profile = await this.resumeService.getProfile(user.sub, profileId) as Record<string, any>;
    const { id, createdAt, updatedAt, userId, ...data } = profile;
    const result = await this.resumeService.createProfile(user.sub, {
      name: `${data.name} (Copy)`,
      contactInfo: data.contactInfo ?? {},
      isDefault: false,
    });
    // Copy remaining profile data (summary, skills, experience, etc.)
    const { name: _n, contactInfo: _c, isDefault: _d, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      await this.resumeService.updateProfile(user.sub, result.id, rest);
    }
    return result;
  }

  @Get('profiles/:profileId/export/json')
  async exportJson(
    @CurrentUser() user: JwtPayload,
    @Param('profileId') profileId: string,
  ) {
    return this.resumeService.getProfile(user.sub, profileId);
  }

  /* ======================================================================== */
  /*  Helpers                                                                 */
  /* ======================================================================== */

  private validateSectionType(sectionType: string) {
    if (!(VALID_SECTION_TYPES as readonly string[]).includes(sectionType)) {
      throw new BadRequestException(`Invalid section type: ${sectionType}. Valid types: ${VALID_SECTION_TYPES.join(', ')}`);
    }
  }

  private toResumeData(profile: Record<string, any>): ResumeData {
    return {
      name: profile.name ?? '',
      contactInfo: {
        email: profile.contactInfo?.email,
        phone: profile.contactInfo?.phone,
        location: profile.contactInfo?.location,
        linkedin: profile.contactInfo?.linkedin,
      },
      summary: profile.summary,
      skills: profile.skills,
      experience: profile.experience,
      education: profile.education,
      projects: profile.projects,
      certifications: profile.certifications,
      languages: profile.languages,
      publications: profile.publications,
      volunteer: profile.volunteer,
      customSections: profile.customSections,
    };
  }
}
