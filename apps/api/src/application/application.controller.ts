import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Inject, HttpCode, HttpStatus, BadRequestException, NotFoundException, Res } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { FastifyReply } from 'fastify';
import { ApplicationFilterSchema, type ApplicationStatus } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { APPLICATION_SERVICE } from './application.constants.js';
import type { IApplicationService } from './interfaces/application-service.interface.js';
import { PortalMappingCache } from './portal-mapping-cache.js';
import { PdfGenerator, type ResumeData } from '../resume/export/pdf-generator.js';

@Controller('api/v1/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(
    @Inject(APPLICATION_SERVICE) private readonly appService: IApplicationService,
    @InjectQueue('application') private readonly applicationQueue: Queue,
    private readonly portalMappingCache: PortalMappingCache,
    private readonly pdfGenerator: PdfGenerator,
  ) {}

  /** Prepared answers for the apply page the browser extension is on. */
  @Get('autofill')
  async autofill(@CurrentUser() user: JwtPayload, @Query('url') url: string) {
    if (!url) throw new BadRequestException('url query param required');
    return this.appService.getAutofill(user.sub, url);
  }

  /** Job-tailored resume PDF for this application (download). */
  @Get(':id/resume.pdf')
  async resumePdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ) {
    const result = await this.appService.getResumeData(user.sub, id);
    if (!result) throw new NotFoundException('No profile to build a resume from');
    const buffer = await this.pdfGenerator.generate(result.data as ResumeData);
    res.headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // Called by the browser extension (CAPTURE_FORM message) to persist observed
  // portal form structures. Previously the extension POSTed here and got a 404.
  @Post('form-capture')
  async captureForm(
    @Body() body: { url?: string; fields?: unknown[]; formAction?: string },
  ) {
    if (!body.url) throw new BadRequestException('url is required');
    let parsed: URL;
    try {
      parsed = new URL(body.url);
    } catch {
      throw new BadRequestException('url must be a valid absolute URL');
    }
    await this.portalMappingCache.set(parsed.hostname, parsed.pathname, {
      fields: body.fields ?? [],
      formAction: body.formAction ?? null,
      capturedAt: new Date().toISOString(),
    });
    return { saved: true, domain: parsed.hostname, pagePath: parsed.pathname };
  }

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ApplicationFilterSchema)) filters: any,
  ) {
    return this.appService.list(user.sub, filters);
  }

  @Get('kanban')
  async getKanban(@CurrentUser() user: JwtPayload) {
    return this.appService.getKanban?.(user.sub) ?? { columns: [] };
  }

  @Get('review-queue')
  async getReviewQueue(@CurrentUser() user: JwtPayload) {
    return this.appService.getReviewQueue(user.sub);
  }

  @Get('dead-letter')
  async getDeadLetter(@CurrentUser() user: JwtPayload) {
    return this.appService.getDeadLetter(user.sub);
  }

  @Get(':id')
  async getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.appService.getDetail(user.sub, id);
  }

  @Get(':id/events')
  async getEvents(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.appService.getEvents?.(user.sub, id) ?? [];
  }

  @Put(':id/form-answers')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateFormAnswers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { answers: unknown },
  ) {
    await this.appService.updateFormAnswers(user.sub, id, body.answers);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: { jobId: string }) {
    // ApplicationService.queue creates the DB record (idempotent per user+job);
    // the BullMQ 'application' job is enqueued here so the ApplicationProcessor picks it up.
    const result = await this.appService.queue(user.sub, body.jobId, 'supervised');
    if (result.id && !result.alreadyExists) {
      await this.applicationQueue.add('apply', { userId: user.sub, applicationId: result.id, jobId: body.jobId });
    }
    return result;
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status: ApplicationStatus },
  ) {
    await this.appService.updateStatus(user.sub, id, body.status);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.appService.approve(user.sub, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.appService.reject(user.sub, id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.NO_CONTENT)
  async retry(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.appService.retry(user.sub, id);
    // Re-enqueue so the ApplicationProcessor actually reprocesses the failed application
    await this.applicationQueue.add('apply', { userId: user.sub, applicationId: id });
  }

  /**
   * Browser-assisted submit: opens the real ATS apply form in a Chrome window,
   * fills it from the prepared answers, attaches the generated resume PDF, then
   * submits (or hands off for an anti-bot challenge like Workable's Turnstile).
   */
  @Post(':id/submit-assisted')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitAssisted(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.applicationQueue.add('submit-assisted', { userId: user.sub, applicationId: id });
    return { status: 'queued' };
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.appService.withdraw?.(user.sub, id);
  }
}
