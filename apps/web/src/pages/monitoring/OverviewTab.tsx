import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Bot, DollarSign, Layers, Clock } from 'lucide-react';
import { useAgentStatus, useQueueStats, useLlmSpend } from './use-monitoring-queries';

export function OverviewTab() {
  const { data: agentStatus } = useAgentStatus();
  const { data: queueStats } = useQueueStats();
  const { data: llmSpend } = useLlmSpend();

  const totalActive = queueStats
    ? Object.values(queueStats).reduce((sum, q) => sum + q.active, 0)
    : 0;
  const totalWaiting = queueStats
    ? Object.values(queueStats).reduce((sum, q) => sum + q.waiting, 0)
    : 0;
  const totalFailed = queueStats
    ? Object.values(queueStats).reduce((sum, q) => sum + q.failed, 0)
    : 0;

  const status = agentStatus?.status ?? 'unknown';
  const healthChip = totalFailed > 10
    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : totalFailed > 0 || status === 'paused'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  const healthDot = totalFailed > 10
    ? 'bg-red-500'
    : totalFailed > 0 || status === 'paused'
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  const healthLabel = totalFailed > 10
    ? 'Degraded'
    : totalFailed > 0 || status === 'paused'
      ? 'Warning'
      : 'Healthy';

  const dailySpend = llmSpend ? (llmSpend.daily / 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* System health */}
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${healthChip}`}
      >
        <span className={`h-2 w-2 rounded-full ${healthDot}`} />
        System: {healthLabel}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 p-5 shadow-soft card-hover">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">Agent Status</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold capitalize tracking-tight">{status}</p>
                {status === 'running' && (
                  <Badge variant="default" className="gap-1 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Active
                  </Badge>
                )}
                {status === 'paused' && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Paused
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 p-5 shadow-soft card-hover">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">Today's LLM Spend</p>
              <p className="text-3xl font-bold tracking-tight tabular-nums">${dailySpend}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 p-5 shadow-soft card-hover">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">Active Jobs</p>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{totalActive}</p>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 p-5 shadow-soft card-hover">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">Queued Jobs</p>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{totalWaiting}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
