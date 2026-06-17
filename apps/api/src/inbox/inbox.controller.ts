import { Controller, Get, Post, UseGuards, Inject, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { INBOX_SERVICE } from './inbox.constants.js';
import type { IInboxService } from './interfaces/inbox-service.interface.js';

@Controller('api/v1/inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(
    @Inject(INBOX_SERVICE) private readonly inboxService: IInboxService,
    @InjectQueue('inbox-scan') private readonly inboxScanQueue: Queue,
  ) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.inboxService.list(user.sub);
  }

  @Post('scan')
  async scan(@CurrentUser() user: JwtPayload) {
    try {
      await this.inboxScanQueue.add('manual-scan', { userId: user.sub, trigger: 'manual' });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      throw new ServiceUnavailableException(`Could not queue the inbox scan (${reason}).`);
    }
    return { message: 'Inbox scan queued', status: 'queued' };
  }
}
