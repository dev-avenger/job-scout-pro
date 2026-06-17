import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { RefreshCw } from 'lucide-react';
import { OverviewTab } from './monitoring/OverviewTab';
import { QueueHealthTab } from './monitoring/QueueHealthTab';
import { LlmCostsTab } from './monitoring/LlmCostsTab';
import { AgentLogsTab } from './monitoring/AgentLogsTab';
import { useRefreshAll } from './monitoring/use-monitoring-queries';

export function Monitoring() {
  const refreshAll = useRefreshAll();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Monitoring"
        description="System health, agent activity, and cost tracking"
        actions={
          <>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Auto-refreshing
            </Badge>
            <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5 shadow-soft">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queue Health</TabsTrigger>
          <TabsTrigger value="costs">LLM Costs</TabsTrigger>
          <TabsTrigger value="logs">Agent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="queues" className="mt-6">
          <QueueHealthTab />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <LlmCostsTab />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <AgentLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
