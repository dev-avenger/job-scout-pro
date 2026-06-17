import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ChevronDown, ChevronRight, Loader2, ScrollText, Search } from 'lucide-react';
import { useAgentLogs } from './use-monitoring-queries';

/** Dark-aware module accent colors (presentation only). */
const MODULE_BADGE_COLORS: Record<string, string> = {
  'job-search': 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'job-validation': 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  application: 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400',
  outreach: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'inbox-scan': 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  research: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  'follow-up': 'border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400',
  maintenance: 'border-border bg-muted text-muted-foreground',
  agent: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  system: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
};

const OUTCOME_STYLES: Record<string, { badge: string; dot: string }> = {
  success: {
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  error: {
    badge: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function LogEntry({ entry }: { entry: { id: string; module: string; action: string; reasoning?: string; outcome?: string; inputSummary?: string; outputSummary?: string; createdAt: string } }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.reasoning || entry.inputSummary || entry.outputSummary;
  const moduleColor = MODULE_BADGE_COLORS[entry.module] ?? 'border-border bg-muted text-muted-foreground';
  const outcomeStyle = entry.outcome ? OUTCOME_STYLES[entry.outcome] : undefined;

  return (
    <div className="border-b border-border/50 px-4 py-2.5 transition-colors last:border-0 hover:bg-muted/50">
      <div
        className={`flex items-start gap-3 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {hasDetails ? (
          expanded ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <span className="mt-0.5 w-16 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {timeAgo(entry.createdAt)}
        </span>

        <Badge variant="outline" className={`shrink-0 text-xs font-medium ${moduleColor}`}>
          {entry.module}
        </Badge>

        <span className="flex-1 text-sm text-foreground">{entry.action}</span>

        {entry.outcome && (
          <Badge
            variant="outline"
            className={`shrink-0 gap-1 text-xs ${
              outcomeStyle?.badge ?? 'border-border bg-muted text-muted-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${outcomeStyle?.dot ?? 'bg-muted-foreground'}`} />
            {entry.outcome}
          </Badge>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="ml-[6.5rem] mt-2 space-y-1.5 rounded-lg border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
          {entry.reasoning && (
            <div>
              <span className="font-medium text-foreground">Reasoning: </span>
              {entry.reasoning}
            </div>
          )}
          {entry.inputSummary && (
            <div>
              <span className="font-medium text-foreground">Input: </span>
              {entry.inputSummary}
            </div>
          )}
          {entry.outputSummary && (
            <div>
              <span className="font-medium text-foreground">Output: </span>
              {entry.outputSummary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentLogsTab() {
  const { data: logs, isLoading } = useAgentLogs();
  const [moduleFilter, setModuleFilter] = useState('');

  const filteredLogs = logs?.filter(
    (log) => !moduleFilter || log.module.toLowerCase().includes(moduleFilter.toLowerCase()),
  ) ?? [];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by module..."
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="h-9 pl-9 shadow-soft"
        />
      </div>

      {/* Log feed */}
      <Card className="overflow-hidden border-border/60 shadow-soft">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="mb-3 h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading agent logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <ScrollText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {moduleFilter ? 'No matching logs' : 'No agent logs yet'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {moduleFilter
                  ? 'Try a different module name.'
                  : 'Agent activity will appear here as it happens.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => <LogEntry key={entry.id} entry={entry} />)
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
