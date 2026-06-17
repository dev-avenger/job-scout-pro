import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * Shared page header so every page opens with the same professional
 * typographic rhythm: title, supporting description, and actions aligned
 * to the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in',
        className,
      )}
    >
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm lg:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
