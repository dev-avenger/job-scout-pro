import { Injectable, Inject } from '@nestjs/common';
import { SETTINGS_REPOSITORY } from './settings.constants.js';
import type { ISettingsRepository } from './interfaces/settings-repository.interface.js';
import type { ISettingsService, OnboardingPayload } from './interfaces/settings-service.interface.js';
import { ModelRouter } from '../llm/model-router.js';
import { OpenAIProvider } from '../llm/providers/openai.provider.js';
import { AnthropicProvider } from '../llm/providers/anthropic.provider.js';
import { GeminiProvider } from '../llm/providers/gemini.provider.js';
import { OllamaProvider } from '../llm/providers/ollama.provider.js';

@Injectable()
export class SettingsService implements ISettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private readonly repo: ISettingsRepository,
    private readonly modelRouter: ModelRouter,
  ) {}

  async getSettings(userId: string) {
    const [user, prefs] = await Promise.all([
      this.repo.getUser(userId),
      this.repo.getPreferences(userId),
    ]);

    // Flatten the ui_settings bag so the web app reads saved values
    // (llmProvider, llmApiKey, jobSources, notifications, ...) as flat keys.
    const { uiSettings, ...columns } = (prefs ?? {}) as Record<string, unknown> & {
      uiSettings?: Record<string, unknown> | null;
    };

    return {
      autonomyMode: user?.autonomyMode,
      onboardingCompleted: user?.onboardingCompleted,
      account: {
        email: user?.email,
        createdAt: user?.createdAt,
        guidedAppCount: user?.guidedAppCount ?? 0,
        supervisedAppCount: user?.supervisedAppCount ?? 0,
      },
      preferences: { ...columns, ...(uiSettings ?? {}) },
    };
  }

  async updateAutonomyMode(userId: string, mode: string) {
    await this.repo.updateAutonomyMode(userId, mode);
  }

  async updateLlmSettings(userId: string, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (data.dailyCapCents !== undefined) updateData.dailyLlmCapCents = data.dailyCapCents;
    if (data.monthlyCapCents !== undefined) updateData.monthlyLlmCapCents = data.monthlyCapCents;

    if (Object.keys(updateData).length > 0) {
      await this.repo.updatePreferences(userId, updateData);
    }

    const llmPatch: Record<string, unknown> = {};
    if (data.provider !== undefined) llmPatch.llmProvider = data.provider;
    if (data.model !== undefined) llmPatch.llmModel = data.model;
    if (data.apiKey !== undefined) llmPatch.llmApiKey = data.apiKey;
    if (data.ollamaUrl !== undefined) llmPatch.ollamaUrl = data.ollamaUrl;
    if (data.temperature !== undefined) llmPatch.temperature = data.temperature;

    if (Object.keys(llmPatch).length > 0) {
      await this.repo.mergeUiSettings(userId, llmPatch);
      this.applyLlmProvider({
        provider: data.provider as string | undefined,
        apiKey: data.apiKey as string | undefined,
        model: data.model as string | undefined,
        ollamaUrl: data.ollamaUrl as string | undefined,
      });
    }
  }

  /** Register/refresh the chosen provider in the live model router. */
  private applyLlmProvider(cfg: {
    provider?: string;
    apiKey?: string;
    model?: string;
    ollamaUrl?: string;
  }) {
    if (!cfg.provider) return;

    switch (cfg.provider) {
      case 'openai':
        if (cfg.apiKey) this.modelRouter.registerProvider(new OpenAIProvider(cfg.apiKey));
        break;
      case 'anthropic':
        if (cfg.apiKey) this.modelRouter.registerProvider(new AnthropicProvider(cfg.apiKey));
        break;
      case 'gemini':
        if (cfg.apiKey) this.modelRouter.registerProvider(new GeminiProvider(cfg.apiKey, cfg.model));
        break;
      case 'ollama':
        this.modelRouter.registerProvider(new OllamaProvider(cfg.ollamaUrl));
        break;
      default:
        return;
    }
    this.modelRouter.preferProvider(cfg.provider);
  }

  async updateBlacklists(userId: string, data: { companyBlacklist?: string[]; keywordBlacklist?: string[] }) {
    const updateData: Record<string, unknown> = {};
    if (data.companyBlacklist) updateData.companyBlacklist = data.companyBlacklist;
    if (data.keywordBlacklist) updateData.keywordBlacklist = data.keywordBlacklist;

    await this.repo.updatePreferences(userId, updateData);
  }

  async updatePreferences(userId: string, data: Record<string, unknown>) {
    // Allowlist of real user_preferences columns; unknown keys (e.g. UI-only
    // toggles the web app sends) are ignored instead of breaking the UPDATE.
    const allowedKeys = [
      'targetRoles',
      'salaryMin',
      'salaryMax',
      'locations',
      'remotePreference',
      'companyBlacklist',
      'keywordBlacklist',
      'dailyAppCap',
      'dailyLlmCapCents',
      'monthlyLlmCapCents',
      'stealthMode',
      'activityHours',
      'notificationChannels',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    if (Object.keys(updateData).length > 0) {
      await this.repo.updatePreferences(userId, updateData);
    }

    // UI-level settings without dedicated columns go into the ui_settings bag
    const uiKeys = [
      'jobSources',
      'rssFeedUrls',
      'refreshIntervalHours',
      'notifications',
      'companyWatchlist',
    ] as const;
    const uiPatch: Record<string, unknown> = {};
    for (const key of uiKeys) {
      if (data[key] !== undefined) uiPatch[key] = data[key];
    }
    if (Object.keys(uiPatch).length > 0) {
      await this.repo.mergeUiSettings(userId, uiPatch);
    }
  }

  async updateEmailConfig(userId: string, data: Record<string, unknown>) {
    const imap = data.imap as
      | { host?: string; port?: number; secure?: boolean; username?: string; password?: string }
      | undefined;
    const smtp = data.smtp as
      | {
          host?: string;
          port?: number;
          secure?: boolean;
          username?: string;
          password?: string;
          fromAddress?: string;
        }
      | undefined;

    // Store the raw form values so the Settings page can repopulate
    const uiPatch: Record<string, unknown> = {};
    if (imap) uiPatch.emailImap = imap;
    if (smtp) uiPatch.emailSmtp = smtp;
    if (Object.keys(uiPatch).length > 0) {
      await this.repo.mergeUiSettings(userId, uiPatch);
    }

    // The inbox-scan processor reads connection configs from the
    // notificationChannels JSONB column — keep it in sync.
    const prefs = await this.repo.getPreferences(userId);
    const channels = ((prefs?.notificationChannels as Record<string, unknown>) ?? {});
    if (imap?.host && imap.username) {
      channels.emailImapConfig = {
        host: imap.host,
        port: imap.port ?? 993,
        secure: imap.secure ?? true,
        auth: { user: imap.username, pass: imap.password ?? '' },
      };
    }
    if (smtp?.host && smtp.username) {
      channels.emailSmtpConfig = {
        host: smtp.host,
        port: smtp.port ?? 587,
        secure: smtp.secure ?? true,
        auth: { user: smtp.username, pass: smtp.password ?? '' },
        fromAddress: smtp.fromAddress,
      };
    }
    await this.repo.updatePreferences(userId, { notificationChannels: channels });
  }

  /**
   * Persist Slack/Telegram messaging-channel config into the notificationChannels
   * JSONB bag. All values are user-supplied at runtime (a Slack incoming-webhook
   * URL, a Telegram bot token + chat id) — no build-time credentials.
   */
  async updateNotificationChannels(
    userId: string,
    data: { slackWebhookUrl?: string; telegram?: { botToken?: string; chatId?: string } },
  ) {
    const prefs = await this.repo.getPreferences(userId);
    const channels = ((prefs?.notificationChannels as Record<string, unknown>) ?? {});

    if (data.slackWebhookUrl !== undefined) {
      channels.slackWebhookUrl = data.slackWebhookUrl || undefined;
    }
    if (data.telegram !== undefined) {
      channels.telegram =
        data.telegram.botToken || data.telegram.chatId
          ? { botToken: data.telegram.botToken, chatId: data.telegram.chatId }
          : undefined;
    }

    await this.repo.updatePreferences(userId, { notificationChannels: channels });
  }

  async updateApiKeys(userId: string, data: Record<string, unknown>) {
    const patch: Record<string, unknown> = {};
    if (data.portalCredentials !== undefined) patch.portalCredentials = data.portalCredentials;
    if (data.indeedHeadful !== undefined) patch.indeedHeadful = data.indeedHeadful;
    if (Object.keys(patch).length > 0) {
      await this.repo.mergeUiSettings(userId, patch);
    }
  }

  async completeOnboarding(userId: string, payload: OnboardingPayload) {
    const prefs = payload.preferences;
    if (prefs) {
      await this.updatePreferences(userId, {
        targetRoles: prefs.targetRoles,
        // The wizard names these differently from the user_preferences columns
        locations: prefs.targetLocations,
        salaryMin: prefs.salaryMin,
        salaryMax: prefs.salaryMax,
        remotePreference: prefs.remotePreference,
        dailyAppCap: prefs.dailyApplicationCap,
      });
    }

    if (payload.autonomyMode) {
      await this.repo.updateAutonomyMode(userId, payload.autonomyMode);
    }

    // Build an editable default profile from the onboarding details. Upsert:
    // update the existing default profile if there is one, otherwise create it.
    const p = payload.profile;
    if (p) {
      const profileData: Record<string, unknown> = {
        name: (p.name?.trim() || 'My Profile').slice(0, 100),
        contactInfo: {
          name: p.name?.trim() ?? '',
          email: p.email?.trim() ?? '',
          phone: p.phone?.trim() ?? '',
          location: p.location?.trim() ?? '',
          linkedin: p.linkedin?.trim() ?? '',
        },
        summary: p.summary?.trim() || null,
        skills: p.skills ?? [],
      };
      const updated = await this.repo.updateDefaultProfile(userId, profileData);
      if (!updated) {
        await this.repo.createProfile(userId, { ...profileData, isDefault: true });
      }
    }

    await this.repo.markOnboardingCompleted(userId);
    // The wizard is done — drop any saved draft
    await this.repo.mergeUiSettings(userId, { onboardingDraft: null });
  }

  async saveOnboardingProgress(userId: string, draft: Record<string, unknown>) {
    await this.repo.mergeUiSettings(userId, { onboardingDraft: draft });
  }
}
