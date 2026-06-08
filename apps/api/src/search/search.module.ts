import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchRepository } from './search.repository.js';
import { DeduplicationEngine } from './deduplication-engine.js';
import { JobScorer } from './job-scorer.js';
import { JobValidator } from './job-validator.js';
import { ManualUrlSource } from './sources/manual-url.source.js';
import { RssFeedSource } from './sources/rss-feed.source.js';
import { SEARCH_SERVICE, SEARCH_REPOSITORY, JOB_SOURCES } from './search.constants.js';

@Module({
  imports: [LlmModule],
  controllers: [SearchController],
  providers: [
    { provide: SEARCH_REPOSITORY, useClass: SearchRepository },
    { provide: SEARCH_SERVICE, useClass: SearchService },
    {
      provide: JOB_SOURCES,
      useFactory: (manualUrl: ManualUrlSource, rssFeed: RssFeedSource) => [manualUrl, rssFeed],
      inject: [ManualUrlSource, RssFeedSource],
    },
    DeduplicationEngine,
    JobScorer,
    JobValidator,
    ManualUrlSource,
    RssFeedSource,
  ],
  exports: [SEARCH_SERVICE],
})
export class SearchModule {}
