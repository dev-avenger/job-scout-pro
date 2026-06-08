import { Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service.js';
import { EVENT_BUS } from './event-bus.constants.js';

@Module({
  providers: [
    {
      provide: EVENT_BUS,
      useClass: EventBusService,
    },
  ],
  exports: [EVENT_BUS],
})
export class EventBusModule {}
