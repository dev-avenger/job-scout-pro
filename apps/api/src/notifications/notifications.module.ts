import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsRepository } from './notifications.repository.js';
import { NOTIFICATIONS_SERVICE, NOTIFICATIONS_REPOSITORY } from './notifications.constants.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    { provide: NOTIFICATIONS_REPOSITORY, useClass: NotificationsRepository },
    { provide: NOTIFICATIONS_SERVICE, useClass: NotificationsService },
  ],
  exports: [NOTIFICATIONS_SERVICE],
})
export class NotificationsModule {}
