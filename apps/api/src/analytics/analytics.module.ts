import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { ANALYTICS_SERVICE, ANALYTICS_REPOSITORY } from './analytics.constants.js';

@Module({
  controllers: [AnalyticsController],
  providers: [
    { provide: ANALYTICS_REPOSITORY, useClass: AnalyticsRepository },
    { provide: ANALYTICS_SERVICE, useClass: AnalyticsService },
  ],
  exports: [ANALYTICS_SERVICE],
})
export class AnalyticsModule {}
