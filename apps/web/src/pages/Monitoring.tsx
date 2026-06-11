import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { OverviewTab } from './monitoring/OverviewTab';
import { QueueHealthTab } from './monitoring/QueueHealthTab';
import { LlmCostsTab } from './monitoring/LlmCostsTab';
import { AgentLogsTab } from './monitoring/AgentLogsTab';
import { useRefreshAll } from './monitoring/use-monitoring-queries';

export function Monitoring() {
  const refreshAll = useRefreshAll();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring</h1>
          <p className="text-muted-foreground mt-1">System health, agent activity, and cost tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Auto-refreshing
          </Badge>
          <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queue Health</TabsTrigger>
          <TabsTrigger value="costs">LLM Costs</TabsTrigger>
          <TabsTrigger value="logs">Agent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="queues" className="mt-4">
          <QueueHealthTab />
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <LlmCostsTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <AgentLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
