import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service.js';
import { RateLimiter } from './rate-limiter.js';
import { SCHEDULING_SERVICE, RATE_LIMITER } from './scheduling.constants.js';

@Module({
  providers: [
    { provide: SCHEDULING_SERVICE, useClass: SchedulingService },
    { provide: RATE_LIMITER, useClass: RateLimiter },
    RateLimiter,
  ],
  exports: [SCHEDULING_SERVICE, RATE_LIMITER, RateLimiter],
})
export class SchedulingModule {}
