import { Injectable, Inject } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { NOTIFICATIONS_REPOSITORY } from './notifications.constants.js';
import type { INotificationsRepository } from './interfaces/notifications-repository.interface.js';
import type { INotificationsService } from './interfaces/notifications-service.interface.js';

@Injectable()
export class NotificationsService implements INotificationsService {
  constructor(@Inject(NOTIFICATIONS_REPOSITORY) private readonly repo: INotificationsRepository) {}

  async list(userId: string) {
    return this.repo.list(userId);
  }

  async markAsRead(notificationId: string) {
    await this.repo.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string) {
    await this.repo.markAllAsRead(userId);
  }

  async listAlertRules(userId: string) {
    return this.repo.listAlertRules(userId);
  }

  async createAlertRule(userId: string, data: { conditionType: string; threshold?: number; channel: string; webhookUrl?: string }) {
    const id = generateId();
    await this.repo.createAlertRule({ id, userId, ...data });
    return { id };
  }

  async deleteAlertRule(ruleId: string) {
    await this.repo.deleteAlertRule(ruleId);
  }
}
