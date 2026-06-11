import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LlmModule } from '../llm/llm.module.js';
import { ResearchModule } from '../research/research.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchRepository } from './search.repository.js';
import { DeduplicationEngine } from './deduplication-engine.js';
import { JobScorer } from './job-scorer.js';
import { JobValidator } from './job-validator.js';
import { ManualUrlSource } from './sources/manual-url.source.js';
import { RssFeedSource } from './sources/rss-feed.source.js';
import { IndeedApiSource } from './sources/indeed-api.source.js';
import { AdzunaApiSource } from './sources/adzuna-api.source.js';
import { GoogleJobsSource } from './sources/google-jobs.source.js';
import { CsvImportSource } from './sources/csv-import.source.js';
import { SEARCH_SERVICE, SEARCH_REPOSITORY, JOB_SOURCES } from './search.constants.js';

@Module({
  imports: [
    LlmModule,
    ResearchModule,
    BullModule.registerQueue({ name: 'job-search' }),
  ],
  controllers: [SearchController],
  providers: [
    { provide: SEARCH_REPOSITORY, useClass: SearchRepository },
    { provide: SEARCH_SERVICE, useClass: SearchService },
    {
      provide: JOB_SOURCES,
      useFactory: (
        manualUrl: ManualUrlSource,
        rssFeed: RssFeedSource,
        indeed: IndeedApiSource,
        adzuna: AdzunaApiSource,
        googleJobs: GoogleJobsSource,
        csvImport: CsvImportSource,
      ) => [manualUrl, rssFeed, indeed, adzuna, googleJobs, csvImport],
      inject: [ManualUrlSource, RssFeedSource, IndeedApiSource, AdzunaApiSource, GoogleJobsSource, CsvImportSource],
    },
    DeduplicationEngine,
    JobScorer,
    JobValidator,
    ManualUrlSource,
    RssFeedSource,
    IndeedApiSource,
    AdzunaApiSource,
    GoogleJobsSource,
    CsvImportSource,
  ],
  exports: [SEARCH_SERVICE, DeduplicationEngine, JobScorer, JobValidator],
})
export class SearchModule {}
