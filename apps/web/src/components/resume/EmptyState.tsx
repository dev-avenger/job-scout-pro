import { User } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center space-y-4 py-16 animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Select or create a profile</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose a profile from the sidebar to view its details, or create a new one to
            get started.
          </p>
        </div>
      </div>
    </div>
  );
}
