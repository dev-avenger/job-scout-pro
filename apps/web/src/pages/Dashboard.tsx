import { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useAuthStore } from '../stores/auth-store';
import { apiClient } from '../api/client';
import {
  Briefcase,
  Send,
  Users,
  TrendingUp,
  Pause,
  Play,
  Search,
  Mail,
  Loader2,
  Activity,
  Zap,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AnalyticsOverview {
  totalJobs: number;
  totalApplications: number;
  pendingApplications: number;
  interviews: number;
  offers: number;
}

interface AgentStatus {
  status: 'active' | 'paused' | 'stopped';
  pausedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                 */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
  iconBg: string;
  delay: string;
}

function StatCard({ label, value, detail, icon, iconBg, delay }: StatCardProps) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/80 shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in',
      )}
      style={{ animationDelay: delay }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.02] group-hover:to-black/[0.04] transition-all duration-300" />

      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {detail && (
              <p className="text-xs text-muted-foreground/70">{detail}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
              iconBg,
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading Skeleton                                                          */
/* -------------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Welcome skeleton */}
      <div className="space-y-2">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-96 animate-pulse rounded-md bg-muted/60" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-xl bg-muted/50"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* Agent status skeleton */}
      <div className="h-[140px] animate-pulse rounded-xl bg-muted/50" />

      {/* Quick actions skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-36 animate-pulse rounded-md bg-muted/60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-[130px] animate-pulse rounded-xl bg-muted/50" />
          <div className="h-[130px] animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

export function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState<string | null>(null);

  /* ---- Data fetching ---- */

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [analyticsData, statusData] = await Promise.all([
        apiClient.get<AnalyticsOverview>('/analytics/overview'),
        apiClient.get<AgentStatus>('/agent/status'),
      ]);
      setAnalytics(analyticsData);
      setAgentStatus(statusData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Agent actions ---- */

  const handleAgentAction = async (action: 'pause' | 'resume') => {
    setAgentActionLoading(true);
    try {
      await apiClient.post(`/agent/${action}`);
      const updated = await apiClient.get<AgentStatus>('/agent/status');
      setAgentStatus(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} agent`,
      );
    } finally {
      setAgentActionLoading(false);
    }
  };

  /* ---- Quick actions ---- */

  const handleQuickAction = async (action: 'search' | 'scan') => {
    setQuickActionLoading(action);
    setQuickActionMessage(null);
    try {
      if (action === 'search') {
        await apiClient.post('/jobs/search/run');
        setQuickActionMessage('Job search started successfully.');
      } else {
        await apiClient.post('/inbox/scan');
        setQuickActionMessage('Inbox scan started successfully.');
      }
    } catch (err) {
      setQuickActionMessage(
        err instanceof Error ? err.message : `Failed to run ${action}`,
      );
    } finally {
      setQuickActionLoading(null);
    }
  };

  /* ---- Loading state ---- */

  if (loading) {
    return <DashboardSkeleton />;
  }

  /* ---- Error state (full-page) ---- */

  if (error && !analytics && !agentStatus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md animate-fade-in border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Activity className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">Error loading dashboard</CardTitle>
            <CardDescription className="text-destructive/80">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Main render ---- */

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* ------------------------------------------------------------------ */}
      {/*  Welcome Section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="animate-fade-in space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
          {user?.email ? (
            <>
              ,{' '}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {user.email}
              </span>
            </>
          ) : (
            ''
          )}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your job search progress.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Inline Error Banner                                                */}
      {/* ------------------------------------------------------------------ */}
      {error && (
        <div className="animate-fade-in flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive/80"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Stat Cards Grid                                                    */}
      {/* ------------------------------------------------------------------ */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Jobs Found"
            value={analytics.totalJobs.toLocaleString()}
            detail={`${analytics.pendingApplications.toLocaleString()} pending`}
            icon={<Briefcase className="h-5 w-5 text-blue-600" />}
            iconBg="bg-blue-100"
            delay="0ms"
          />
          <StatCard
            label="Applications"
            value={analytics.totalApplications.toLocaleString()}
            icon={<Send className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-100"
            delay="75ms"
          />
          <StatCard
            label="Interviews"
            value={analytics.interviews.toLocaleString()}
            detail={`${analytics.offers} offer${analytics.offers !== 1 ? 's' : ''}`}
            icon={<Users className="h-5 w-5 text-purple-600" />}
            iconBg="bg-purple-100"
            delay="150ms"
          />
          <StatCard
            label="Offers"
            value={analytics.offers.toLocaleString()}
            icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
            iconBg="bg-orange-100"
            delay="225ms"
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Agent Status Card                                                  */}
      {/* ------------------------------------------------------------------ */}
      {agentStatus && (
        <Card className="animate-fade-in border-0 shadow-md" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg">Agent Status</CardTitle>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    agentStatus.status === 'active'
                      ? 'success'
                      : agentStatus.status === 'paused'
                        ? 'warning'
                        : 'destructive'
                  }
                  className="gap-1.5"
                >
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      agentStatus.status === 'active' && 'bg-emerald-500 animate-pulse',
                      agentStatus.status === 'paused' && 'bg-amber-500',
                      agentStatus.status === 'stopped' && 'bg-red-500',
                    )}
                  />
                  {agentStatus.status.charAt(0).toUpperCase() +
                    agentStatus.status.slice(1)}
                </Badge>
                {agentStatus.pausedAt && (
                  <span className="text-xs text-muted-foreground">
                    Paused at{' '}
                    {new Date(agentStatus.pausedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {agentStatus.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAgentAction('pause')}
                    disabled={agentActionLoading}
                  >
                    {agentActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                    {agentActionLoading ? 'Pausing...' : 'Pause Agent'}
                  </Button>
                )}
                {(agentStatus.status === 'paused' ||
                  agentStatus.status === 'stopped') && (
                  <Button
                    size="sm"
                    onClick={() => handleAgentAction('resume')}
                    disabled={agentActionLoading}
                  >
                    {agentActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {agentActionLoading ? 'Resuming...' : 'Resume Agent'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Quick Actions                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="animate-fade-in space-y-4" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Quick Actions
          </h2>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Run Job Search */}
          <button
            type="button"
            onClick={() => handleQuickAction('search')}
            disabled={quickActionLoading !== null}
            className="group relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50 p-[1px] shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="relative flex items-center gap-4 rounded-[11px] bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-5 backdrop-blur-sm transition-all duration-300 group-hover:from-blue-50 group-hover:to-indigo-100/80">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
                {quickActionLoading === 'search' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Search className="h-6 w-6" />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Run Job Search</p>
                <p className="text-sm text-muted-foreground">
                  Scan job boards for new opportunities
                </p>
              </div>
            </div>
            {/* Gradient border effect */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/0 via-blue-400/0 to-indigo-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
          </button>

          {/* Scan Inbox */}
          <button
            type="button"
            onClick={() => handleQuickAction('scan')}
            disabled={quickActionLoading !== null}
            className="group relative overflow-hidden rounded-xl border-0 bg-gradient-to-br from-purple-50 to-pink-50 p-[1px] shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="relative flex items-center gap-4 rounded-[11px] bg-gradient-to-br from-purple-50/80 to-pink-50/80 p-5 backdrop-blur-sm transition-all duration-300 group-hover:from-purple-50 group-hover:to-pink-100/80">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
                {quickActionLoading === 'scan' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Mail className="h-6 w-6" />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Scan Inbox</p>
                <p className="text-sm text-muted-foreground">
                  Check emails for interview invites and updates
                </p>
              </div>
            </div>
            {/* Gradient border effect */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-purple-400/0 via-purple-400/0 to-pink-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
          </button>
        </div>

        {/* Quick-action feedback message */}
        {quickActionMessage && (
          <p className="animate-fade-in text-sm text-muted-foreground">
            {quickActionMessage}
          </p>
        )}
      </div>
    </div>
  );
}
