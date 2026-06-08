import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { SETTINGS_SERVICE, SETTINGS_REPOSITORY } from './settings.constants.js';

@Module({
  controllers: [SettingsController],
  providers: [
    { provide: SETTINGS_REPOSITORY, useClass: SettingsRepository },
    { provide: SETTINGS_SERVICE, useClass: SettingsService },
  ],
  exports: [SETTINGS_SERVICE],
})
export class SettingsModule {}
