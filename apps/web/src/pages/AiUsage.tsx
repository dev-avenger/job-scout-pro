import { useMemo } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { LlmCostsTab } from './monitoring/LlmCostsTab';
import { useLlmRequests } from './monitoring/use-monitoring-queries';
import { Bot } from 'lucide-react';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents < 100 ? 4 : 2)}`;
}

/**
 * Dedicated, app-wide view of all AI/LLM usage — spend, per-agent breakdown,
 * and the full request log. (Per-application usage lives on each application's
 * detail page.)
 */
export function AiUsage() {
  const { data: requests } = useLlmRequests();

  // Aggregate cost + calls + tokens per agent/task
  const byAgent = useMemo(() => {
    const map = new Map<string, { calls: number; cents: number; tokens: number; errors: number }>();
    for (const r of requests ?? []) {
      const key = r.agentName ?? r.taskType ?? 'unknown';
      const cur = map.get(key) ?? { calls: 0, cents: 0, tokens: 0, errors: 0 };
      cur.calls += 1;
      cur.cents += r.costCents ?? 0;
      cur.tokens += (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
      if (r.status === 'error') cur.errors += 1;
      map.set(key, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].cents - a[1].cents);
  }, [requests]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="AI Usage"
        description="Every LLM call across the agent — spend, per-agent breakdown, and the full request log."
      />

      {/* Per-agent breakdown */}
      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Spend by Agent</CardTitle>
              <CardDescription>Which agents are consuming the LLM budget.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {byAgent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
          ) : (
            <div className="rounded-xl border border-border/60 divide-y divide-border/60">
              {byAgent.map(([agent, s]) => (
                <div key={agent} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <span className="font-medium capitalize">{agent.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                    <span>{s.calls} call{s.calls === 1 ? '' : 's'}</span>
                    <span>{s.tokens.toLocaleString()} tok</span>
                    {s.errors > 0 && <span className="text-red-500">{s.errors} err</span>}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCents(s.cents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reuse the full spend cards + request log */}
      <LlmCostsTab />
    </div>
  );
}
