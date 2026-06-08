import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import type { DomainEvent, EventType } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import type { IEventBus, EventHandler } from './interfaces/event-bus.interface.js';

const logger = createLogger({ name: 'event-bus' });

@Injectable()
export class EventBusService implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  on<T extends DomainEvent>(eventType: EventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);
  }

  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error({ event: event.type, error: result.reason }, 'Event handler failed');
      }
    }

    await this.publishToRedis(event);
  }

  private async publishToRedis(event: DomainEvent): Promise<void> {
    try {
      const channel = this.getChannel(event.type);
      await this.redis.publish(channel, JSON.stringify(event));
    } catch (err) {
      logger.error({ error: err, event: event.type }, 'Failed to publish event to Redis');
    }
  }

  private getChannel(eventType: string): string {
    const [domain] = eventType.split('.');
    switch (domain) {
      case 'job': return 'job:discovered';
      case 'application': return 'app:status';
      case 'email': return 'notification:new';
      case 'budget': return 'budget:alert';
      case 'captcha': return 'captcha:needed';
      default: return 'agent:activity';
    }
  }
}
