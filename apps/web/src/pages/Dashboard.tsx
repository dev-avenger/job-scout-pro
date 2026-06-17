import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { useAuthStore } from '../stores/auth-store';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiClient } from '../api/client';
import {
  Briefcase,
  Send,
  Users,
  Trophy,
  Pause,
  Play,
  Search,
  Mail,
  Loader2,
  Activity,
  Zap,
  ArrowRight,
  Radio,
  Building2,
  ExternalLink,
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

interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
}

interface WatchlistJob {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  applyUrl: string | null;
  sourceUrl: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                 */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
  accent: string;
  to: string;
  delay: string;
}

function StatCard({ label, value, detail, icon, accent, to, delay }: StatCardProps) {
  return (
    <Link to={to} className="block group animate-fade-in" style={{ animationDelay: delay }}>
      <Card className="relative overflow-hidden border-border/60 shadow-soft card-hover h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground/70 min-h-4">{detail ?? ''}</p>
            </div>
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                accent,
              )}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pipeline funnel                                                           */
/* -------------------------------------------------------------------------- */

function FunnelRow({
  label,
  value,
  max,
  barClass,
  delay,
}: {
  label: string;
  value: number;
  max: number;
  barClass: string;
  delay: string;
}) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barClass)}
          style={{ width: `${pct}%`, transitionDelay: delay }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading Skeleton                                                          */
/* -------------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="space-y-2">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-96 animate-pulse rounded-md bg-muted/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-xl bg-muted/50"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[140px] animate-pulse rounded-xl bg-muted/50" />
          <div className="h-[200px] animate-pulse rounded-xl bg-muted/50" />
        </div>
        <div className="h-[360px] animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const EVENT_TITLES: Record<string, string> = {
  'search.skipped': 'Job search skipped',
  'search.started': 'Job search started',
  'search.source.started': 'Scanning source',
  'search.source.completed': 'Source scan finished',
  'search.source.failed': 'Source scan failed',
  'search.completed': 'Job search complete',
  'job.discovered': 'New job discovered',
  'application.submitted': 'Application submitted',
  'application.statusChanged': 'Application status changed',
  'inbox.classified': 'New email classified',
  'inbox.scan.started': 'Inbox scan started',
  'inbox.scan.skipped': 'Inbox scan skipped',
  'inbox.scan.completed': 'Inbox scan complete',
  'email.received': 'Email classified',
  'interview.detected': 'Interview detected',
};

function eventDescription(type: string, data: Record<string, unknown>): string | undefined {
  switch (type) {
    case 'search.skipped':
    case 'inbox.scan.skipped':
      return String(data.reason ?? '');
    case 'inbox.scan.completed':
      return `${data.fetched ?? 0} fetched · ${data.classified ?? 0} classified`;
    case 'email.received':
      return data.classification ? `Classified as: ${data.classification}` : undefined;
    case 'search.started':
      return `Searching ${data.sourceCount ?? '?'} sources for: ${
        Array.isArray(data.keywords) ? (data.keywords as string[]).join(', ') : ''
      }`;
    case 'search.source.started':
      return String(data.source ?? '');
    case 'search.source.completed':
      return `${data.source} — ${data.discovered ?? 0} new job${data.discovered === 1 ? '' : 's'}`;
    case 'search.source.failed':
      return `${data.source} — ${data.error ?? 'failed'}`;
    case 'search.completed':
      return `${data.discovered ?? 0} new job${data.discovered === 1 ? '' : 's'} added to the queue`;
    default: {
      const description = [data.title, data.company ?? data.companyName].filter(Boolean).join(' · ');
      return description || undefined;
    }
  }
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [watchlistJobs, setWatchlistJobs] = useState<WatchlistJob[]>([]);

  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState<string | null>(null);

  const displayName = user?.email ? user.email.split('@')[0] : '';

  /* ---- Live events over WebSocket ---- */

  const { connected } = useWebSocket((msg) => {
    const title = EVENT_TITLES[msg.type];
    if (!title) return;
    const data = (msg.data ?? {}) as Record<string, unknown>;
    setEvents((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          description: eventDescription(msg.type, data),
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 25),
    );
  });

  /* ---- Data fetching ---- */

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [analyticsData, statusData, watchlistData] = await Promise.all([
        apiClient.get<AnalyticsOverview>('/analytics/overview'),
        apiClient.get<AgentStatus>('/agent/status'),
        apiClient
          .get<{ items: WatchlistJob[] }>('/jobs?source=company_watchlist&limit=6')
          .catch(() => ({ items: [] as WatchlistJob[] })),
      ]);
      setAnalytics(analyticsData);
      setAgentStatus(statusData);
      setWatchlistJobs(watchlistData.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
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
      setError(err instanceof Error ? err.message : `Failed to ${action} agent`);
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
        setQuickActionMessage('Job search started — new jobs will appear in the queue.');
      } else {
        await apiClient.post('/inbox/scan');
        setQuickActionMessage('Inbox scan started — check notifications for results.');
      }
    } catch (err) {
      setQuickActionMessage(err instanceof Error ? err.message : `Failed to run ${action}`);
    } finally {
      setQuickActionLoading(null);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error && !analytics && !agentStatus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md animate-fade-in border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Activity className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">Error loading dashboard</CardTitle>
            <CardDescription className="text-destructive/80">{error}</CardDescription>
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-7 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Greeting header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting()},{' '}
            <span className="text-gradient capitalize">{displayName || 'there'}</span>
          </h1>
          <p className="text-muted-foreground">Here is where your job search stands.</p>
        </div>
        <Button
          onClick={() => handleQuickAction('search')}
          disabled={quickActionLoading !== null}
          className="gradient-primary shadow-md shadow-primary/25 hover:shadow-primary/40 transition-shadow"
        >
          {quickActionLoading === 'search' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Run Job Search
        </Button>
      </div>

      {/* Inline error banner */}
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

      {/* Stat cards */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Jobs Found"
            value={analytics.totalJobs.toLocaleString()}
            detail={`${analytics.pendingApplications.toLocaleString()} pending review`}
            icon={<Briefcase className="h-5 w-5" />}
            accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            to="/jobs/queue"
            delay="0ms"
          />
          <StatCard
            label="Applications"
            value={analytics.totalApplications.toLocaleString()}
            icon={<Send className="h-5 w-5" />}
            accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            to="/applications"
            delay="75ms"
          />
          <StatCard
            label="Interviews"
            value={analytics.interviews.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
            accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            to="/interviews"
            delay="150ms"
          />
          <StatCard
            label="Offers"
            value={analytics.offers.toLocaleString()}
            icon={<Trophy className="h-5 w-5" />}
            accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            to="/applications"
            delay="225ms"
          />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agent status */}
          {agentStatus && (
            <Card className="animate-fade-in border-border/60 shadow-soft" style={{ animationDelay: '150ms' }}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl',
                        agentStatus.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">AI Agent</p>
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
                          {agentStatus.status.charAt(0).toUpperCase() + agentStatus.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {agentStatus.status === 'active'
                          ? 'Searching, applying, and monitoring on your behalf.'
                          : agentStatus.pausedAt
                            ? `Paused ${new Date(agentStatus.pausedAt).toLocaleString()}`
                            : 'Currently not running.'}
                      </p>
                    </div>
                  </div>

                  {agentStatus.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAgentAction('pause')}
                      disabled={agentActionLoading}
                    >
                      {agentActionLoading ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="mr-1.5 h-4 w-4" />
                      )}
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAgentAction('resume')}
                      disabled={agentActionLoading}
                    >
                      {agentActionLoading ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-4 w-4" />
                      )}
                      Resume
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pipeline funnel */}
          {analytics && (
            <Card className="animate-fade-in border-border/60 shadow-soft" style={{ animationDelay: '225ms' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Pipeline</CardTitle>
                <CardDescription>How opportunities are converting through your funnel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FunnelRow
                  label="Jobs discovered"
                  value={analytics.totalJobs}
                  max={analytics.totalJobs}
                  barClass="bg-blue-500"
                  delay="100ms"
                />
                <FunnelRow
                  label="Applications sent"
                  value={analytics.totalApplications}
                  max={analytics.totalJobs}
                  barClass="bg-emerald-500"
                  delay="200ms"
                />
                <FunnelRow
                  label="Interviews"
                  value={analytics.interviews}
                  max={analytics.totalJobs}
                  barClass="bg-violet-500"
                  delay="300ms"
                />
                <FunnelRow
                  label="Offers"
                  value={analytics.offers}
                  max={analytics.totalJobs}
                  barClass="bg-amber-500"
                  delay="400ms"
                />
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <div className="animate-fade-in space-y-3" style={{ animationDelay: '300ms' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleQuickAction('search')}
                disabled={quickActionLoading !== null}
                className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 text-left shadow-soft transition-all duration-300 hover:shadow-lifted hover:-translate-y-0.5 hover:border-blue-500/30 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform duration-300 group-hover:scale-110">
                  {quickActionLoading === 'search' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Run Job Search</p>
                  <p className="text-sm text-muted-foreground truncate">
                    Scan all sources for new roles
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickAction('scan')}
                disabled={quickActionLoading !== null}
                className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 text-left shadow-soft transition-all duration-300 hover:shadow-lifted hover:-translate-y-0.5 hover:border-violet-500/30 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-transform duration-300 group-hover:scale-110">
                  {quickActionLoading === 'scan' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Scan Inbox</p>
                  <p className="text-sm text-muted-foreground truncate">
                    Detect interview invites and updates
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>
            {quickActionMessage && (
              <p className="animate-fade-in text-sm text-muted-foreground">{quickActionMessage}</p>
            )}
          </div>
        </div>

        {/* Right column: watchlist + live activity */}
        <div className="space-y-6 h-fit lg:sticky lg:top-20">
        {/* Company watchlist */}
        <Card className="animate-fade-in border-border/60 shadow-soft" style={{ animationDelay: '250ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Company Watchlist</CardTitle>
              <Link
                to="/job-sources"
                className="text-[11px] font-medium text-primary hover:underline underline-offset-2"
              >
                Manage
              </Link>
            </div>
            <CardDescription>Latest openings at companies you watch.</CardDescription>
          </CardHeader>
          <CardContent>
            {watchlistJobs.length === 0 ? (
              <div className="py-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No watchlist jobs yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Add companies in Job Sources, then run a search.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {watchlistJobs.map((job) => (
                  <a
                    key={job.id}
                    href={job.applyUrl ?? job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                      {job.companyName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium leading-tight">
                        {job.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground mt-0.5">
                        {[job.companyName, job.location].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live activity */}
        <Card
          className="animate-fade-in border-border/60 shadow-soft"
          style={{ animationDelay: '300ms' }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Live Activity</CardTitle>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-medium',
                  connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                )}
              >
                <Radio className="h-3 w-3" />
                {connected ? 'Live' : 'Connecting…'}
              </span>
            </div>
            <CardDescription>Agent events as they happen.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Run a job search to see events stream in.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50 animate-fade-in"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {event.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
