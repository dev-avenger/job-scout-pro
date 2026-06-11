import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import type { IAgentControlService } from './interfaces/agent-control-service.interface.js';

@Injectable()
export class AgentControlService implements IAgentControlService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getStatus(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    const isPaused = await this.redis.get(pausedKey);
    return {
      status: isPaused ? 'paused' : 'active',
      pausedAt: isPaused || null,
    };
  }

  async pause(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    await this.redis.set(pausedKey, new Date().toISOString());
    return { status: 'paused' };
  }

  async resume(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    await this.redis.del(pausedKey);
    return { status: 'active' };
  }

  async kill(userId: string) {
    const pausedKey = `agent:paused:${userId}`;
    await this.redis.set(pausedKey, new Date().toISOString());
    return {
      status: 'killed',
      message: 'All agent activity halted. Active applications will be withdrawn where possible.',
    };
  }
}
