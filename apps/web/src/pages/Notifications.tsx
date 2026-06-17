import { useNotifications } from '../hooks/useNotifications';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '../lib/utils';

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
    </div>
  );
}
