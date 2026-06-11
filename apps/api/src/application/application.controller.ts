import { Controller, Get, Post, Param, Query, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApplicationFilterSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { APPLICATION_SERVICE } from './application.constants.js';
import type { IApplicationService } from './interfaces/application-service.interface.js';

@Controller('api/v1/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(
    @Inject(APPLICATION_SERVICE) private readonly appService: IApplicationService,
    @InjectQueue('application') private readonly applicationQueue: Queue,
  ) {}

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
    return this.appService.getById(user.sub, id);
  }

  @Get(':id/events')
  async getEvents(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.appService.getEvents?.(user.sub, id) ?? [];
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: { jobId: string }) {
    const result = await this.appService.create?.(user.sub, body.jobId);
    if (result?.id) {
      await this.applicationQueue.add('apply', { userId: user.sub, applicationId: result.id, jobId: body.jobId });
    }
    return result ?? { status: 'queued' };
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
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.appService.withdraw?.(user.sub, id);
  }
}
