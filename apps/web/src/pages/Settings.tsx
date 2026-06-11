import { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/select';
import { apiClient } from '../api/client';
import {
  Shield,
  Eye,
  Zap,
  Bot,
  DollarSign,
  Ban,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Save,
  Mail,
  Server,
  Bell,
  Key,
  Settings2,
  Radio,
  Plus,
  X,
  Wifi,
  WifiOff,
  Clock,
  Globe,
  Rss,
} from 'lucide-react';

/* ──────────────────── Types ──────────────────── */

type AutonomyMode = 'supervised' | 'guided' | 'autonomous';
type LlmProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

interface SettingsResponse {
  autonomyMode: AutonomyMode;
  onboardingCompleted: boolean;
  preferences: {
    dailyLlmCapCents?: number;
    monthlyLlmCapCents?: number;
    companyBlacklist?: string[] | null;
    keywordBlacklist?: string[] | null;
    jobSources?: {
      linkedin?: boolean;
      indeed?: boolean;
      glassdoor?: boolean;
      googleJobs?: boolean;
      rss?: boolean;
      csv?: boolean;
    };
    rssFeedUrls?: string[];
    refreshIntervalHours?: number;
    notifications?: {
      email?: boolean;
      inApp?: boolean;
      browserPush?: boolean;
      channels?: {
        applicationUpdates?: boolean;
        interviewInvites?: boolean;
        offerReceived?: boolean;
        agentErrors?: boolean;
      };
      quietHoursFrom?: string;
      quietHoursTo?: string;
    };
    llmProvider?: LlmProvider;
    llmModel?: string;
    llmApiKey?: string;
    ollamaUrl?: string;
    temperature?: number;
  };
}

interface PortalCredential {
  id: string;
  siteName: string;
  username: string;
  password: string;
}

interface ImapConfig {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
}

interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

/* ──────────────────── Constants ──────────────────── */

const AUTONOMY_OPTIONS: {
  value: AutonomyMode;
  label: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    value: 'supervised',
    label: 'Supervised',
    description: 'Human reviews everything before any action is taken.',
    icon: Eye,
  },
  {
    value: 'guided',
    label: 'Guided',
    description: 'AI handles basic tasks automatically; human reviews complex decisions.',
    icon: Zap,
  },
  {
    value: 'autonomous',
    label: 'Autonomous',
    description: 'AI handles everything end-to-end without human intervention.',
    icon: Bot,
  },
];

const LLM_PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: 'Custom' },
];

const MODELS_BY_PROVIDER: Record<LlmProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414', 'claude-3-5-sonnet-20241022'],
  ollama: ['llama3', 'llama3:70b', 'mistral', 'mixtral', 'codellama', 'phi3'],
  custom: ['custom'],
};

const JOB_SOURCES = [
  { key: 'linkedin' as const, label: 'LinkedIn', icon: Globe },
  { key: 'indeed' as const, label: 'Indeed', icon: Globe },
  { key: 'glassdoor' as const, label: 'Glassdoor', icon: Globe },
  { key: 'googleJobs' as const, label: 'Google Jobs', icon: Globe },
  { key: 'rss' as const, label: 'RSS Feeds', icon: Rss },
  { key: 'csv' as const, label: 'CSV Import', icon: Server },
];

