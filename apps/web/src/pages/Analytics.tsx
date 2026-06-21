import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { PageHeader } from '../components/PageHeader';
import { apiClient } from '../api/client';
import {
  Briefcase,
  Send,
  UserCheck,
  Trophy,
  Target,
  TrendingUp,
  DollarSign,
  Bot,
  Cpu,
  Loader2,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OverviewStats {
  totalJobs: number;
  totalApplications: number;
  pendingApplications: number;
  interviews: number;
  offers: number;
}

interface FunnelData {
  queued: number;
  in_progress: number;
  submitted: number;
  confirmed: number;
  interview: number;
  offer: number;
  rejected: number;
  withdrawn: number;
  failed: number;
}

interface LlmSpend {
  dailySpendCents: number;
  monthlySpendCents: number;
  totalSpendCents: number;
}

interface LlmRequest {
  id: string;
  provider: string;
  model: string;
  agentName: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  status: string;
  createdAt: string;
}

interface AgentLogEntry {
  id: string;
  module: string;
  action: string;
  reasoning: string | null;
  outcome: string | null;
  createdAt: string;
}

interface VolumeDataPoint {
  date: string;
  count: number;
}

interface ResponseRateDataPoint {
  date: string;
  rate: number;
}

interface SourceEffectivenessDataPoint {
  source: string;
  applications: number;
  interviews: number;
  offers: number;
}

interface CostTrendDataPoint {
  date: string;
  costCents: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Shared small components                                            */
/* ------------------------------------------------------------------ */

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      Failed to load data: {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Nothing here yet</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Stat Card                                                 */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-soft card-hover">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div className="min-w-0">
            <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Section                                                   */
/* ------------------------------------------------------------------ */

function OverviewSection() {
  const [data, setData] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<OverviewStats>('/analytics/overview')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return <EmptyState message="No overview data available." />;

  const successRate =
    data.totalApplications > 0
      ? Math.round((data.offers / data.totalApplications) * 100)
      : 0;

  const stats: StatCardProps[] = [
    {
      label: 'Total Jobs',
      value: data.totalJobs.toLocaleString(),
      icon: Briefcase,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Applications',
      value: data.totalApplications.toLocaleString(),
      icon: Send,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Pending',
      value: data.pendingApplications.toLocaleString(),
      icon: Target,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Interviews',
      value: data.interviews.toLocaleString(),
      icon: UserCheck,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Offers',
      value: data.offers.toLocaleString(),
      icon: Trophy,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Application Volume Chart                                           */
/* ------------------------------------------------------------------ */

function ApplicationVolumeSection() {
  const [data, setData] = useState<VolumeDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<VolumeDataPoint[]>('/analytics/volume?days=30')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle>Application Volume</CardTitle>
        <CardDescription>Daily application count over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                allowDecimals={false}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                labelFormatter={formatShortDate as any}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Applications"
                stroke="#3b82f6"
                fill="url(#volumeGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No application volume data available." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Application Funnel                                                 */
/* ------------------------------------------------------------------ */

const FUNNEL_STAGES: {
  key: keyof FunnelData;
  label: string;
  color: string;
  progressClass: string;
}[] = [
  {
    key: 'queued',
    label: 'Queued',
    color: 'text-blue-600 dark:text-blue-400',
    progressClass: '[&>div]:bg-blue-500',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: 'text-indigo-600 dark:text-indigo-400',
    progressClass: '[&>div]:bg-indigo-500',
  },
  {
    key: 'submitted',
    label: 'Submitted',
    color: 'text-violet-600 dark:text-violet-400',
    progressClass: '[&>div]:bg-violet-500',
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    color: 'text-cyan-600 dark:text-cyan-400',
    progressClass: '[&>div]:bg-cyan-500',
  },
  {
    key: 'interview',
    label: 'Interview',
    color: 'text-amber-600 dark:text-amber-400',
    progressClass: '[&>div]:bg-amber-500',
  },
  {
    key: 'offer',
    label: 'Offer',
    color: 'text-emerald-600 dark:text-emerald-400',
    progressClass: '[&>div]:bg-emerald-500',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    color: 'text-red-600 dark:text-red-400',
    progressClass: '[&>div]:bg-red-500',
  },
  {
    key: 'failed',
    label: 'Failed',
    color: 'text-muted-foreground',
    progressClass: '[&>div]:bg-slate-400 dark:[&>div]:bg-slate-500',
  },
];

function FunnelSection() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<FunnelData>('/analytics/funnel')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
          <CardDescription>Track candidates through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorBanner message={error} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState message="No funnel data available." />
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...FUNNEL_STAGES.map((s) => data[s.key]),
    1,
  );

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle>Application Funnel</CardTitle>
        <CardDescription>Track candidates through each stage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {FUNNEL_STAGES.map((stage) => {
            const value = data[stage.key];
            const percent = Math.max((value / maxValue) * 100, 2);

            return (
              <div key={stage.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className={cn('tabular-nums font-semibold', stage.color)}>
                    {value.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={percent}
                  className={cn('h-3 rounded-full bg-muted', stage.progressClass)}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Response Rate Chart                                                */
/* ------------------------------------------------------------------ */

function ResponseRateSection() {
  const [data, setData] = useState<ResponseRateDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<ResponseRateDataPoint[]>('/analytics/response-rate?days=30')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle>Response Rate</CardTitle>
        <CardDescription>Response rate percentage over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                unit="%"
                domain={[0, 100]}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                labelFormatter={formatShortDate as any}
                formatter={((value: number) => [`${value.toFixed(1)}%`, 'Response Rate']) as any}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                name="Response Rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No response rate data available." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Resume A/B Testing                                                 */
/* ------------------------------------------------------------------ */

interface AbResultDataPoint {
  variant: string;
  applications: number;
  interviews: number;
  offers: number;
  callbacks: number;
  callbackRate: number;
}

const AB_VARIANT_LABELS: Record<string, string> = {
  A: 'A · Impact narrative',
  B: 'B · Keyword-dense',
};

function AbTestingSection() {
  const [data, setData] = useState<AbResultDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<AbResultDataPoint[]>('/analytics/ab-results')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: AB_VARIANT_LABELS[d.variant] ?? d.variant,
  }));

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle>Resume A/B Testing</CardTitle>
        <CardDescription>
          Callback rate (interview or offer) by resume-tailoring strategy. Variants are assigned
          round-robin when each application's resume is tailored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={((value: number) => [`${value}%`, 'Callback rate']) as any}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'hsl(var(--popover-foreground))',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  }}
                />
                <Bar dataKey="callbackRate" name="Callback rate" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid gap-3 sm:grid-cols-2">
              {chartData.map((d) => (
                <div
                  key={d.variant}
                  className="rounded-lg border border-border/60 p-3 text-sm"
                >
                  <div className="font-medium">{d.label}</div>
                  <div className="mt-1 text-muted-foreground">
                    {d.applications} applications · {d.callbacks} callbacks ({d.callbackRate}%)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.interviews} interviews · {d.offers} offers
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState message="No A/B data yet — tailor a few applications to start the test." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  LLM Spend                                                          */
/* ------------------------------------------------------------------ */

function SpendSection() {
  const [data, setData] = useState<LlmSpend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<LlmSpend>('/monitoring/llm/spend')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return <EmptyState message="No spend data available." />;

  const cards = [
    {
      label: 'Today',
      cents: data.dailySpendCents,
      chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'This Month',
      cents: data.monthlySpendCents,
      chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Total',
      cents: data.totalSpendCents,
      chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60 shadow-soft card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', c.chip)}>
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight tabular-nums">
                  ${centsToDollars(c.cents)}
                </p>
                <p className="text-[13px] font-medium text-muted-foreground">{c.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Source Effectiveness Chart                                          */
/* ------------------------------------------------------------------ */

function SourceEffectivenessSection() {
  const [data, setData] = useState<SourceEffectivenessDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<SourceEffectivenessDataPoint[]>('/analytics/source-effectiveness')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle>Source Effectiveness</CardTitle>
        <CardDescription>Applications, interviews, and offers by source</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="source"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                allowDecimals={false}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                }}
              />
              <Legend />
              <Bar dataKey="applications" name="Applications" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="interviews" name="Interviews" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offers" name="Offers" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No source effectiveness data available." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Cost Trends Chart                                                  */
/* ------------------------------------------------------------------ */

function CostTrendsSection() {
  const [data, setData] = useState<CostTrendDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<CostTrendDataPoint[]>('/analytics/cost-trends?days=30')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const chartData = data?.map((d) => ({
    ...d,
    costDollars: d.costCents / 100,
  }));

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle>Cost Trends</CardTitle>
        <CardDescription>Daily LLM cost over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                labelFormatter={formatShortDate as any}
                formatter={((value: number) => [`$${value.toFixed(2)}`, 'Cost']) as any}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                }}
              />
              <Area
                type="monotone"
                dataKey="costDollars"
                name="Cost"
                stroke="#f59e0b"
                fill="url(#costGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No cost trend data available." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent LLM Requests                                                */
/* ------------------------------------------------------------------ */

function LlmRequestsSection() {
  const [data, setData] = useState<LlmRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<LlmRequest[]>('/monitoring/llm/requests')
      .then((d) => setData(d.slice(0, 10)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Recent LLM Requests</CardTitle>
            <CardDescription>Last 10 model invocations</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : data && data.length > 0 ? (
          <div className="space-y-0 -mx-6">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.7fr_1fr] gap-2 px-6 py-2 text-xs font-medium text-muted-foreground border-b">
              <span>Provider</span>
              <span>Model</span>
              <span className="text-right">Input</span>
              <span className="text-right">Output</span>
              <span className="text-right">Cost</span>
              <span className="text-right">Date</span>
            </div>
            {/* Table rows */}
            {data.map((req, i) => (
              <div
                key={req.id}
                className={cn(
                  'grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.7fr_1fr] gap-2 items-center px-6 py-3 text-sm transition-colors hover:bg-muted/50',
                  i < data.length - 1 && 'border-b border-border/50',
                )}
              >
                <div>
                  <Badge variant="secondary" className="capitalize">
                    {req.provider}
                  </Badge>
                </div>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {req.model}
                </span>
                <span className="text-right tabular-nums">
                  {req.inputTokens.toLocaleString()}
                </span>
                <span className="text-right tabular-nums">
                  {req.outputTokens.toLocaleString()}
                </span>
                <span className="text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  ${centsToDollars(req.costCents)}
                </span>
                <span className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(req.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No LLM requests recorded yet." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Activity                                                     */
/* ------------------------------------------------------------------ */

function AgentActivitySection() {
  const [data, setData] = useState<AgentLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<AgentLogEntry[]>('/monitoring/agent-log')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Agent Activity</CardTitle>
            <CardDescription>Recent actions performed by AI agents</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : data && data.length > 0 ? (
          <div className="space-y-0">
            {data.map((entry, i) => (
              <div key={entry.id}>
                <div className="flex items-start gap-3 py-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {entry.module}
                      </Badge>
                      <span className="text-sm font-medium">{entry.action}</span>
                      {entry.outcome && (
                        <Badge variant={entry.outcome === 'success' ? 'success' : 'secondary'} className="text-xs">
                          {entry.outcome}
                        </Badge>
                      )}
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {relativeTime(entry.createdAt)}
                      </span>
                    </div>
                    {entry.reasoning && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {entry.reasoning}
                      </p>
                    )}
                  </div>
                </div>
                {i < data.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No agent activity recorded yet." />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export function Analytics() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Analytics"
        description="Monitor your job search performance, AI agent activity, and LLM usage at a glance."
      />

      {/* Overview Stats */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
        <OverviewSection />
      </section>

      {/* Application Volume Chart */}
      <section>
        <ApplicationVolumeSection />
      </section>

      {/* Application Funnel */}
      <section>
        <FunnelSection />
      </section>

      {/* Response Rate Chart */}
      <section>
        <ResponseRateSection />
      </section>

      {/* Resume A/B Testing */}
      <section>
        <AbTestingSection />
      </section>

      {/* LLM Spend */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">LLM Spend</h2>
        <SpendSection />
      </section>

      {/* Source Effectiveness Chart */}
      <section>
        <SourceEffectivenessSection />
      </section>

      {/* Cost Trends Chart */}
      <section>
        <CostTrendsSection />
      </section>

      {/* Recent LLM Requests */}
      <section>
        <LlmRequestsSection />
      </section>

      {/* Agent Activity */}
      <section>
        <AgentActivitySection />
      </section>
    </div>
  );
}
