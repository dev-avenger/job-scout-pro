import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UpdateAutonomySchema, UpdateLLMSettingsSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ImapClient } from '../inbox/email/imap-client.js';
import { SmtpClient } from '../inbox/email/smtp-client.js';
import { BrowserApplyService } from '../application/browser-apply.service.js';
import { SETTINGS_SERVICE } from './settings.constants.js';
import type { ISettingsService } from './interfaces/settings-service.interface.js';

interface EmailTestBody {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress?: string;
}

@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    @Inject(SETTINGS_SERVICE) private readonly settingsService: ISettingsService,
    private readonly imapClient: ImapClient,
    private readonly smtpClient: SmtpClient,
    private readonly browserApplyService: BrowserApplyService,
  ) {}

  @Post('credentials/test-indeed')
  async testIndeed(
    @CurrentUser() user: JwtPayload,
    @Body() body: { username: string; password: string; headful?: boolean },
  ) {
    if (!body.username || !body.password) {
      throw new BadRequestException('Provide both your Indeed email and password.');
    }
    const result = await this.browserApplyService.verifyIndeedLogin(
      user.sub,
      { siteName: 'indeed', username: body.username, password: body.password },
      body.headful,
    );
    // Once the session is banked, future runs can go headless automatically.
    // If login didn't complete, keep the user's chosen (likely visible) setting
    // so the next attempt still shows the window.
    await this.settingsService.updateApiKeys?.(user.sub, {
      indeedHeadful: result.ok ? false : (body.headful ?? false),
    });
    if (!result.ok) {
      // 200 with status so the UI can distinguish CAPTCHA from bad password
      return { success: false, status: result.status, message: result.detail, headful: body.headful ?? false };
    }
    return {
      success: true,
      status: result.status,
      message: `${result.detail} Visible-browser mode turned off — your session is saved.`,
      headful: false,
    };
  }

  @Post('email/test-imap')
  async testImap(@Body() body: EmailTestBody) {
    const ok = await this.imapClient.testConnection({
      host: body.host,
      port: body.port,
      secure: body.secure,
      auth: { user: body.username, pass: body.password },
    });
    if (!ok) {
      throw new BadRequestException('IMAP connection failed — check host, port, and credentials');
    }
    return { success: true };
  }

  @Post('email/test-smtp')
  async testSmtp(@Body() body: EmailTestBody) {
    const ok = await this.smtpClient.testConnection({
      host: body.host,
      port: body.port,
      secure: body.secure,
      auth: { user: body.username, pass: body.password },
      fromAddress: body.fromAddress,
    });
    if (!ok) {
      throw new BadRequestException('SMTP connection failed — check host, port, and credentials');
    }
    return { success: true };
  }

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

  @Put('preferences')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    await this.settingsService.updatePreferences?.(user.sub, body);
  }

  @Put('email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateEmailConfig(
    @CurrentUser() user: JwtPayload,
    @Body() body: { imap?: Record<string, unknown>; smtp?: Record<string, unknown> },
  ) {
    await this.settingsService.updateEmailConfig?.(user.sub, body);
  }

  @Put('api-keys')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateApiKeys(
    @CurrentUser() user: JwtPayload,
    @Body() body: { openaiKey?: string; anthropicKey?: string },
  ) {
    await this.settingsService.updateApiKeys?.(user.sub, body);
  }
}
