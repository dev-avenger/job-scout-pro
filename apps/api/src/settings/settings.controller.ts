import { Controller, Get, Put, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { UpdateAutonomySchema, UpdateLLMSettingsSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { SETTINGS_SERVICE } from './settings.constants.js';
import type { ISettingsService } from './interfaces/settings-service.interface.js';

@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(@Inject(SETTINGS_SERVICE) private readonly settingsService: ISettingsService) {}

  @Get()
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getSettings(user.sub);
  }

  @Put('autonomy')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateAutonomy(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateAutonomySchema)) body: { mode: string },
  ) {
    await this.settingsService.updateAutonomyMode(user.sub, body.mode);
  }

  @Put('llm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLlmSettings(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateLLMSettingsSchema)) body: any,
  ) {
    await this.settingsService.updateLlmSettings(user.sub, body);
  }

  @Put('blacklists')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlacklists(
    @CurrentUser() user: JwtPayload,
    @Body() body: { companyBlacklist?: string[]; keywordBlacklist?: string[] },
  ) {
    await this.settingsService.updateBlacklists(user.sub, body);
  }
}
