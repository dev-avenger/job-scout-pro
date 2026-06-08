import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { JobFilterSchema, CreateJobFromUrlSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SEARCH_SERVICE } from './search.constants.js';
import type { ISearchService } from './interfaces/search-service.interface.js';

@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(@Inject(SEARCH_SERVICE) private readonly searchService: ISearchService) {}

  @Get()
  async listJobs(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(JobFilterSchema)) filters: any,
  ) {
    return this.searchService.listJobs(user.sub, filters);
  }

  @Get(':id')
  async getJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.searchService.getJob(user.sub, id);
  }

  @Post('url')
  async addJobByUrl(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateJobFromUrlSchema)) body: { url: string },
  ) {
    return this.searchService.addJobByUrl(user.sub, body.url);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.searchService.deleteJob(user.sub, id);
  }

  @Post('search/run')
  async runSearch(@CurrentUser() user: JwtPayload) {
    return { message: 'Search queued', status: 'queued' };
  }
}
