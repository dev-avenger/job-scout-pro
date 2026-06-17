import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { CalendarDays, Cpu, DollarSign, Loader2, Wallet } from 'lucide-react';
import { useLlmSpend, useLlmRequests } from './use-monitoring-queries';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LlmCostsTab() {
  const { data: spend, isLoading: spendLoading } = useLlmSpend();
  const { data: requests, isLoading: requestsLoading } = useLlmRequests();

  const spendCards = [
    {
      label: 'Today',
      value: spend?.daily ?? 0,
      icon: DollarSign,
      chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'This Month',
      value: spend?.monthly ?? 0,
      icon: CalendarDays,
      chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
      label: 'All Time',
      value: spend?.total ?? 0,
      icon: Wallet,
      chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Spend summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {spendCards.map(({ label, value, icon: Icon, chip }) => (
          <Card key={label} className="border-border/60 p-5 shadow-soft card-hover">
            <div className="flex items-center gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold tracking-tight tabular-nums">
                  {spendLoading ? '—' : formatCents(value)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Request log table */}
      <Card className="overflow-hidden border-border/60 shadow-soft">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold tracking-tight">Recent LLM Requests</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {requestsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="mb-3 h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Cpu className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No LLM requests yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Requests will appear here as agents call the model.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b bg-card">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Agent</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Task</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Model</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Tokens</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Cost</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Latency</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${
                      req.status === 'error' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-medium">{req.agentName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{req.taskType}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{req.model}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {(req.inputTokens + req.outputTokens).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCents(req.costCents)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {req.latencyMs}ms
                    </td>
                    <td className="px-4 py-2 text-center">
                      {req.status === 'error' ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-400"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Error
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          OK
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      {formatTimestamp(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
