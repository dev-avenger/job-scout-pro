import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { InboxModule } from '../inbox/inbox.module.js';
import { ApplicationModule } from '../application/application.module.js';
import { SettingsController } from './settings.controller.js';
import { OnboardingController } from './onboarding.controller.js';
import { SettingsService } from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';
import { SETTINGS_SERVICE, SETTINGS_REPOSITORY } from './settings.constants.js';

@Module({
  imports: [LlmModule, InboxModule, ApplicationModule],
  controllers: [SettingsController, OnboardingController],
  providers: [
    { provide: SETTINGS_REPOSITORY, useClass: SettingsRepository },
    { provide: SETTINGS_SERVICE, useClass: SettingsService },
  ],
  exports: [SETTINGS_SERVICE],
})
export class SettingsModule {}
