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
import { RemoteOkSource } from './sources/remoteok.source.js';
import { ArbeitnowSource } from './sources/arbeitnow.source.js';
import { RemotiveSource } from './sources/remotive.source.js';
import { JobicySource } from './sources/jobicy.source.js';
import { HimalayasSource } from './sources/himalayas.source.js';
import { TheMuseSource } from './sources/themuse.source.js';
import { BaytSource } from './sources/bayt.source.js';
import { JoobleSource } from './sources/jooble.source.js';
import { BrightSpyreSource } from './sources/brightspyre.source.js';
import { PakPositionsSource } from './sources/pakpositions.source.js';
import { CompanyWatchlistSource } from './sources/company-watchlist.source.js';
import { RssFeedSource } from './sources/rss-feed.source.js';
import { IndeedApiSource } from './sources/indeed-api.source.js';
import { LinkedInSource } from './sources/linkedin.source.js';
import { AdzunaApiSource } from './sources/adzuna-api.source.js';
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
      // Key-free scraping sources first (remoteok, arbeitnow, rss) so discovery
      // prefers them; keyed/optional sources afterwards.
      useFactory: (
        manualUrl: ManualUrlSource,
        remoteOk: RemoteOkSource,
        arbeitnow: ArbeitnowSource,
        remotive: RemotiveSource,
        jobicy: JobicySource,
        himalayas: HimalayasSource,
        theMuse: TheMuseSource,
        bayt: BaytSource,
        jooble: JoobleSource,
        brightspyre: BrightSpyreSource,
        pakpositions: PakPositionsSource,
        companyWatchlist: CompanyWatchlistSource,
        rssFeed: RssFeedSource,
        indeed: IndeedApiSource,
        linkedin: LinkedInSource,
        adzuna: AdzunaApiSource,
        csvImport: CsvImportSource,
      ) => [
        manualUrl,
        remoteOk,
        arbeitnow,
        remotive,
        jobicy,
        himalayas,
        theMuse,
        bayt,
        jooble,
        brightspyre,
        pakpositions,
        companyWatchlist,
        rssFeed,
        indeed,
        linkedin,
        adzuna,
        csvImport,
      ],
      inject: [
        ManualUrlSource,
        RemoteOkSource,
        ArbeitnowSource,
        RemotiveSource,
        JobicySource,
        HimalayasSource,
        TheMuseSource,
        BaytSource,
        JoobleSource,
        BrightSpyreSource,
        PakPositionsSource,
        CompanyWatchlistSource,
        RssFeedSource,
        IndeedApiSource,
        LinkedInSource,
        AdzunaApiSource,
        CsvImportSource,
      ],
    },
    DeduplicationEngine,
    JobScorer,
    JobValidator,
    ManualUrlSource,
    RemoteOkSource,
    ArbeitnowSource,
    RemotiveSource,
    JobicySource,
    HimalayasSource,
    TheMuseSource,
    BaytSource,
    JoobleSource,
    BrightSpyreSource,
    PakPositionsSource,
    CompanyWatchlistSource,
    RssFeedSource,
    IndeedApiSource,
    LinkedInSource,
    AdzunaApiSource,
    CsvImportSource,
  ],
  exports: [SEARCH_SERVICE, DeduplicationEngine, JobScorer, JobValidator],
})
export class SearchModule {}