const TAB_ITEMS = [
  { value: 'autonomy', label: 'Autonomy', icon: Shield },
  { value: 'llm', label: 'LLM Provider', icon: Bot },
  { value: 'sources', label: 'Job Sources', icon: Globe },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'blacklists', label: 'Blacklists', icon: Ban },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'credentials', label: 'Credentials', icon: Key },
  { value: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

let toastIdCounter = 0;
let portalIdCounter = 0;

/* ──────────────────── Component ──────────────────── */

export function Settings() {
  /* ── Loading / Toast state ── */
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ── Autonomy state ── */
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>('supervised');
  const [savingAutonomy, setSavingAutonomy] = useState(false);

  /* ── LLM Provider state ── */
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('openai');
  const [llmModel, setLlmModel] = useState('gpt-4o');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [temperature, setTemperature] = useState(0.7);
  const [dailyCap, setDailyCap] = useState('');
  const [monthlyCap, setMonthlyCap] = useState('');
  const [savingLlm, setSavingLlm] = useState(false);

  /* ── Job Sources state ── */
  const [jobSources, setJobSources] = useState<Record<string, boolean>>({
    linkedin: true,
    indeed: true,
    glassdoor: false,
    googleJobs: false,
    rss: false,
    csv: false,
  });
  const [rssFeedUrls, setRssFeedUrls] = useState<string[]>([]);
  const [newRssUrl, setNewRssUrl] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('24');
  const [savingSources, setSavingSources] = useState(false);

  /* ── Notifications state ── */
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [browserPush, setBrowserPush] = useState(false);
  const [notifChannels, setNotifChannels] = useState({
    applicationUpdates: true,
    interviewInvites: true,
    offerReceived: true,
    agentErrors: true,
  });
  const [quietHoursFrom, setQuietHoursFrom] = useState('22:00');
  const [quietHoursTo, setQuietHoursTo] = useState('08:00');
  const [savingNotifications, setSavingNotifications] = useState(false);

  /* ── Blacklists state ── */
  const [companyBlacklist, setCompanyBlacklist] = useState('');
  const [keywordBlacklist, setKeywordBlacklist] = useState('');
  const [savingBlacklists, setSavingBlacklists] = useState(false);

  /* ── Email state ── */
  const [imapConfig, setImapConfig] = useState<ImapConfig>({
    host: '',
    port: '993',
    secure: true,
    username: '',
    password: '',
  });
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: '587',
    secure: true,
    username: '',
    password: '',
    fromAddress: '',
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  /* ── Credentials state ── */
  const [portalCredentials, setPortalCredentials] = useState<PortalCredential[]>([]);
  const [savingCredentials, setSavingCredentials] = useState(false);

  /* ── Danger Zone state ── */
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resettingSettings, setResettingSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /* ──────────────────── Toast Helpers ──────────────────── */

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ──────────────────── Load Settings ──────────────────── */

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiClient.get<SettingsResponse>('/settings');
        setAutonomyMode(data.autonomyMode);

        const prefs = data.preferences ?? {};

        if (prefs.dailyLlmCapCents != null) {
          setDailyCap((prefs.dailyLlmCapCents / 100).toString());
        }
        if (prefs.monthlyLlmCapCents != null) {
          setMonthlyCap((prefs.monthlyLlmCapCents / 100).toString());
        }
        if (prefs.companyBlacklist?.length) {
          setCompanyBlacklist(prefs.companyBlacklist.join('\n'));
        }
        if (prefs.keywordBlacklist?.length) {
          setKeywordBlacklist(prefs.keywordBlacklist.join('\n'));
        }
        if (prefs.llmProvider) setLlmProvider(prefs.llmProvider);
        if (prefs.llmModel) setLlmModel(prefs.llmModel);
        if (prefs.llmApiKey) setLlmApiKey(prefs.llmApiKey);
        if (prefs.ollamaUrl) setOllamaUrl(prefs.ollamaUrl);
        if (prefs.temperature != null) setTemperature(prefs.temperature);
        if (prefs.jobSources) {
          setJobSources((prev) => ({ ...prev, ...prefs.jobSources }));
        }
        if (prefs.rssFeedUrls) setRssFeedUrls(prefs.rssFeedUrls);
        if (prefs.refreshIntervalHours != null) {
          setRefreshInterval(prefs.refreshIntervalHours.toString());
        }
        if (prefs.notifications) {
          const n = prefs.notifications;
          if (n.email != null) setEmailNotifications(n.email);
          if (n.inApp != null) setInAppNotifications(n.inApp);
          if (n.browserPush != null) setBrowserPush(n.browserPush);
          if (n.channels) setNotifChannels((prev) => ({ ...prev, ...n.channels }));
          if (n.quietHoursFrom) setQuietHoursFrom(n.quietHoursFrom);
          if (n.quietHoursTo) setQuietHoursTo(n.quietHoursTo);
        }
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [addToast]);

  /* ──────────────────── Save Handlers ──────────────────── */

  async function handleSaveAutonomy() {
    setSavingAutonomy(true);
    try {
      await apiClient.put('/settings/autonomy', { mode: autonomyMode });
      addToast('success', 'Autonomy mode updated successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save autonomy mode');
    } finally {
      setSavingAutonomy(false);
    }
  }

  async function handleSaveLlm() {
    const dailyVal = parseFloat(dailyCap);
    const monthlyVal = parseFloat(monthlyCap);

    if (dailyCap && (isNaN(dailyVal) || dailyVal < 0)) {
      addToast('error', 'Daily cap must be a valid positive number.');
      return;
    }
    if (monthlyCap && (isNaN(monthlyVal) || monthlyVal < 0)) {
      addToast('error', 'Monthly cap must be a valid positive number.');
      return;
    }

    setSavingLlm(true);
    try {
      await apiClient.put('/settings/llm', {
        provider: llmProvider,
        model: llmModel,
        apiKey: llmApiKey || undefined,
        ollamaUrl: llmProvider === 'ollama' ? ollamaUrl : undefined,
        temperature,
        dailyCapCents: dailyCap ? Math.round(dailyVal * 100) : 0,
        monthlyCapCents: monthlyCap ? Math.round(monthlyVal * 100) : 0,
      });
      addToast('success', 'LLM settings updated successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save LLM settings');
    } finally {
      setSavingLlm(false);
    }
  }

  async function handleSaveSources() {
    setSavingSources(true);
    try {
      await apiClient.put('/settings/preferences', {
        jobSources,
        rssFeedUrls,
        refreshIntervalHours: parseInt(refreshInterval, 10) || 24,
      });
      addToast('success', 'Job sources updated successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save job sources');
    } finally {
      setSavingSources(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    try {
      await apiClient.put('/settings/preferences', {
        notifications: {
          email: emailNotifications,
          inApp: inAppNotifications,
          browserPush,
          channels: notifChannels,
          quietHoursFrom,
          quietHoursTo,
        },
      });
      addToast('success', 'Notification settings updated successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save notifications');
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleSaveBlacklists() {
    setSavingBlacklists(true);
    try {
      const companies = companyBlacklist
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const keywords = keywordBlacklist
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiClient.put('/settings/blacklists', {
        companyBlacklist: companies,
        keywordBlacklist: keywords,
      });
      addToast('success', 'Blacklists updated successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save blacklists');
    } finally {
      setSavingBlacklists(false);
    }
  }

  async function handleSaveEmail() {
    setSavingEmail(true);
    try {
      await apiClient.put('/settings/email', {
        imap: {
          host: imapConfig.host,
          port: parseInt(imapConfig.port, 10),
          secure: imapConfig.secure,
          username: imapConfig.username,
          password: imapConfig.password,
        },
        smtp: {
          host: smtpConfig.host,
          port: parseInt(smtpConfig.port, 10),
          secure: smtpConfig.secure,
          username: smtpConfig.username,
          password: smtpConfig.password,
          fromAddress: smtpConfig.fromAddress,
        },
      });
      addToast('success', 'Email settings saved successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save email settings');
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleTestImap() {
    setTestingImap(true);
    try {
      await apiClient.post('/settings/email/test-imap', {
        host: imapConfig.host,
        port: parseInt(imapConfig.port, 10),
        secure: imapConfig.secure,
        username: imapConfig.username,
        password: imapConfig.password,
      });
      addToast('success', 'IMAP connection successful.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'IMAP connection failed');
    } finally {
      setTestingImap(false);
    }
  }

  async function handleTestSmtp() {
    setTestingSmtp(true);
    try {
      await apiClient.post('/settings/email/test-smtp', {
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port, 10),
        secure: smtpConfig.secure,
        username: smtpConfig.username,
        password: smtpConfig.password,
        fromAddress: smtpConfig.fromAddress,
      });
      addToast('success', 'SMTP connection successful.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'SMTP connection failed');
    } finally {
      setTestingSmtp(false);
    }
  }

  async function handleSaveCredentials() {
    setSavingCredentials(true);
    try {
      await apiClient.put('/settings/api-keys', {
        portalCredentials: portalCredentials.map(({ siteName, username, password }) => ({
          siteName,
          username,
          password,
        })),
      });
      addToast('success', 'Portal credentials saved successfully.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSavingCredentials(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    try {
      await apiClient.post('/data/export');
      addToast('success', 'Data export started. You will receive an email when it is ready.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiClient.delete('/data/delete');
      addToast('success', 'Account deletion initiated. You will be logged out shortly.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleResetSettings() {
    setResettingSettings(true);
    try {
      await apiClient.post('/settings/reset');
      addToast('success', 'All settings have been reset to defaults.');
      // Reload the page to pick up defaults
      window.location.reload();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to reset settings');
    } finally {
      setResettingSettings(false);
      setShowResetConfirm(false);
    }
  }

  /* ──────────────────── Helpers ──────────────────── */

  function addRssUrl() {
    const trimmed = newRssUrl.trim();
    if (trimmed && !rssFeedUrls.includes(trimmed)) {
      setRssFeedUrls((prev) => [...prev, trimmed]);
      setNewRssUrl('');
    }
  }

  function removeRssUrl(url: string) {
    setRssFeedUrls((prev) => prev.filter((u) => u !== url));
  }

  function addPortalCredential() {
    setPortalCredentials((prev) => [
      ...prev,
      { id: `portal-${++portalIdCounter}`, siteName: '', username: '', password: '' },
    ]);
  }

  function removePortalCredential(id: string) {
    setPortalCredentials((prev) => prev.filter((c) => c.id !== id));
  }

  function updatePortalCredential(id: string, field: keyof Omit<PortalCredential, 'id'>, value: string) {
    setPortalCredentials((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  }

  /* ──────────────────── Shared Sub-components ──────────────────── */

  function SaveButton({
    saving,
    onClick,
    label = 'Save',
  }: {
    saving: boolean;
    onClick: () => void;
    label?: string;
  }) {
    return (
      <div className="flex justify-end pt-4">
        <Button onClick={onClick} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : label}
        </Button>
      </div>
    );
  }

  /* ──────────────────── Loading State ──────────────────── */

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  /* ──────────────────── Render ──────────────────── */

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your preferences, integrations, and account.
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed Layout */}
        <Tabs defaultValue="autonomy" className="flex flex-col md:flex-row gap-6">
          {/* Vertical sidebar for desktop, horizontal for mobile */}
          <TabsList
            className={cn(
              'flex bg-muted/50 rounded-xl p-1.5 h-auto',
              // Mobile: horizontal scrollable
              'flex-row overflow-x-auto md:overflow-x-visible',
              // Desktop: vertical sidebar
              'md:flex-col md:w-56 md:shrink-0 md:self-start md:sticky md:top-8',
            )}
          >
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'flex items-center gap-2 justify-start px-3 py-2.5 text-sm w-full rounded-lg',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm',
                  // On mobile, don't force full width
                  'md:w-full whitespace-nowrap',
                  value === 'danger' && 'text-destructive data-[state=active]:text-destructive',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content Area */}
          <div className="flex-1 min-w-0">
            {/* ── Tab 1: Autonomy ── */}
            <TabsContent value="autonomy" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Autonomy Mode</CardTitle>
                  </div>
                  <CardDescription>
                    Control how much the AI does on its own.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {AUTONOMY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = autonomyMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAutonomyMode(option.value)}
                          className={cn(
                            'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all duration-200 hover:shadow-md',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card hover:border-muted-foreground/25',
                          )}
                        >
                          {isSelected && (
                            <div className="absolute right-2.5 top-2.5">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
                              isSelected
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{option.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {option.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <SaveButton saving={savingAutonomy} onClick={handleSaveAutonomy} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 2: LLM Provider ── */}
            <TabsContent value="llm" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">LLM Provider &amp; Budget</CardTitle>
                  </div>
                  <CardDescription>
                    Configure your AI model provider, API keys, and spending caps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Provider & Model row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Provider</label>
                      <Select
                        value={llmProvider}
                        onValueChange={(v: LlmProvider) => {
                          setLlmProvider(v);
                          setLlmModel(MODELS_BY_PROVIDER[v][0] ?? 'gpt-4o');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {LLM_PROVIDERS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Model</label>
                      <Select value={llmModel} onValueChange={setLlmModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS_BY_PROVIDER[llmProvider].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">API Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="password"
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored securely and never displayed after saving.
                    </p>
                  </div>

                  {/* Ollama URL (conditional) */}
                  {llmProvider === 'ollama' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Ollama URL</label>
                      <div className="relative">
                        <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="url"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="pl-9"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The base URL for your local Ollama instance.
                      </p>
                    </div>
                  )}

                  {/* Temperature */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium leading-none">Temperature</label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {temperature.toFixed(1)}
                      </Badge>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={(v) => setTemperature(v[0] ?? 0.7)}
                      min={0}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Precise (0)</span>
                      <span>Creative (2)</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Budget section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Spending Caps</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="dailyCap" className="text-sm font-medium leading-none">
                          Daily Cap
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="dailyCap"
                            type="number"
                            min="0"
                            step="0.01"
                            value={dailyCap}
                            onChange={(e) => setDailyCap(e.target.value)}
                            placeholder="0.00"
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Maximum spend per day in USD.</p>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="monthlyCap" className="text-sm font-medium leading-none">
                          Monthly Cap
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="monthlyCap"
                            type="number"
                            min="0"
                            step="0.01"
                            value={monthlyCap}
                            onChange={(e) => setMonthlyCap(e.target.value)}
                            placeholder="0.00"
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Maximum spend per month in USD.
                        </p>
                      </div>
                    </div>
                  </div>

                  <SaveButton saving={savingLlm} onClick={handleSaveLlm} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 3: Job Sources ── */}
            <TabsContent value="sources" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Job Sources</CardTitle>
                  </div>
                  <CardDescription>
                    Enable or disable job sources and configure RSS feeds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Source toggles */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Enabled Sources</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {JOB_SOURCES.map(({ key, label, icon: Icon }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <Switch
                            checked={jobSources[key] ?? false}
                            onCheckedChange={(checked) =>
                              setJobSources((prev) => ({ ...prev, [key]: checked }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* RSS Feed URLs */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">RSS Feed URLs</label>
                    <div className="flex gap-2">
                      <Input
                        value={newRssUrl}
                        onChange={(e) => setNewRssUrl(e.target.value)}
                        placeholder="https://example.com/jobs/feed.xml"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addRssUrl();
                          }
                        }}
                      />
                      <Button variant="outline" size="icon" onClick={addRssUrl} type="button">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {rssFeedUrls.length > 0 && (
                      <div className="space-y-2">
                        {rssFeedUrls.map((url) => (
                          <div
                            key={url}
                            className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                          >
                            <Rss className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate text-sm">{url}</span>
                            <button
                              type="button"
                              onClick={() => removeRssUrl(url)}
                              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {rssFeedUrls.length === 0 && (
                      <p className="text-xs text-muted-foreground">No RSS feeds added yet.</p>
                    )}
                  </div>

                  <Separator />

                  {/* Refresh Interval */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Refresh Interval</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How often to check for new jobs from enabled sources.
                    </p>
                  </div>

                  <SaveButton saving={savingSources} onClick={handleSaveSources} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 4: Notifications ── */}
            <TabsContent value="notifications" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Notifications</CardTitle>
                  </div>
                  <CardDescription>
                    Configure how and when you receive notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Delivery methods */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Delivery Methods</label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Email Notifications</p>
                            <p className="text-xs text-muted-foreground">
                              Receive updates via email
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">In-App Notifications</p>
                            <p className="text-xs text-muted-foreground">
                              Show notifications inside the app
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={inAppNotifications}
                          onCheckedChange={setInAppNotifications}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <Radio className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Browser Push</p>
                            <p className="text-xs text-muted-foreground">
                              Desktop push notifications via browser
                            </p>
                          </div>
                        </div>
                        <Switch checked={browserPush} onCheckedChange={setBrowserPush} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Notification channels */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Notification Channels</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          {
                            key: 'applicationUpdates' as const,
                            label: 'Application Updates',
                            desc: 'Status changes on your applications',
                          },
                          {
                            key: 'interviewInvites' as const,
                            label: 'Interview Invites',
                            desc: 'New interview scheduling requests',
                          },
                          {
                            key: 'offerReceived' as const,
                            label: 'Offer Received',
                            desc: 'Job offer notifications',
                          },
                          {
                            key: 'agentErrors' as const,
                            label: 'Agent Errors',
                            desc: 'When the AI agent encounters issues',
                          },
                        ] as const
                      ).map(({ key, label, desc }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                          </div>
                          <Switch
                            checked={notifChannels[key]}
                            onCheckedChange={(checked) =>
                              setNotifChannels((prev) => ({ ...prev, [key]: checked }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Quiet hours */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Quiet Hours</label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pause non-critical notifications during these hours.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">From</label>
                        <Input
                          type="time"
                          value={quietHoursFrom}
                          onChange={(e) => setQuietHoursFrom(e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <span className="text-muted-foreground pt-5">to</span>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">To</label>
                        <Input
                          type="time"
                          value={quietHoursTo}
                          onChange={(e) => setQuietHoursTo(e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  </div>

                  <SaveButton saving={savingNotifications} onClick={handleSaveNotifications} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 5: Blacklists ── */}
            <TabsContent value="blacklists" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Blacklists</CardTitle>
                  </div>
                  <CardDescription>
                    Exclude specific companies or keywords from your job search.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="companyBlacklist" className="text-sm font-medium leading-none">
                      Company Blacklist
                    </label>
                    <textarea
                      id="companyBlacklist"
                      rows={4}
                      value={companyBlacklist}
                      onChange={(e) => setCompanyBlacklist(e.target.value)}
                      placeholder="Enter one company per line..."
                      className={cn(
                        'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y min-h-[100px]',
                      )}
                    />
                    <p className="text-xs text-muted-foreground">One company name per line.</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label htmlFor="keywordBlacklist" className="text-sm font-medium leading-none">
                      Keyword Blacklist
                    </label>
                    <textarea
                      id="keywordBlacklist"
                      rows={4}
                      value={keywordBlacklist}
                      onChange={(e) => setKeywordBlacklist(e.target.value)}
                      placeholder="Enter one keyword per line..."
                      className={cn(
                        'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y min-h-[100px]',
                      )}
                    />
                    <p className="text-xs text-muted-foreground">One keyword per line.</p>
                  </div>

                  <SaveButton saving={savingBlacklists} onClick={handleSaveBlacklists} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 6: Email ── */}
            <TabsContent value="email" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Email Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Configure IMAP and SMTP settings for email integration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* IMAP */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">IMAP (Incoming Mail)</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestImap}
                        disabled={testingImap}
                      >
                        {testingImap ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        {testingImap ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Host</label>
                        <Input
                          value={imapConfig.host}
                          onChange={(e) =>
                            setImapConfig((prev) => ({ ...prev, host: e.target.value }))
                          }
                          placeholder="imap.gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Port</label>
                        <Input
                          value={imapConfig.port}
                          onChange={(e) =>
                            setImapConfig((prev) => ({ ...prev, port: e.target.value }))
                          }
                          placeholder="993"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <Input
                          value={imapConfig.username}
                          onChange={(e) =>
                            setImapConfig((prev) => ({ ...prev, username: e.target.value }))
                          }
                          placeholder="you@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input
                          type="password"
                          value={imapConfig.password}
                          onChange={(e) =>
                            setImapConfig((prev) => ({ ...prev, password: e.target.value }))
                          }
                          placeholder="App password"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">SSL/TLS</p>
                        <p className="text-xs text-muted-foreground">Use secure connection</p>
                      </div>
                      <Switch
                        checked={imapConfig.secure}
                        onCheckedChange={(checked) =>
                          setImapConfig((prev) => ({ ...prev, secure: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* SMTP */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">SMTP (Outgoing Mail)</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestSmtp}
                        disabled={testingSmtp}
                      >
                        {testingSmtp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        {testingSmtp ? 'Testing...' : 'Test Connection'}
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Host</label>
                        <Input
                          value={smtpConfig.host}
                          onChange={(e) =>
                            setSmtpConfig((prev) => ({ ...prev, host: e.target.value }))
                          }
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Port</label>
                        <Input
                          value={smtpConfig.port}
                          onChange={(e) =>
                            setSmtpConfig((prev) => ({ ...prev, port: e.target.value }))
                          }
                          placeholder="587"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <Input
                          value={smtpConfig.username}
                          onChange={(e) =>
                            setSmtpConfig((prev) => ({ ...prev, username: e.target.value }))
                          }
                          placeholder="you@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input
                          type="password"
                          value={smtpConfig.password}
                          onChange={(e) =>
                            setSmtpConfig((prev) => ({ ...prev, password: e.target.value }))
                          }
                          placeholder="App password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From Address</label>
                      <Input
                        type="email"
                        value={smtpConfig.fromAddress}
                        onChange={(e) =>
                          setSmtpConfig((prev) => ({ ...prev, fromAddress: e.target.value }))
                        }
                        placeholder="noreply@example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        The email address that outgoing messages are sent from.
                      </p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">SSL/TLS</p>
                        <p className="text-xs text-muted-foreground">Use secure connection</p>
                      </div>
                      <Switch
                        checked={smtpConfig.secure}
                        onCheckedChange={(checked) =>
                          setSmtpConfig((prev) => ({ ...prev, secure: checked }))
                        }
                      />
                    </div>
                  </div>

                  <SaveButton saving={savingEmail} onClick={handleSaveEmail} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 7: Credentials ── */}
            <TabsContent value="credentials" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Portal Credentials</CardTitle>
                  </div>
                  <CardDescription>
                    Store login credentials for job portals the agent will use on your behalf.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {portalCredentials.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                      <Key className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No portal credentials added yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click the button below to add your first portal.
                      </p>
                    </div>
                  )}

                  {portalCredentials.map((cred, index) => (
                    <div key={cred.id} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Portal {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePortalCredential(cred.id)}
                          className="rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Site Name
                          </label>
                          <Input
                            value={cred.siteName}
                            onChange={(e) =>
                              updatePortalCredential(cred.id, 'siteName', e.target.value)
                            }
                            placeholder="LinkedIn"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Username
                          </label>
                          <Input
                            value={cred.username}
                            onChange={(e) =>
                              updatePortalCredential(cred.id, 'username', e.target.value)
                            }
                            placeholder="you@email.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Password
                          </label>
                          <Input
                            type="password"
                            value={cred.password}
                            onChange={(e) =>
                              updatePortalCredential(cred.id, 'password', e.target.value)
                            }
                            placeholder="Password"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={addPortalCredential}
                    className="w-full"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Add Portal
                  </Button>

                  {portalCredentials.length > 0 && (
                    <SaveButton saving={savingCredentials} onClick={handleSaveCredentials} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 8: Danger Zone ── */}
            <TabsContent value="danger" className="mt-0">
              <Card className="border-destructive/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                  </div>
                  <CardDescription>
                    Irreversible actions. Please proceed with caution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Reset Settings */}
                  <div className="rounded-lg border border-destructive/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Reset All Settings</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Restore all settings to their default values. Your data will not be
                          deleted.
                        </p>
                      </div>
                      {!showResetConfirm ? (
                        <Button
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => setShowResetConfirm(true)}
                        >
                          <Settings2 className="h-4 w-4" />
                          Reset Settings
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleResetSettings}
                            disabled={resettingSettings}
                          >
                            {resettingSettings ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Settings2 className="h-4 w-4" />
                            )}
                            {resettingSettings ? 'Resetting...' : 'Yes, Reset'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowResetConfirm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Export Data */}
                  <div className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Export Data</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Download a copy of all your data.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleExportData}
                        disabled={exporting}
                        className="shrink-0"
                      >
                        {exporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {exporting ? 'Exporting...' : 'Export Data'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Delete Account */}
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-destructive">Delete Account</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Permanently delete your account and all associated data. This cannot be
                          undone.
                        </p>
                      </div>
                      {!showDeleteConfirm ? (
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                          <span className="text-sm font-medium text-destructive">Are you sure?</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteAccount}
                              disabled={deleting}
                            >
                              {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── Toast Notifications ── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-300',
                toast.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
                  : 'border-red-200 bg-red-50/95 text-red-800',
              )}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
              )}
              <span className="flex-1 text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
