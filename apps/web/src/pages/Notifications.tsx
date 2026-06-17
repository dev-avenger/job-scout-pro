import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { Bell, CheckCheck, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiClient } from '../api/client';

interface InboxEmail {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  bodyPreview: string | null;
  classification: string | null;
  classificationConfidence: number | null;
  createdAt: string;
}

const CLASSIFICATION_STYLES: Record<string, string> = {
  interview: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  offer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rejection: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  recruiter: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  acknowledgement: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

const DEFAULT_PRIORITY_STYLE = {
  badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  dot: 'bg-blue-500',
};

const PRIORITY_STYLES: Record<string, { badge: string; dot: string }> = {
  urgent: {
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
  high: {
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    dot: 'bg-orange-500',
  },
  normal: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  low: {
    badge: 'bg-muted text-muted-foreground border-border/60',
    dot: 'bg-muted-foreground',
  },
};

export function Notifications() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [emails, setEmails] = useState<InboxEmail[]>([]);

  useEffect(() => {
    apiClient
      .get<InboxEmail[]>('/inbox')
      .then((data) => setEmails(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'Stay on top of updates from your job search agent'
        }
        actions={
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        }
      />

      <div className="space-y-3">
        {notifications.length === 0 && (
          <Card className="border-border/60 shadow-soft">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Bell className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No notifications yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Updates about applications, interviews, and agent activity will show up here.
              </p>
            </div>
          </Card>
        )}
        {notifications.map((notif) => {
          const priority = PRIORITY_STYLES[notif.priority] ?? DEFAULT_PRIORITY_STYLE;
          return (
            <Card
              key={notif.id}
              className={cn(
                'flex cursor-pointer items-start gap-4 border-border/60 p-4 shadow-soft transition-colors hover:bg-muted/50',
                !notif.read && 'border-l-4 border-l-primary',
              )}
              onClick={() => !notif.read && markAsRead(notif.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-sm',
                      notif.read ? 'font-medium text-muted-foreground' : 'font-semibold text-foreground',
                    )}
                  >
                    {notif.title}
                  </span>
                  <Badge variant="outline" className={cn('gap-1.5 text-xs capitalize', priority.badge)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
                    {notif.priority}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notif.body}</p>
                <p className="mt-2 text-xs text-muted-foreground/80 tabular-nums">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
              {!notif.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </Card>
          );
        })}
      </div>

      {/* Inbox scan findings */}
      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Inbox Scan Findings</CardTitle>
              <CardDescription>
                Emails fetched from your mailbox and classified by the agent.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No scanned emails yet — connect your mailbox in Settings → Email and run Scan
              Inbox from the Dashboard.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {emails.map((email) => (
                <div key={email.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {email.subject || '(no subject)'}
                      </span>
                      {email.classification && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs capitalize',
                            CLASSIFICATION_STYLES[email.classification] ??
                              'bg-muted text-muted-foreground border-border/60',
                          )}
                        >
                          {email.classification}
                          {email.classificationConfidence != null &&
                            ` · ${Math.round(email.classificationConfidence * 100)}%`}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{email.fromAddress}</p>
                    {email.bodyPreview && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                        {email.bodyPreview}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/60 tabular-nums">
                      {new Date(email.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
