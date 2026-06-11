import { cn } from '../lib/utils';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: string;
}

export function ActivityFeed({ items, className }: { items: ActivityItem[]; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
