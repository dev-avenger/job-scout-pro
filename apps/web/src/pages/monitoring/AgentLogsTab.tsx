import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useAgentLogs } from './use-monitoring-queries';
import { MODULE_COLORS } from './types';

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
  const moduleColor = MODULE_COLORS[entry.module] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="border-b last:border-0 py-2.5 px-4 hover:bg-muted/30 transition-colors">
      <div
        className={`flex items-start gap-3 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {hasDetails ? (
          expanded ? <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <span className="text-xs text-muted-foreground tabular-nums w-16 shrink-0 mt-0.5">
          {timeAgo(entry.createdAt)}
        </span>

        <Badge variant="outline" className={`text-xs shrink-0 ${moduleColor}`}>
          {entry.module}
        </Badge>

        <span className="text-sm flex-1">{entry.action}</span>

        {entry.outcome && (
          <Badge
            variant={entry.outcome === 'success' ? 'default' : entry.outcome === 'error' ? 'destructive' : 'secondary'}
            className="text-xs shrink-0"
          >
            {entry.outcome}
          </Badge>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="ml-[6.5rem] mt-2 space-y-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by module..."
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Log feed */}
      <Card className="border-0 shadow-md">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading agent logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {moduleFilter ? 'No logs matching filter.' : 'No agent logs recorded yet.'}
            </div>
          ) : (
            filteredLogs.map((entry) => <LogEntry key={entry.id} entry={entry} />)
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}
