import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { useQueueStats } from './use-monitoring-queries';
import { QUEUE_NAMES } from './types';

export function QueueHealthTab() {
  const { data: queueStats, isLoading } = useQueueStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!queueStats) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No queue data available. The agent may not be running.
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
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="text-xs">
          Waiting: {totals.waiting}
        </Badge>
        <Badge variant="default" className="text-xs">
          Active: {totals.active}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Completed: {totals.completed}
        </Badge>
        {totals.failed > 0 && (
          <Badge variant="destructive" className="text-xs">
            Failed: {totals.failed}
          </Badge>
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
              className={`p-4 transition-colors ${isActive ? 'border-primary/40 bg-primary/5' : ''}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold truncate">{queueName}</h3>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center rounded bg-yellow-50 px-2 py-1">
                    <p className="text-xs text-muted-foreground">Waiting</p>
                    <p className="text-sm font-semibold">{metrics.waiting}</p>
                  </div>
                  <div className="text-center rounded bg-blue-50 px-2 py-1">
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-sm font-semibold">{metrics.active}</p>
                  </div>
                  <div className="text-center rounded bg-green-50 px-2 py-1">
                    <p className="text-xs text-muted-foreground">Done</p>
                    <p className="text-sm font-semibold">{metrics.completed}</p>
                  </div>
                  <div className={`text-center rounded px-2 py-1 ${metrics.failed > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className={`text-sm font-semibold ${metrics.failed > 0 ? 'text-red-600' : ''}`}>{metrics.failed}</p>
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
