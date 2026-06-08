import { Controller, Get, Post, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { INBOX_SERVICE } from './inbox.constants.js';
import type { IInboxService } from './interfaces/inbox-service.interface.js';

@Controller('api/v1/inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(@Inject(INBOX_SERVICE) private readonly inboxService: IInboxService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return this.inboxService.list(user.sub);
  }

  @Post('scan')
  async scan() {
    return { message: 'Inbox scan queued', status: 'queued' };
  }
}
