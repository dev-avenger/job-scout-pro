import { Controller, Post, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { SETTINGS_SERVICE } from './settings.constants.js';
import type { ISettingsService, OnboardingPayload } from './interfaces/settings-service.interface.js';

@Controller('api/v1/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(@Inject(SETTINGS_SERVICE) private readonly settingsService: ISettingsService) {}

  @Post('complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async complete(@CurrentUser() user: JwtPayload, @Body() body: OnboardingPayload) {
    await this.settingsService.completeOnboarding(user.sub, body);
  }

  /** Persist the wizard's in-progress state so users can save on any step. */
  @Post('progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveProgress(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    await this.settingsService.saveOnboardingProgress(user.sub, body);
  }
}
