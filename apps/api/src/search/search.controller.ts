import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Inject, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobFilterSchema, CreateJobFromUrlSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SEARCH_SERVICE, JOB_SOURCES } from './search.constants.js';
import type { ISearchService } from './interfaces/search-service.interface.js';
import type { IJobSource } from './interfaces/job-source.interface.js';

@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(
    @Inject(SEARCH_SERVICE) private readonly searchService: ISearchService,
    @Inject(JOB_SOURCES) private readonly jobSources: IJobSource[],
    @InjectQueue('job-search') private readonly jobSearchQueue: Queue,
  ) {}

  @Get()
  async listJobs(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(JobFilterSchema)) filters: any,
  ) {
    return this.searchService.listJobs(user.sub, filters);
  }

  // NOTE: must be declared before the ':id' route or it is captured as a job id.
  @Get('facets')
  async getFacets(@CurrentUser() user: JwtPayload) {
    return this.searchService.getFacets(user.sub);
  }

  // NOTE: must be declared before the ':id' route or 'sources' is captured as a job id.
  @Get('sources')
  async listSources() {
    return this.jobSources.map((source) => ({
      id: source.name,
      sourceType: source.channel,
      config: {},
      isActive: this.isSourceConfigured(source.name),
      lastRunAt: null,
      successCount: 0,
      failureCount: 0,
    }));
  }

  private isSourceConfigured(sourceName: string): boolean {
    switch (sourceName) {
      case 'adzuna_api':
        return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
      case 'jooble':
        return Boolean(process.env.JOOBLE_API_KEY);
      case 'remoteok':
      case 'arbeitnow':
        // Key-free scraping sources (public JSON endpoints) — always available
        return true;
      default:
        // manual_url, rss_feed, indeed_api and csv_import need no credentials
        return true;
    }
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
  async runSearch(
    @CurrentUser() user: JwtPayload,
    @Query('dryRun') dryRun?: string,
    @Body()
    body?: {
      targetRoles?: string[];
      targetLocations?: string[];
      salaryMin?: number;
      salaryMax?: number;
      remotePreference?: string;
    },
  ) {
    // Onboarding wizard preview: search synchronously, persist nothing
    if (dryRun === 'true') {
      return this.searchService.dryRunSearch(user.sub, {
        keywords: body?.targetRoles ?? [],
        locations: body?.targetLocations,
        salaryMin: body?.salaryMin,
        remoteOnly: body?.remotePreference === 'remote',
        postedWithinDays: 7,
      });
    }

    try {
      await this.jobSearchQueue.add('manual-search', { userId: user.sub, trigger: 'manual' });
    } catch (err) {
      // Surface the real reason instead of a generic 500 — almost always Redis.
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new ServiceUnavailableException(
        `Could not queue the search (${reason}). Is Redis running? Start it with: docker compose up -d`,
      );
    }
    return { message: 'Search queued', status: 'queued' };
  }
}
