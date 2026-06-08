import { Controller, Get, Post, Param, Query, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { ApplicationFilterSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { APPLICATION_SERVICE } from './application.constants.js';
import type { IApplicationService } from './interfaces/application-service.interface.js';

@Controller('api/v1/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(@Inject(APPLICATION_SERVICE) private readonly appService: IApplicationService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ApplicationFilterSchema)) filters: any,
  ) {
    return this.appService.list(user.sub, filters);
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
}
