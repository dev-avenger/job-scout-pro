import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { NOTIFICATIONS_SERVICE } from './notifications.constants.js';
import type { INotificationsService } from './interfaces/notifications-service.interface.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(@Inject(NOTIFICATIONS_SERVICE) private readonly notificationsService: INotificationsService) {}

  @Get('notifications')
  async list(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.list(user.sub);
  }

  @Put('notifications/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
  }

  @Put('notifications/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllAsRead(user.sub);
  }

  @Get('alerts/rules')
  async listAlertRules(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.listAlertRules(user.sub);
  }

  @Post('alerts/rules')
  async createAlertRule(
    @CurrentUser() user: JwtPayload,
    @Body() body: { conditionType: string; threshold?: number; channel: string; webhookUrl?: string },
  ) {
    return this.notificationsService.createAlertRule(user.sub, body);
  }

  @Delete('alerts/rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAlertRule(@Param('id') id: string) {
    await this.notificationsService.deleteAlertRule(id);
  }
}
