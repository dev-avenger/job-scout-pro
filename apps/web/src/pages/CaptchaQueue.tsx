import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { apiClient } from '../api/client';
import { ShieldAlert, ShieldCheck, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

interface QueueApp {
  id: string;
  jobTitle?: string | null;
  companyName?: string | null;
  status: string;
  failureReason: string | null;
}

interface PaginatedResponse {
  items: QueueApp[];
}

const STATUS_LABEL: Record<string, string> = {
  needs_captcha: 'CAPTCHA',
  needs_login: 'Login required',
};

export function CaptchaQueue() {
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [captcha, login] = await Promise.all([
        apiClient.get<PaginatedResponse>('/applications?status=needs_captcha&limit=50').catch(() => ({ items: [] })),
        apiClient.get<PaginatedResponse>('/applications?status=needs_login&limit=50').catch(() => ({ items: [] })),
      ]);
      // Merge + de-dupe by id.
      const byId = new Map<string, QueueApp>();
      for (const a of [...(captcha.items ?? []), ...(login.items ?? [])]) byId.set(a.id, a);
      setItems([...byId.values()]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const solve = async (appId: string) => {
    setActing(appId);
    try {
      await apiClient.post(`/applications/${appId}/submit-assisted`);
      await load();
    } catch {
      // surfaced on next load; keep UI responsive
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="CAPTCHA Queue"
        description="Applications waiting for manual CAPTCHA or login resolution"
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
      ) : items.length === 0 ? (
        <Card className="border-border/60 shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No CAPTCHAs pending</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              When an application encounters a CAPTCHA or login wall, it will appear here for you to solve.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((app) => (
            <Card key={app.id} className="border-border/60 shadow-soft">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{app.jobTitle ?? 'Application'}</span>
                    <Badge variant="warning" className="shrink-0">{STATUS_LABEL[app.status] ?? app.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {app.companyName ?? ''}{app.failureReason ? ` — ${app.failureReason}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/applications/${app.id}`)}>
                    Details
                  </Button>
                  <Button size="sm" onClick={() => solve(app.id)} disabled={acting === app.id}
                    title="Open the apply form in Chrome to solve the challenge and submit">
                    {acting === app.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                    Solve in browser
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
