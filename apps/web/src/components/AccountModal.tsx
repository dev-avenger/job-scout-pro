import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/auth-store';
import { useThemeStore } from '../stores/theme-store';
import { apiClient } from '../api/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  LogOut,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  Sparkles,
  Hand,
  Rocket,
  CheckCircle2,
  Loader2,
  Settings,
  ArrowRight,
} from 'lucide-react';

type AutonomyMode = 'guided' | 'supervised' | 'autonomous';

const AUTONOMY_OPTIONS: Array<{
  value: AutonomyMode;
  label: string;
  description: string;
  icon: typeof Hand;
}> = [
  {
    value: 'guided',
    label: 'Guided',
    description: 'You approve every action',
    icon: Hand,
  },
  {
    value: 'supervised',
    label: 'Supervised',
    description: 'Agent acts, you review',
    icon: ShieldCheck,
  },
  {
    value: 'autonomous',
    label: 'Autonomous',
    description: 'Agent works independently',
    icon: Sparkles,
  },
];

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];

interface AccountDetails {
  email?: string;
  createdAt?: string;
  guidedAppCount?: number;
  supervisedAppCount?: number;
}

export function AccountModal({
  open,
  onOpenChange,
  onOpenSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const navigate = useNavigate();
  const [savingMode, setSavingMode] = useState<AutonomyMode | null>(null);
  const [account, setAccount] = useState<AccountDetails | null>(null);

  useEffect(() => {
    if (!open) return;
    apiClient
      .get<{ account?: AccountDetails }>('/settings')
      .then((data) => setAccount(data.account ?? null))
      .catch(() => setAccount(null));
  }, [open]);

  if (!user) return null;

  const displayName = user.email.split('@')[0];

  const handleAutonomyChange = async (mode: AutonomyMode) => {
    if (mode === user.autonomyMode || savingMode) return;
    setSavingMode(mode);
    try {
      await apiClient.put('/settings/autonomy', { mode });
      if (accessToken) setAuth(accessToken, { ...user, autonomyMode: mode });
    } catch {
      // keep previous mode on failure
    } finally {
      setSavingMode(null);
    }
  };

  const handleLogout = () => {
    onOpenChange(false);
    logout();
  };

  const goToWizard = () => {
    onOpenChange(false);
    navigate('/onboarding');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Account</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your account, autonomy mode, and appearance.
          </DialogDescription>
        </DialogHeader>

        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary text-xl font-bold text-white shadow-md shadow-primary/30">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold capitalize leading-tight truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="mt-1 flex items-center gap-1.5">
              {user.onboardingCompleted ? (
                <Badge variant="outline" className="gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" /> Setup complete
                </Badge>
              ) : (
                <button
                  onClick={goToWizard}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  <Rocket className="h-3 w-3" /> Finish setup
                </button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Account details */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account details
          </p>
          <div className="rounded-xl border border-border/60 divide-y divide-border/60 text-sm">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium truncate max-w-[60%]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium tabular-nums">
                {account?.createdAt
                  ? new Date(account.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Applications submitted</span>
              <span className="font-medium tabular-nums">
                {account
                  ? (account.guidedAppCount ?? 0) + (account.supervisedAppCount ?? 0)
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs text-muted-foreground">
                {user.id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Autonomy mode */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Autonomy mode
          </p>
          <div className="grid grid-cols-3 gap-2">
            {AUTONOMY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = user.autonomyMode === option.value;
              const isSaving = savingMode === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleAutonomyChange(option.value)}
                  disabled={savingMode !== null}
                  title={option.description}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'border-primary/40 bg-accent text-accent-foreground shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary/25 hover:bg-accent/50',
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'border-primary/40 bg-accent text-accent-foreground shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary/25 hover:bg-accent/50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              if (onOpenSettings) onOpenSettings();
              else navigate('/settings');
            }}
            className="flex-1 justify-center gap-2"
          >
            <Settings className="h-4 w-4" />
            All settings
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="flex-1 justify-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
