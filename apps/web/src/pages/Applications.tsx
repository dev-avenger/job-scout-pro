import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  List,
  LayoutGrid,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApplicationStatus =
  | 'queued'
  | 'in_progress'
  | 'form_filling'
  | 'review_needed'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'withdrawn';

interface Application {
  id: string;
  jobId: string;
  jobTitle?: string | null;
  companyName?: string | null;
  jobLocation?: string | null;
  status: ApplicationStatus;
  autonomyMode: string;
  retryCount: number;
  failureReason: string | null;
  createdAt: string;
  submittedAt: string | null;
}

interface PaginatedResponse {
  items: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface KanbanColumn {
  status: string;
  items: Application[];
}

interface KanbanResponse {
  columns: KanbanColumn[];
}

type TabKey = 'all' | 'review' | 'failed' | 'kanban';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20;

const ALL_STATUSES: ApplicationStatus[] = [
  'queued',
  'in_progress',
  'form_filling',
  'review_needed',
  'submitted',
  'confirmed',
  'failed',
  'withdrawn',
];

interface StatusMeta {
  label: string;
  /** Dark-aware tinted badge classes. */
  badge: string;
  /** Solid dot color. */
  dot: string;
}

const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  queued: {
    label: 'Queued',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  form_filling: {
    label: 'Form Filling',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  review_needed: {
    label: 'Review Needed',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  submitted: {
    label: 'Submitted',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  confirmed: {
    label: 'Confirmed',
    badge: 'bg-green-500/10 text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  failed: {
    label: 'Failed',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  withdrawn: {
    label: 'Withdrawn',
    badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-500',
  },
};

const FALLBACK_META: StatusMeta = {
  label: 'Unknown',
  badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  dot: 'bg-zinc-500',
};

function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status as ApplicationStatus] ?? { ...FALLBACK_META, label: status };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

function avatarLetter(app: Application): string {
  const source = app.companyName || app.jobTitle || app.jobId || app.id;
  return (source.charAt(0) || 'A').toUpperCase();
}

function appTitle(app: Application): string {
  return app.jobTitle || `Job ${truncateId(app.jobId)}`;
}

function appSubtitle(app: Application): string | null {
  const parts = [app.companyName, app.jobLocation].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ---------------------------------------------------------------------------
// Status badge (dot + tinted pill)
// ---------------------------------------------------------------------------

function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sortable Kanban Card
// ---------------------------------------------------------------------------

function SortableKanbanCard({
  app,
  overlay = false,
}: {
  app: Application;
  overlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        'space-y-1.5 rounded-lg border border-border/60 bg-card p-3 shadow-soft transition-shadow',
        'cursor-grab touch-none active:cursor-grabbing hover:shadow-lifted',
        overlay && 'rotate-2 shadow-lifted',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium leading-snug" title={app.jobTitle ?? app.jobId}>
          {appTitle(app)}
        </p>
        <StatusBadge status={app.status} />
      </div>

      <p className="truncate text-xs text-muted-foreground" title={appSubtitle(app) ?? app.id}>
        {appSubtitle(app) ?? truncateId(app.id)}
        {app.autonomyMode ? ` · ${app.autonomyMode}` : ''}
      </p>

      {app.failureReason && (
        <p
          className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400"
          title={app.failureReason}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="truncate">{app.failureReason}</span>
        </p>
      )}

      <div className="flex items-center justify-between pt-0.5 text-[11px] tabular-nums text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatShortDate(app.createdAt)}
        </span>
        {app.retryCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <RotateCcw className="h-3 w-3" />
            {app.retryCount}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------

function KanbanColumnComponent({
  status,
  items,
}: {
  status: string;
  items: Application[];
}) {
  const meta = getStatusMeta(status);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <div className="flex w-72 min-w-[17rem] shrink-0 flex-col rounded-xl border border-border/40 bg-muted/40 p-3">
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
        <h3 className="truncate text-sm font-semibold">{meta.label}</h3>
        <span className="ml-auto rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="min-h-[200px] flex-1 space-y-2">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((app) => (
            <SortableKanbanCard key={app.id} app={app} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
            No items
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Applications() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // All-tab state (paginated)
  const [applications, setApplications] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Review queue state
  const [reviewQueue, setReviewQueue] = useState<Application[]>([]);

  // Dead-letter state
  const [deadLetter, setDeadLetter] = useState<Application[]>([]);

  // Kanban state
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [activeDragApp, setActiveDragApp] = useState<Application | null>(null);

  // Filter bar state (All tab)
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Multi-select state (All tab)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // -------------------------------------------------------------------------
  // Filtered applications for "All" tab
  // -------------------------------------------------------------------------

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (filterStatus !== '__all__') {
      filtered = filtered.filter((app) => app.status === filterStatus);
    }

    if (filterSearch.trim()) {
      const term = filterSearch.trim().toLowerCase();
      filtered = filtered.filter((app) => app.id.toLowerCase().includes(term));
    }

    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      filtered = filtered.filter((app) => new Date(app.createdAt) >= from);
    }

    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((app) => new Date(app.createdAt) <= to);
    }

    return filtered;
  }, [applications, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  // Per-status counts for the filter pill row (current page of data)
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
    }
    return counts;
  }, [applications]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchAll = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const query = `/applications?page=${p}&limit=${PAGE_LIMIT}`;
      const data = await apiClient.get<PaginatedResponse>(query);
      setApplications(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(data.page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReviewQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Application[]>('/applications/review-queue');
      setReviewQueue(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeadLetter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Application[]>('/applications/dead-letter');
      setDeadLetter(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load failed applications');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKanban = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<KanbanResponse>('/applications/kanban');
      setKanbanColumns(data.columns);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load kanban board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAll(page);
    } else if (activeTab === 'review') {
      fetchReviewQueue();
    } else if (activeTab === 'failed') {
      fetchDeadLetter();
    } else if (activeTab === 'kanban') {
      fetchKanban();
    }
  }, [activeTab, page, fetchAll, fetchReviewQueue, fetchDeadLetter, fetchKanban]);

  // Clear selection when leaving the "all" tab or changing pages
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, page]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'retry') => {
    setActionLoading(`${id}-${action}`);
    try {
      await apiClient.post(`/applications/${id}/${action}`);
      if (activeTab === 'all') {
        await fetchAll(page);
      } else if (activeTab === 'review') {
        await fetchReviewQueue();
      } else if (activeTab === 'failed') {
        await fetchDeadLetter();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} application`);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------------------
  // Bulk actions
  // -------------------------------------------------------------------------

  const handleBulkAction = async (action: 'approve' | 'reject' | 'retry') => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setError(null);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        apiClient.post(`/applications/${id}/${action}`),
      );
      await Promise.allSettled(promises);
      setSelectedIds(new Set());
      await fetchAll(page);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to bulk ${action}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredApplications.map((app) => app.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const allSelected =
    filteredApplications.length > 0 &&
    filteredApplications.every((app) => selectedIds.has(app.id));

  const someSelected = selectedIds.size > 0 && !allSelected;

  // -------------------------------------------------------------------------
  // Kanban drag handlers
  // -------------------------------------------------------------------------

  const findColumnByItemId = (
    itemId: string,
    cols: KanbanColumn[],
  ): KanbanColumn | undefined => {
    return cols.find((col) => col.items.some((item) => item.id === itemId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const col = findColumnByItemId(active.id as string, kanbanColumns);
    const app = col?.items.find((item) => item.id === active.id);
    setActiveDragApp(app ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumnByItemId(activeId, kanbanColumns);
    let destCol = findColumnByItemId(overId, kanbanColumns);

    // If hovering over a column id (the status string) rather than an item
    if (!destCol) {
      destCol = kanbanColumns.find((col) => col.status === overId);
    }

    if (!sourceCol || !destCol || sourceCol.status === destCol.status) return;

    setKanbanColumns((prev) => {
      const newCols = prev.map((col) => ({ ...col, items: [...col.items] }));
      const srcIdx = newCols.findIndex((c) => c.status === sourceCol.status);
      const dstIdx = newCols.findIndex((c) => c.status === destCol!.status);

      const srcCol = newCols[srcIdx];
      const dstCol = newCols[dstIdx];
      if (!srcCol || !dstCol) return prev;

      const itemIdx = srcCol.items.findIndex((i) => i.id === activeId);
      if (itemIdx === -1) return prev;

      const movedItem = srcCol.items[itemIdx];
      if (!movedItem) return prev;
      srcCol.items.splice(itemIdx, 1);
      movedItem.status = destCol!.status as ApplicationStatus;

      // Find the position to insert at
      const overItemIdx = dstCol.items.findIndex((i) => i.id === overId);
      if (overItemIdx >= 0) {
        dstCol.items.splice(overItemIdx, 0, movedItem);
      } else {
        dstCol.items.push(movedItem);
      }

      return newCols;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragApp(null);

    if (!over) return;

    const activeId = active.id as string;
    const destCol = findColumnByItemId(activeId, kanbanColumns);

    if (!destCol) return;

    const newStatus = destCol.status as ApplicationStatus;

    try {
      await apiClient.put(`/applications/${activeId}/status`, { status: newStatus });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      // Re-fetch on error to revert optimistic update
      await fetchKanban();
    }
  };

  // -------------------------------------------------------------------------
  // Tab switching
  // -------------------------------------------------------------------------

  const handleTabChange = (value: string) => {
    const tab = value as TabKey;
    setActiveTab(tab);
    setError(null);
    if (tab === 'all') {
      setPage(1);
    }
  };

  const selectStatusPill = (status: string) => {
    if (activeTab !== 'all') {
      handleTabChange('all');
    }
    setFilterStatus(status);
  };

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  function buildPageNumbers(): (number | '...')[] {
    const pages: (number | '...')[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  }

  // -------------------------------------------------------------------------
  // Render: List row (Linear-style table row)
  // -------------------------------------------------------------------------

  function renderApplicationRow(app: Application, showCheckbox = false) {
    const isApproveReject = app.status === 'queued' || app.status === 'review_needed';
    const isFailed = app.status === 'failed';
    const isSelected = selectedIds.has(app.id);

    return (
      <div
        key={app.id}
        className={cn(
          'flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50',
          isSelected && 'bg-primary/5',
        )}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelectId(app.id)}
            aria-label="Select application"
            className="shrink-0"
          />
        )}

        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
          {avatarLetter(app)}
        </div>

        {/* Title + meta — opens the detail/review page */}
        <div className="min-w-0 flex-1">
          <Link
            to={`/applications/${app.id}`}
            className="truncate block text-sm font-medium hover:text-primary hover:underline underline-offset-2"
            title={app.jobTitle ?? app.jobId}
          >
            {appTitle(app)}
          </Link>
          <p className="truncate text-xs text-muted-foreground" title={appSubtitle(app) ?? app.id}>
            {appSubtitle(app) ?? <span className="font-mono">{truncateId(app.id)}</span>}
            {app.autonomyMode ? ` · ${app.autonomyMode}` : ''}
            {app.submittedAt ? ` · submitted ${formatShortDate(app.submittedAt)}` : ''}
          </p>
          {app.failureReason && (
            <p
              className="mt-0.5 flex items-center gap-1 truncate text-xs text-red-600 dark:text-red-400"
              title={app.failureReason}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{app.failureReason}</span>
            </p>
          )}
        </div>

        {/* Right-aligned meta + actions */}
        <div className="flex shrink-0 items-center gap-3">
          {app.retryCount > 0 && (
            <span className="hidden items-center gap-1 text-xs tabular-nums text-amber-600 dark:text-amber-400 sm:inline-flex">
              <RotateCcw className="h-3 w-3" />
              {app.retryCount}
            </span>
          )}

          <StatusBadge status={app.status} />

          <span
            className="hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground md:inline"
            title={formatDate(app.createdAt)}
          >
            {formatShortDate(app.createdAt)}
          </span>

          {isApproveReject && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="default"
                className="h-8"
                disabled={actionLoading === `${app.id}-approve`}
                onClick={() => handleAction(app.id, 'approve')}
              >
                {actionLoading === `${app.id}-approve` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={actionLoading === `${app.id}-reject`}
                onClick={() => handleAction(app.id, 'reject')}
              >
                {actionLoading === `${app.id}-reject` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                Reject
              </Button>
            </div>
          )}
          {isFailed && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
              disabled={actionLoading === `${app.id}-retry`}
              onClick={() => handleAction(app.id, 'retry')}
            >
              {actionLoading === `${app.id}-retry` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Retry
            </Button>
          )}

          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Empty states
  // -------------------------------------------------------------------------

  function renderEmptyState(
    icon: ReactNode,
    title: string,
    description: string,
    action?: ReactNode,
  ) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border px-4 py-16">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          {icon}
        </div>
        <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-center text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Loading
  // -------------------------------------------------------------------------

  function renderLoading() {
    return (
      <div className="space-y-2 pt-1" aria-busy="true" aria-label="Loading applications">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Pagination
  // -------------------------------------------------------------------------

  function renderPagination() {
    if (totalPages <= 1) return null;

    const pages = buildPageNumbers();
    const start = (page - 1) * PAGE_LIMIT + 1;
    const end = Math.min(page * PAGE_LIMIT, total);

    return (
      <div className="flex flex-col items-center gap-2 pt-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((p, idx) =>
            p === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className="select-none px-2 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  'min-w-[36px] tabular-nums',
                  p === page &&
                    'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                )}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          Showing {start}-{end} of {total}
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Status filter pill row
  // -------------------------------------------------------------------------

  function renderStatusPills() {
    const pillBase =
      'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors';
    const pillActive = 'bg-primary text-primary-foreground shadow-sm';
    const pillInactive = 'bg-muted/60 text-muted-foreground hover:bg-muted';

    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
        <button
          type="button"
          className={cn(
            pillBase,
            activeTab === 'all' && filterStatus === '__all__' ? pillActive : pillInactive,
          )}
          onClick={() => selectStatusPill('__all__')}
        >
          All{' '}
          <span
            className={cn(
              'tabular-nums',
              activeTab === 'all' && filterStatus === '__all__'
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground',
            )}
          >
            {total}
          </span>
        </button>

        {ALL_STATUSES.map((s) => {
          const isActive = activeTab === 'all' && filterStatus === s;
          return (
            <button
              key={s}
              type="button"
              className={cn(pillBase, isActive ? pillActive : pillInactive)}
              onClick={() => selectStatusPill(s)}
            >
              {STATUS_META[s].label}{' '}
              <span
                className={cn(
                  'tabular-nums',
                  isActive ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                {statusCounts.get(s) ?? 0}
              </span>
            </button>
          );
        })}

        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <button
          type="button"
          className={cn(pillBase, activeTab === 'review' ? pillActive : pillInactive)}
          onClick={() => handleTabChange('review')}
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Review queue
          </span>
        </button>
        <button
          type="button"
          className={cn(pillBase, activeTab === 'failed' ? pillActive : pillInactive)}
          onClick={() => handleTabChange('failed')}
        >
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Dead letter
          </span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Search + date filter toolbar (All tab)
  // -------------------------------------------------------------------------

  function renderFilterToolbar() {
    const hasFilters =
      filterStatus !== '__all__' || filterSearch || filterDateFrom || filterDateTo;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by ID..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-9 w-[200px] pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="From date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-9 w-[148px]"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-9 w-[148px]"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => {
              setFilterStatus('__all__');
              setFilterSearch('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Bulk action bar
  // -------------------------------------------------------------------------

  function renderBulkActionBar() {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 transition-colors',
          selectedIds.size > 0
            ? 'border border-primary/20 bg-primary/5'
            : 'border border-transparent',
        )}
      >
        <div className="flex items-center gap-2.5">
          <Checkbox
            checked={allSelected}
            // @ts-expect-error -- Radix CheckedState includes 'indeterminate'
            indeterminate={someSelected}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
          />
          <span className="text-sm tabular-nums text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </span>
        </div>

        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-8"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('approve')}
            >
              {bulkLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('reject')}
            >
              {bulkLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Reject
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('retry')}
            >
              {bulkLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Application list (single card with divided rows)
  // -------------------------------------------------------------------------

  function renderApplicationList(apps: Application[], showCheckbox = false) {
    return (
      <Card className="divide-y divide-border/60 overflow-hidden rounded-xl border-border/60 shadow-soft">
        {apps.map((app) => renderApplicationRow(app, showCheckbox))}
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Kanban board
  // -------------------------------------------------------------------------

  function renderKanbanBoard() {
    if (loading) return renderLoading();

    if (kanbanColumns.length === 0) {
      return renderEmptyState(
        <LayoutGrid className="h-6 w-6 text-muted-foreground" />,
        'No board data',
        'There are no applications to display on the board.',
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-4">
          {kanbanColumns.map((col) => (
            <SortableContext
              key={col.status}
              id={col.status}
              items={[col.status, ...col.items.map((i) => i.id)]}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumnComponent
                status={col.status}
                items={col.items}
              />
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeDragApp ? (
            <SortableKanbanCard app={activeDragApp} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  // -------------------------------------------------------------------------
  // Render: List view body (all / review / failed scopes)
  // -------------------------------------------------------------------------

  function renderListView() {
    if (activeTab === 'review') {
      return loading
        ? renderLoading()
        : reviewQueue.length === 0
          ? renderEmptyState(
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
              'All caught up!',
              'No applications are waiting for your review. Check back later.',
            )
          : renderApplicationList(reviewQueue);
    }

    if (activeTab === 'failed') {
      return loading
        ? renderLoading()
        : deadLetter.length === 0
          ? renderEmptyState(
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
              'No failures',
              'No failed applications in the dead-letter queue. Everything is running smoothly.',
            )
          : renderApplicationList(deadLetter);
    }

    // "All" scope
    return (
      <div className="space-y-3">
        {renderFilterToolbar()}

        {!loading && filteredApplications.length > 0 && renderBulkActionBar()}

        {loading ? (
          renderLoading()
        ) : filteredApplications.length === 0 ? (
          applications.length === 0 ? (
            renderEmptyState(
              <Inbox className="h-6 w-6 text-muted-foreground" />,
              'No applications yet',
              'Start applying to jobs and your applications will be tracked here automatically.',
              <Button variant="outline" asChild>
                <Link to="/jobs/queue">Browse job queue</Link>
              </Button>,
            )
          ) : (
            renderEmptyState(
              <Search className="h-6 w-6 text-muted-foreground" />,
              'No matching applications',
              'Try adjusting your filters to find what you are looking for.',
            )
          )
        ) : (
          <div className="space-y-4">
            {renderApplicationList(filteredApplications, true)}
            {renderPagination()}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  const isBoardView = activeTab === 'kanban';

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6 lg:p-8">
      {/* Header with view toggle */}
      <PageHeader
        title="Applications"
        description={`Track and manage ${total.toLocaleString()} job ${
          total === 1 ? 'application' : 'applications'
        } across every stage.`}
        actions={
          <div className="flex items-center rounded-lg bg-muted/60 p-1">
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                !isBoardView
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                if (isBoardView) handleTabChange('all');
              }}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isBoardView
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                if (!isBoardView) handleTabChange('kanban');
              }}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
          </div>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive/80"
              onClick={() => setError(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Status filter pills (list view only) */}
      {!isBoardView && renderStatusPills()}

      {/* Body */}
      {isBoardView ? renderKanbanBoard() : renderListView()}
    </div>
  );
}
