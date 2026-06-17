import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { Mail, RefreshCw, Inbox as InboxIcon, ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../api/client';

interface InboxEmail {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  bodyPreview: string | null;
  classification: string | null;
  classificationConfidence: number | null;
  applicationId: string | null;
  createdAt: string;
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  interview: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  offer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rejection: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  recruiter: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  acknowledgement: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

const FILTERS = ['all', 'interview', 'offer', 'rejection', 'recruiter', 'acknowledgement'] as const;
type Filter = (typeof FILTERS)[number];

function classificationBadge(classification: string | null, confidence: number | null) {
  if (!classification) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs capitalize',
        CLASSIFICATION_STYLES[classification] ?? 'bg-muted text-muted-foreground border-border/60',
      )}
    >
      {classification}
      {confidence != null && ` · ${Math.round(confidence * 100)}%`}
    </Badge>
  );
}

export function Inbox() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<InboxEmail[]>('/inbox');
      setEmails(Array.isArray(data) ? data : []);
    } catch (err) {
      setStatus({
        message: err instanceof Error ? err.message : 'Could not load inbox.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleScan = async () => {
    setScanning(true);
    setStatus(null);
    try {
      await apiClient.post('/inbox/scan');
      setStatus({
        message: 'Inbox scan queued — new emails will appear here once the agent finishes.',
        variant: 'success',
      });
    } catch (err) {
      setStatus({
        message: err instanceof Error ? err.message : 'Could not start the inbox scan.',
        variant: 'error',
      });
    } finally {
      setScanning(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: emails.length };
    for (const e of emails) {
      if (e.classification) c[e.classification] = (c[e.classification] ?? 0) + 1;
    }
    return c;
  }, [emails]);

  const visible = useMemo(
    () => (filter === 'all' ? emails : emails.filter((e) => e.classification === filter)),
    [emails, filter],
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Inbox"
        description="Emails fetched from your mailbox and classified by the agent — interviews, offers, rejections, and recruiter outreach for jobs you've applied to."
        actions={
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Scan Inbox
          </Button>
        }
      />

      {status && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            status.variant === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
          )}
        >
          {status.message}
        </div>
      )}

      {/* Classification filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = counts[f] ?? 0;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/50',
              )}
            >
              {f === 'all' ? 'All' : f}
              <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-border/60 shadow-soft">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <InboxIcon className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {emails.length === 0 ? 'No scanned emails yet' : `No ${filter} emails`}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {emails.length === 0
                ? 'Connect your mailbox in Settings → Email, then click Scan Inbox to classify replies from employers.'
                : 'Try a different filter, or scan your inbox for new mail.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((email) => (
            <Card key={email.id} className="border-border/60 shadow-soft transition-colors hover:bg-muted/40">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {email.subject || '(no subject)'}
                    </span>
                    {classificationBadge(email.classification, email.classificationConfidence)}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{email.fromAddress}</p>
                  {email.bodyPreview && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                      {email.bodyPreview}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {new Date(email.createdAt).toLocaleString()}
                    </span>
                    {email.applicationId && (
                      <Link
                        to={`/applications/${email.applicationId}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        View application
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
