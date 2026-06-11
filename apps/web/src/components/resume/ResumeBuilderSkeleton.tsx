export function ResumeBuilderSkeleton() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="space-y-2">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-80 animate-pulse rounded-md bg-muted/60" />
      </div>

      <div className="flex gap-6">
        <div className="w-80 shrink-0 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-muted/50"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
          <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
        </div>

        <div className="flex-1">
          <div className="h-72 animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted/60" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted/50"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
