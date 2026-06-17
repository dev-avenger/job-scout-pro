import { useState } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  PAKISTANI_COMPANIES,
  INTERNATIONAL_COMPANIES,
  type WatchlistEntry,
  type IntlTag,
} from '../data/watchlist-catalog';

const INTL_FILTERS: Array<{ value: IntlTag | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'remote', label: 'Remote-first' },
  { value: 'visa-sponsor', label: 'Visa sponsors' },
];

function SuggestionChip({
  entry,
  onAdd,
  disabled,
}: {
  entry: WatchlistEntry;
  onAdd: (entry: WatchlistEntry) => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => onAdd(entry)}
      disabled={disabled}
      title={[entry.city, entry.country].filter(Boolean).join(', ')}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-accent hover:text-accent-foreground"
    >
      <Plus className="h-3 w-3" />
      {entry.company}
      {entry.city && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5" />
          {entry.city}
        </span>
      )}
    </button>
  );
}

export function WatchlistSuggestions({
  watchlist,
  saving,
  onAdd,
}: {
  watchlist: WatchlistEntry[];
  saving: boolean;
  onAdd: (entry: WatchlistEntry) => void;
}) {
  const [intlFilter, setIntlFilter] = useState<IntlTag | 'all'>('all');

  const watched = new Set(watchlist.map((w) => w.company.toLowerCase()));
  const pkSuggestions = PAKISTANI_COMPANIES.filter((s) => !watched.has(s.company.toLowerCase()));
  const intlSuggestions = INTERNATIONAL_COMPANIES.filter(
    (s) =>
      !watched.has(s.company.toLowerCase()) &&
      (intlFilter === 'all' || s.tags.includes(intlFilter)),
  );

  return (
    <div className="space-y-5">
      {pkSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pakistani companies — verified job boards
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pkSuggestions.map((s) => (
              <SuggestionChip key={s.company} entry={s} onAdd={onAdd} disabled={saving} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            International companies
          </p>
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
            {INTL_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setIntlFilter(f.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  intlFilter === f.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {intlSuggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Everything matching this filter is already on your watchlist.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {intlSuggestions.map((s) => (
              <SuggestionChip key={s.company} entry={s} onAdd={onAdd} disabled={saving} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground/70">
          Visa-sponsor and remote tags are reputation-based — always confirm on the specific role.
        </p>
      </div>
    </div>
  );
}
