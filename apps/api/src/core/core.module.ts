import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { EventBusModule } from './event-bus/event-bus.module.js';
import { ConfigModule } from './config/config.module.js';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule, EventBusModule],
  exports: [ConfigModule, DatabaseModule, RedisModule, EventBusModule],
})
export class CoreModule {}
