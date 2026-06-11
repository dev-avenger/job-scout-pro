import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
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

  return (
    <div className="space-y-6">
      {/* Spend summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-2xl font-bold mt-1">
            {spendLoading ? '...' : formatCents(spend?.daily ?? 0)}
          </p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold mt-1">
            {spendLoading ? '...' : formatCents(spend?.monthly ?? 0)}
          </p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-sm text-muted-foreground">All Time</p>
          <p className="text-2xl font-bold mt-1">
            {spendLoading ? '...' : formatCents(spend?.total ?? 0)}
          </p>
        </Card>
      </div>

      {/* Request log table */}
      <Card className="border-0 shadow-md">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Recent LLM Requests</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {requestsLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading requests...</div>
          ) : !requests || requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No LLM requests recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Agent</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Task</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Model</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Tokens</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Cost</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Latency</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className={`border-b hover:bg-muted/50 ${req.status === 'error' ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-2 font-medium">{req.agentName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{req.taskType}</td>
                    <td className="px-4 py-2 text-muted-foreground">{req.model}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {(req.inputTokens + req.outputTokens).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCents(req.costCents)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{req.latencyMs}ms</td>
                    <td className="px-4 py-2 text-center">
                      {req.status === 'error' ? (
                        <Badge variant="destructive" className="text-xs">Error</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
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
