import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { apiClient } from '../api/client';
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
  FileText,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Columns3,
  Search,
  GripVertical,
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

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { variant: 'info' | 'warning' | 'success' | 'destructive' | 'secondary'; label: string }
> = {
  queued: { variant: 'info', label: 'Queued' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  form_filling: { variant: 'warning', label: 'Form Filling' },
  review_needed: { variant: 'warning', label: 'Review Needed' },
  submitted: { variant: 'success', label: 'Submitted' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  failed: { variant: 'destructive', label: 'Failed' },
  withdrawn: { variant: 'secondary', label: 'Withdrawn' },
};

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

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
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

  const config = STATUS_CONFIG[app.status] ?? { variant: 'secondary' as const, label: app.status };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm space-y-2',
        overlay && 'shadow-lg ring-2 ring-primary/30 rotate-2',
      )}
    >
      <div className="flex items-center gap-2">
        {!overlay && (
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <Badge variant={config.variant} className="text-xs">
          {config.label}
        </Badge>
        <span className="font-mono text-xs text-muted-foreground ml-auto" title={app.id}>
          {truncateId(app.id)}
        </span>
      </div>

      {app.autonomyMode && (
        <Badge variant="outline" className="text-xs font-normal">
          {app.autonomyMode}
        </Badge>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDate(app.createdAt)}
      </div>

      {app.failureReason && (
        <div className="text-xs text-destructive flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="truncate">{app.failureReason}</span>
        </div>
      )}

      {app.retryCount > 0 && (
        <div className="text-xs text-amber-600 flex items-center gap-1">
          <RotateCcw className="h-3 w-3" />
          {app.retryCount} {app.retryCount === 1 ? 'retry' : 'retries'}
        </div>
      )}
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
  const config = STATUS_CONFIG[status as ApplicationStatus] ?? {
    variant: 'secondary' as const,
    label: status,
  };

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <div className="flex flex-col w-64 min-w-[16rem] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Badge variant={config.variant}>{config.label}</Badge>
        <span className="text-xs text-muted-foreground font-medium">
          {items.length}
        </span>
      </div>
      <div className="flex-1 bg-muted/40 rounded-lg p-2 space-y-2 min-h-[200px]">
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((app) => (
            <SortableKanbanCard key={app.id} app={app} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
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
  // Render: Application Card
  // -------------------------------------------------------------------------

  function renderApplicationCard(app: Application, showCheckbox = false) {
    const config = STATUS_CONFIG[app.status] ?? { variant: 'secondary' as const, label: app.status };
    const isApproveReject = app.status === 'queued' || app.status === 'review_needed';
    const isFailed = app.status === 'failed';

    return (
      <Card
        key={app.id}
        className={cn(
          'group transition-all duration-200 hover:shadow-md hover:border-primary/20',
          isFailed && 'border-destructive/20',
          selectedIds.has(app.id) && 'ring-2 ring-primary/40 border-primary/30',
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Checkbox + Left section */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showCheckbox && (
                <div className="pt-0.5">
                  <Checkbox
                    checked={selectedIds.has(app.id)}
                    onCheckedChange={() => toggleSelectId(app.id)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Row 1: Status + ID + Autonomy mode */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  <span
                    className="font-mono text-sm text-muted-foreground"
                    title={app.id}
                  >
                    {truncateId(app.id)}
                  </span>
                  {app.autonomyMode && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {app.autonomyMode}
                    </Badge>
                  )}
                </div>

                {/* Row 2: Dates */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Created {formatDate(app.createdAt)}
                  </span>
                  {app.submittedAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Submitted {formatDate(app.submittedAt)}
                    </span>
                  )}
                </div>

                {/* Row 3: Failure reason */}
                {app.failureReason && (
                  <div className="flex items-start gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="truncate" title={app.failureReason}>
                      {app.failureReason}
                    </p>
                  </div>
                )}

                {/* Row 4: Retry count */}
                {app.retryCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-600">
                    <RotateCcw className="h-3.5 w-3.5" />
                    {app.retryCount} {app.retryCount === 1 ? 'retry' : 'retries'}
                  </div>
                )}
              </div>
            </div>

            {/* Right section: Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isApproveReject && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={actionLoading === `${app.id}-approve`}
                    onClick={() => handleAction(app.id, 'approve')}
                  >
                    {actionLoading === `${app.id}-approve` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === `${app.id}-reject`}
                    onClick={() => handleAction(app.id, 'reject')}
                  >
                    {actionLoading === `${app.id}-reject` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </Button>
                </>
              )}
              {isFailed && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actionLoading === `${app.id}-retry`}
                  onClick={() => handleAction(app.id, 'retry')}
                >
                  {actionLoading === `${app.id}-retry` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Empty states
  // -------------------------------------------------------------------------

  function renderEmptyState(icon: ReactNode, title: string, description: string) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-4 mb-4">{icon}</div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Loading
  // -------------------------------------------------------------------------

  function renderLoading() {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading applications...</p>
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
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{start}</span> -{' '}
          <span className="font-medium text-foreground">{end}</span> of{' '}
          <span className="font-medium text-foreground">{total}</span> results
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((p, idx) =>
            p === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-sm text-muted-foreground select-none"
              >
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className="min-w-[36px]"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Filter Bar (All tab)
  // -------------------------------------------------------------------------

  function renderFilterBar() {
    return (
      <div className="flex flex-wrap items-end gap-3 pb-4 border-b mb-4">
        {/* Status filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search by ID */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Search ID</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by ID..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="pl-8 h-9 w-[180px]"
            />
          </div>
        </div>

        {/* Date from */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-9 w-[150px]"
          />
        </div>

        {/* Date to */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-9 w-[150px]"
          />
        </div>

        {/* Clear filters */}
        {(filterStatus !== '__all__' || filterSearch || filterDateFrom || filterDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setFilterStatus('__all__');
              setFilterSearch('');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
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
      <div className="flex items-center gap-3 pb-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            // @ts-expect-error -- Radix CheckedState includes 'indeterminate'
            indeterminate={someSelected}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : 'Select all'}
          </span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-2">
            <Button
              size="sm"
              variant="default"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('approve')}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Bulk Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('reject')}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Bulk Reject
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkLoading}
              onClick={() => handleBulkAction('retry')}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Bulk Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Application list
  // -------------------------------------------------------------------------

  function renderApplicationList(apps: Application[], showCheckbox = false) {
    return (
      <div className="space-y-3">
        {apps.map((app) => renderApplicationCard(app, showCheckbox))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Kanban board
  // -------------------------------------------------------------------------

  function renderKanbanBoard() {
    if (loading) return renderLoading();

    if (kanbanColumns.length === 0) {
      return renderEmptyState(
        <Columns3 className="h-8 w-8 text-muted-foreground" />,
        'No kanban data',
        'There are no applications to display in the kanban board.',
      );
    }

    // Collect all item IDs across all columns for DndContext
    const allColumnIds = kanbanColumns.map((col) => col.status);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
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
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Applications</h1>
            <Badge variant="secondary" className="text-sm">
              {total}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Track and manage your job applications.
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80 shrink-0"
              onClick={() => setError(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Review Queue
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Failed
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <Columns3 className="h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        {/* All tab */}
        <TabsContent value="all">
          {/* Filter bar */}
          {renderFilterBar()}

          {/* Bulk action bar */}
          {!loading && filteredApplications.length > 0 && renderBulkActionBar()}

          {loading ? (
            renderLoading()
          ) : filteredApplications.length === 0 ? (
            applications.length === 0 ? (
              renderEmptyState(
                <Inbox className="h-8 w-8 text-muted-foreground" />,
                'No applications yet',
                'Start applying to jobs to see them here. Your applications will be tracked automatically.',
              )
            ) : (
              renderEmptyState(
                <Search className="h-8 w-8 text-muted-foreground" />,
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
        </TabsContent>

        {/* Review queue tab */}
        <TabsContent value="review">
          {loading ? (
            renderLoading()
          ) : reviewQueue.length === 0 ? (
            renderEmptyState(
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />,
              'All caught up!',
              'No applications are waiting for your review. Check back later.',
            )
          ) : (
            renderApplicationList(reviewQueue)
          )}
        </TabsContent>

        {/* Failed tab */}
        <TabsContent value="failed">
          {loading ? (
            renderLoading()
          ) : deadLetter.length === 0 ? (
            renderEmptyState(
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />,
              'No failures',
              'No failed applications in the dead-letter queue. Everything is running smoothly.',
            )
          ) : (
            renderApplicationList(deadLetter)
          )}
        </TabsContent>

        {/* Kanban tab */}
        <TabsContent value="kanban">
          {renderKanbanBoard()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
