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
  const healthColor = totalFailed > 10
    ? 'bg-red-500'
    : totalFailed > 0 || status === 'paused'
      ? 'bg-yellow-500'
      : 'bg-green-500';
  const healthLabel = totalFailed > 10
    ? 'Degraded'
    : totalFailed > 0 || status === 'paused'
      ? 'Warning'
      : 'Healthy';

  const dailySpend = llmSpend ? (llmSpend.daily / 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* System health */}
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${healthColor}`} />
        <span className="text-sm font-medium">System: {healthLabel}</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agent Status</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold capitalize">{status}</p>
                {status === 'running' && (
                  <Badge variant="default" className="text-xs">Active</Badge>
                )}
                {status === 'paused' && (
                  <Badge variant="secondary" className="text-xs">Paused</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's LLM Spend</p>
              <p className="text-lg font-semibold">${dailySpend}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Layers className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Jobs</p>
              <p className="text-lg font-semibold">{totalActive}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queued Jobs</p>
              <p className="text-lg font-semibold">{totalWaiting}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
