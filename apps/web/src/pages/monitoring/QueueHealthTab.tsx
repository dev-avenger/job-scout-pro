import { Card } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Inbox } from 'lucide-react';
import { useQueueStats } from './use-monitoring-queries';
import { QUEUE_NAMES } from './types';

function SummaryChip({
  label,
  value,
  className,
  dotClassName,
}: {
  label: string;
  value: number;
  className: string;
  dotClassName: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      {label}: <span className="tabular-nums font-semibold">{value}</span>
    </span>
  );
}

export function QueueHealthTab() {
  const { data: queueStats, isLoading } = useQueueStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!queueStats) {
    return (
      <Card className="border-border/60 shadow-soft">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No queue data available</p>
          <p className="mt-1 text-xs text-muted-foreground">The agent may not be running.</p>
        </div>
      </Card>
    );
  }

  // Summary totals
  const totals = Object.values(queueStats).reduce(
    (acc, q) => ({
      waiting: acc.waiting + q.waiting,
      active: acc.active + q.active,
      completed: acc.completed + q.completed,
      failed: acc.failed + q.failed,
    }),
    { waiting: 0, active: 0, completed: 0, failed: 0 },
  );

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        <SummaryChip
          label="Waiting"
          value={totals.waiting}
          className="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          dotClassName="bg-amber-500"
        />
        <SummaryChip
          label="Active"
          value={totals.active}
          className="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          dotClassName="bg-blue-500"
        />
        <SummaryChip
          label="Completed"
          value={totals.completed}
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          dotClassName="bg-emerald-500"
        />
        {totals.failed > 0 && (
          <SummaryChip
            label="Failed"
            value={totals.failed}
            className="bg-red-500/10 text-red-600 dark:text-red-400"
            dotClassName="bg-red-500"
          />
        )}
      </div>

      {/* Queue cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUEUE_NAMES.map((queueName) => {
          const metrics = queueStats[queueName] ?? { waiting: 0, active: 0, completed: 0, failed: 0 };
          const total = metrics.completed + metrics.failed + metrics.active + metrics.waiting;
          const completedRatio = total > 0 ? (metrics.completed / total) * 100 : 0;
          const isActive = metrics.active > 0;

          return (
            <Card
              key={queueName}
              className={`border-border/60 p-4 shadow-soft transition-colors ${
                isActive ? 'border-primary/40 bg-primary/5' : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="truncate font-mono text-xs font-semibold text-foreground">
                    {queueName}
                  </h3>
                  {isActive && (
                    <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-center">
                    <p className="text-[11px] font-medium text-muted-foreground">Waiting</p>
                    <p className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {metrics.waiting}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 px-2 py-1.5 text-center">
                    <p className="text-[11px] font-medium text-muted-foreground">Active</p>
                    <p className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {metrics.active}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center">
                    <p className="text-[11px] font-medium text-muted-foreground">Done</p>
                    <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {metrics.completed}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg px-2 py-1.5 text-center ${
                      metrics.failed > 0 ? 'bg-red-500/10' : 'bg-muted/60'
                    }`}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">Failed</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        metrics.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                      }`}
                    >
                      {metrics.failed}
                    </p>
                  </div>
                </div>

                <Progress value={completedRatio} className="h-1.5" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
