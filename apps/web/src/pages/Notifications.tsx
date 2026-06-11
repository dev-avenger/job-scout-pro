import { useNotifications } from '../hooks/useNotifications';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Notifications() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <Button variant="outline" onClick={markAllAsRead}>
          <CheckCheck className="w-4 h-4 mr-2" />Mark All Read
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </Card>
        )}
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            className={cn('p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/50 transition-colors', !notif.read && 'border-l-4 border-l-primary')}
            onClick={() => !notif.read && markAsRead(notif.id)}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{notif.title}</span>
                <Badge className={cn('text-xs', priorityColors[notif.priority])}>{notif.priority}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{notif.body}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
            </div>
            {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mt-2" />}
          </Card>
        ))}
      </div>
    </div>
  );
}
