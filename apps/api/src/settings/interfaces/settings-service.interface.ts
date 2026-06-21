export interface ISettingsService {
  getSettings(userId: string): Promise<unknown>;
  updateAutonomyMode(userId: string, mode: string): Promise<void>;
  updateLlmSettings(userId: string, data: Record<string, unknown>): Promise<void>;
  updateBlacklists(userId: string, data: { companyBlacklist?: string[]; keywordBlacklist?: string[] }): Promise<void>;
  updatePreferences?(userId: string, data: Record<string, unknown>): Promise<void>;
  updateEmailConfig?(userId: string, data: Record<string, unknown>): Promise<void>;
  updateNotificationChannels?(
    userId: string,
    data: { slackWebhookUrl?: string; telegram?: { botToken?: string; chatId?: string } },
  ): Promise<void>;
  updateApiKeys?(userId: string, data: Record<string, unknown>): Promise<void>;
  completeOnboarding(userId: string, payload: OnboardingPayload): Promise<void>;
  saveOnboardingProgress(userId: string, draft: Record<string, unknown>): Promise<void>;
}

export interface OnboardingPayload {
  preferences?: {
    targetRoles?: string[];
    targetLocations?: string[];
    salaryMin?: number;
    salaryMax?: number;
    remotePreference?: string;
    dailyApplicationCap?: number;
  };
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    summary?: string;
    skills?: string[];
  };
  autonomyMode?: string;
}
