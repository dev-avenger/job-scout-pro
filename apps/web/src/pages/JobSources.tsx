import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Globe, Rss, Upload, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';

interface JobSource {
  id: string;
  sourceType: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastRunAt: string | null;
  successCount: number;
  failureCount: number;
}

export function JobSources() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [manualUrl, setManualUrl] = useState('');

  useEffect(() => {
    apiClient.get<JobSource[]>('/jobs/sources').then(setSources).catch(() => {});
  }, []);

  const addManualJob = async () => {
    if (!manualUrl) return;
    try {
      await apiClient.post('/jobs/url', { url: manualUrl });
      setManualUrl('');
    } catch {}
  };

  const runSearch = async () => {
    try {
      await apiClient.post('/jobs/search/run');
    } catch {}
  };

  const sourceIcons: Record<string, React.ReactNode> = {
    rss_feed: <Rss className="w-5 h-5" />,
    manual_url: <Globe className="w-5 h-5" />,
    indeed_api: <Globe className="w-5 h-5" />,
    adzuna_api: <Globe className="w-5 h-5" />,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Sources & Discovery</h1>
          <p className="text-muted-foreground mt-1">Configure where to find job listings</p>
        </div>
        <Button onClick={runSearch}><RefreshCw className="w-4 h-4 mr-2" />Run Search Now</Button>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Source Channels</TabsTrigger>
          <TabsTrigger value="manual">Manual Add</TabsTrigger>
          <TabsTrigger value="log">Ingestion Log</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4 mt-4">
          {sources.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <p>No job sources configured yet. Add RSS feeds, API keys, or manual URLs to get started.</p>
            </Card>
          )}
          {sources.map((source) => (
            <Card key={source.id} className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                {sourceIcons[source.sourceType] || <Globe className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{source.sourceType.replace('_', ' ').toUpperCase()}</span>
                  <Badge variant={source.isActive ? 'default' : 'secondary'}>{source.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {source.successCount} found | {source.failureCount} errors | Last run: {source.lastRunAt ? new Date(source.lastRunAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Add Job by URL</h3>
            <div className="flex gap-2">
              <Input placeholder="https://company.com/careers/job-123" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} />
              <Button onClick={addManualJob}><Plus className="w-4 h-4 mr-2" />Add</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card className="p-6">
            <p className="text-muted-foreground text-center">Ingestion log will appear here after running searches.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
