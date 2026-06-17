import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PageHeader } from '../components/PageHeader';
import { Globe, Rss, Plus, RefreshCw, ScrollText, SearchX, Building2, X, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { cn } from '../lib/utils';
import { apiClient } from '../api/client';
import { WatchlistSuggestions } from '../components/WatchlistSuggestions';
import type { WatchlistAdapter, WatchlistEntry } from '../data/watchlist-catalog';

interface JobSource {
  id: string;
  sourceType: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastRunAt: string | null;
  successCount: number;
  failureCount: number;
}

const ADAPTER_LABELS: Record<WatchlistAdapter, string> = {
  successfactors: 'SAP SuccessFactors',
  workable: 'Workable',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  html: 'Careers page (HTML)',
};

export function JobSources() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [manualUrl, setManualUrl] = useState('');
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newAdapter, setNewAdapter] = useState<WatchlistAdapter>('workable');
  const [newRef, setNewRef] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('Pakistan');

  useEffect(() => {
    apiClient.get<JobSource[]>('/jobs/sources').then(setSources).catch(() => {});
    apiClient
      .get<{ preferences?: { companyWatchlist?: WatchlistEntry[] } }>('/settings')
      .then((data) => setWatchlist(data.preferences?.companyWatchlist ?? []))
      .catch(() => {});
  }, []);

  const persistWatchlist = async (entries: WatchlistEntry[]) => {
    setSavingWatchlist(true);
    try {
      await apiClient.put('/settings/preferences', { companyWatchlist: entries });
      setWatchlist(entries);
    } catch {
      // keep previous state on failure
    } finally {
      setSavingWatchlist(false);
    }
  };

  const freshWatchlist = async (): Promise<WatchlistEntry[]> => {
    try {
      const data = await apiClient.get<{ preferences?: { companyWatchlist?: WatchlistEntry[] } }>(
        '/settings',
      );
      return data.preferences?.companyWatchlist ?? [];
    } catch {
      return watchlist;
    }
  };

  const addWatchlistEntry = async (entry: WatchlistEntry) => {
    const current = await freshWatchlist();
    if (current.some((w) => w.company.toLowerCase() === entry.company.toLowerCase())) {
      setWatchlist(current);
      return;
    }
    persistWatchlist([...current, entry]);
  };

  const removeWatchlistEntry = async (company: string) => {
    const current = await freshWatchlist();
    persistWatchlist(current.filter((w) => w.company !== company));
  };

  const addCustomCompany = () => {
    if (!newCompany.trim() || !newRef.trim()) return;
    addWatchlistEntry({
      company: newCompany.trim(),
      adapter: newAdapter,
      ref: newRef.trim(),
      city: newCity.trim() || undefined,
      country: newCountry.trim() || undefined,
    });
    setNewCompany('');
    setNewRef('');
    setNewCity('');
  };



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
    rss_feed: <Rss className="h-5 w-5" />,
    manual_url: <Globe className="h-5 w-5" />,
    indeed_api: <Globe className="h-5 w-5" />,
    adzuna_api: <Globe className="h-5 w-5" />,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Job Sources & Discovery"
        description="Configure where to find job listings"
        actions={
          <Button onClick={runSearch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Run Search Now
          </Button>
        }
      />

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Source Channels</TabsTrigger>
          <TabsTrigger value="watchlist">Company Watchlist</TabsTrigger>
          <TabsTrigger value="manual">Manual Add</TabsTrigger>
          <TabsTrigger value="log">Ingestion Log</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4 space-y-3">
          {sources.length === 0 && (
            <Card className="border-border/60 shadow-soft">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <SearchX className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">No job sources configured</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add RSS feeds, API keys, or manual URLs to start discovering job listings.
                </p>
                <Button className="mt-6" onClick={runSearch}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Search Now
                </Button>
              </CardContent>
            </Card>
          )}
          {sources.map((source) => (
            <Card
              key={source.id}
              className="card-hover flex items-center gap-4 border-border/60 p-4 shadow-soft"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {sourceIcons[source.sourceType] || <Globe className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {source.sourceType.replace('_', ' ').toUpperCase()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1.5 text-xs',
                      source.isActive
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border/60 bg-muted text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        source.isActive ? 'bg-emerald-500' : 'bg-muted-foreground',
                      )}
                    />
                    {source.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {source.successCount} found · {source.failureCount} errors · Last run:{' '}
                  {source.lastRunAt ? new Date(source.lastRunAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="watchlist" className="mt-4 space-y-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Watched Companies</CardTitle>
                  <CardDescription>
                    Their public job boards are checked on every search — most company portals
                    only require login to apply, not to view openings.
                  </CardDescription>
                </div>
                {savingWatchlist && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {watchlist.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No companies watched yet — add one below or pick from the suggestions.
                </p>
              ) : (
                <div className="space-y-2">
                  {watchlist.map((entry) => (
                    <div
                      key={entry.company}
                      className="flex items-center gap-3 rounded-xl border border-border/60 px-3.5 py-2.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{entry.company}</p>
                          {(entry.city || entry.country) && (
                            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                              {[entry.city, entry.country].filter(Boolean).join(', ')}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {ADAPTER_LABELS[entry.adapter]} · {entry.ref}
                        </p>
                      </div>
                      <button
                        onClick={() => removeWatchlistEntry(entry.company)}
                        disabled={savingWatchlist}
                        title="Remove"
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add custom company */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-semibold">Add a company</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_180px_1fr_auto]">
                  <Input
                    className="bg-background"
                    placeholder="Company name"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                  />
                  <Select value={newAdapter} onValueChange={(v) => setNewAdapter(v as WatchlistAdapter)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workable">Workable</SelectItem>
                      <SelectItem value="greenhouse">Greenhouse</SelectItem>
                      <SelectItem value="lever">Lever</SelectItem>
                      <SelectItem value="html">Careers page (HTML)</SelectItem>
                      <SelectItem value="successfactors">SAP SuccessFactors</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="bg-background"
                    placeholder={newAdapter === 'html' ? 'https://company.com/careers' : 'ATS account slug'}
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                  />
                  <Button onClick={addCustomCompany} disabled={savingWatchlist} className="shrink-0">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:max-w-md">
                  <Input
                    className="bg-background"
                    placeholder="City (e.g. Lahore)"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                  />
                  <Input
                    className="bg-background"
                    placeholder="Country"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  For Workable/Greenhouse/Lever the slug is the company part of its job board URL,
                  e.g. apply.workable.com/<span className="font-mono">arbisoft</span>.
                </p>
              </div>

              <WatchlistSuggestions watchlist={watchlist} saving={savingWatchlist} onAdd={addWatchlistEntry} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Add Job by URL</CardTitle>
              <CardDescription>
                Paste a direct link to a job posting and the agent will ingest it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="manual-job-url">Job posting URL</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-job-url"
                  className="bg-muted/50"
                  placeholder="https://company.com/careers/job-123"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                />
                <Button onClick={addManualJob} className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card className="border-border/60 shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <ScrollText className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No ingestion activity</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The ingestion log will appear here after running searches.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
