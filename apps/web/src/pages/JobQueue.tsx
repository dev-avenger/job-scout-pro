import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/select';
import { apiClient } from '../api/client';
import {
  Search,
  Plus,
  Trash2,
  ExternalLink,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Send,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  locationType: string;
  sourceChannel: string;
  validationStatus: 'valid' | 'pending' | 'invalid' | 'expired';
  createdAt: string;
  salaryMin?: number;
  salaryMax?: string;
  description?: string;
  requiredSkills?: string[];
  sourceUrl?: string;
}

interface JobsResponse {
  items: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type SortOption = 'newest' | 'oldest' | 'company-az' | 'company-za';
type StatusFilter = 'all' | 'valid' | 'pending' | 'invalid' | 'expired';

const STATUS_VARIANT: Record<
  Job['validationStatus'],
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  valid: 'success',
  pending: 'warning',
  invalid: 'destructive',
  expired: 'secondary',
};

const STATUS_LABEL: Record<Job['validationStatus'], string> = {
  valid: 'Valid',
  pending: 'Pending',
  invalid: 'Invalid',
  expired: 'Expired',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSalary(min?: number, max?: string): string | null {
  if (min == null && max == null) return null;
  const parts: string[] = [];
  if (min != null) parts.push(`$${min.toLocaleString()}`);
  if (max != null) parts.push(`$${max}`);
  return parts.join(' - ');
}

/* ------------------------------------------------------------------ */
/*  Toast component (lightweight inline toast)                         */
/* ------------------------------------------------------------------ */

function Toast({
  message,
  variant = 'success',
  onDismiss,
}: {
  message: string;
  variant?: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300',
        variant === 'success'
          ? 'bg-emerald-600 text-white'
          : 'bg-destructive text-destructive-foreground',
      )}
    >
      {message}
      <button
        onClick={onDismiss}
        className="ml-1 rounded-md p-0.5 opacity-70 hover:opacity-100 transition-opacity"
      >
        &times;
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function JobQueue() {
  /* ---- data state ---- */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- UI state ---- */
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);
  const [runningSearch, setRunningSearch] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  /* ---- sort & filter state ---- */
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  /* ---- derived: unique sources ---- */
  const uniqueSources = useMemo(() => {
    const sources = new Set(jobs.map((j) => j.sourceChannel));
    return Array.from(sources).sort();
  }, [jobs]);

  /* ---- derived: filtered & sorted jobs ---- */
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((j) => j.validationStatus === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter((j) => j.sourceChannel === sourceFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'company-az':
          return a.companyName.localeCompare(b.companyName);
        case 'company-za':
          return b.companyName.localeCompare(a.companyName);
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, sortBy, statusFilter, sourceFilter]);

  /* ---- data fetching ---- */
  const fetchJobs = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<JobsResponse>(`/jobs?page=${pageNum}&limit=20`);
      setJobs(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(page);
  }, [fetchJobs, page]);

  /* ---- actions ---- */
  const handleRunSearch = async () => {
    setRunningSearch(true);
    try {
      await apiClient.post('/jobs/search/run');
      setToast({ message: 'Job search started successfully', variant: 'success' });
      await fetchJobs(1);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Search failed',
        variant: 'error',
      });
    } finally {
      setRunningSearch(false);
    }
  };

  const handleAddUrl = async () => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;

    setSubmittingUrl(true);
    try {
      await apiClient.post('/jobs/url', { url: trimmed });
      setUrlValue('');
      setShowUrlInput(false);
      setToast({ message: 'Job URL added successfully', variant: 'success' });
      await fetchJobs(1);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to add URL',
        variant: 'error',
      });
    } finally {
      setSubmittingUrl(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await apiClient.delete(`/jobs/${id}`);
      setToast({ message: 'Job removed from queue', variant: 'success' });
      await fetchJobs(page);
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete job',
        variant: 'error',
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleApply = async (jobId: string) => {
    setApplyingIds((prev) => new Set(prev).add(jobId));
    try {
      await apiClient.post('/applications', { jobId });
      setToast({ message: 'Application submitted successfully', variant: 'success' });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to submit application',
        variant: 'error',
      });
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Queue</h1>
          {!loading && (
            <p className="mt-1 text-sm text-muted-foreground">
              {total} job{total !== 1 ? 's' : ''} in queue
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleRunSearch} disabled={runningSearch}>
            {runningSearch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {runningSearch ? 'Running...' : 'Run Search'}
          </Button>
          <Button
            variant={showUrlInput ? 'secondary' : 'outline'}
            onClick={() => {
              setShowUrlInput(!showUrlInput);
              setUrlValue('');
            }}
          >
            {showUrlInput ? (
              'Cancel'
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add URL
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---------- Add-URL expandable card ---------- */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          showUrlInput ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Add job by URL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddUrl();
                  }}
                  placeholder="https://example.com/job/..."
                  disabled={submittingUrl}
                  autoFocus={showUrlInput}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddUrl}
                  disabled={submittingUrl || !urlValue.trim()}
                  size="default"
                >
                  {submittingUrl ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------- Sort & Filter Controls ---------- */}
      {!loading && jobs.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>

            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="company-az">Company A-Z</SelectItem>
                <SelectItem value="company-za">Company Z-A</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Source filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filter count */}
            {(statusFilter !== 'all' || sourceFilter !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSourceFilter('all');
                }}
                className="ml-auto text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------- Error banner ---------- */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---------- Loading state ---------- */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading jobs...</p>
        </div>
      )}

      {/* ---------- Empty state ---------- */}
      {!loading && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-base font-semibold">No jobs found</h3>
          <p className="mt-1.5 max-w-sm text-center text-sm text-muted-foreground">
            Run a search or paste a job URL to start building your queue.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <Button size="sm" onClick={handleRunSearch} disabled={runningSearch}>
              <Search className="h-4 w-4" />
              Run Search
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowUrlInput(true);
                setUrlValue('');
              }}
            >
              <Plus className="h-4 w-4" />
              Add URL
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Filtered empty state ---------- */}
      {!loading && jobs.length > 0 && filteredJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No matching jobs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your filters to see more results.
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setSourceFilter('all');
            }}
            className="mt-3 text-sm text-primary underline hover:no-underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ---------- Job list ---------- */}
      {!loading && filteredJobs.length > 0 && (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isExpanded = expandedIds.has(job.id);
            const salary = formatSalary(job.salaryMin, job.salaryMax);
            const hasDetails = salary || job.description || job.requiredSkills?.length || job.sourceUrl;

            return (
              <Card
                key={job.id}
                className={cn(
                  'transition-all duration-200 hover:shadow-md',
                  deletingIds.has(job.id) && 'opacity-50 pointer-events-none',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left side: job info */}
                    <div
                      className={cn(
                        'min-w-0 flex-1 space-y-1',
                        hasDetails && 'cursor-pointer',
                      )}
                      onClick={() => hasDetails && toggleExpanded(job.id)}
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold leading-snug">{job.title}</p>
                        {hasDetails && (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{job.companyName}</p>
                      {job.location && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {job.location}
                            {job.locationType ? ` \u00B7 ${job.locationType}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right side: meta + actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {job.sourceChannel}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[job.validationStatus]} className="shrink-0">
                        {STATUS_LABEL[job.validationStatus]}
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(job.createdAt)}
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => handleApply(job.id)}
                        disabled={applyingIds.has(job.id)}
                      >
                        {applyingIds.has(job.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {applyingIds.has(job.id) ? 'Applying...' : 'Apply'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(job.id)}
                        disabled={deletingIds.has(job.id)}
                      >
                        {deletingIds.has(job.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ---------- Expandable details section ---------- */}
                  <div
                    className={cn(
                      'grid transition-all duration-300 ease-in-out',
                      isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      {hasDetails && (
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                          {/* Salary range */}
                          {salary && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Salary Range
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-emerald-600">
                                {salary}
                              </p>
                            </div>
                          )}

                          {/* Description preview */}
                          {job.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Description
                              </p>
                              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-3">
                                {job.description}
                              </p>
                            </div>
                          )}

                          {/* Required skills */}
                          {job.requiredSkills && job.requiredSkills.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Required Skills
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {job.requiredSkills.map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Posted date */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Posted Date
                            </p>
                            <p className="mt-0.5 text-sm">{formatDate(job.createdAt)}</p>
                          </div>

                          {/* Source URL */}
                          {job.sourceUrl && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Source URL
                              </p>
                              <a
                                href={job.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View original posting
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---------- Pagination ---------- */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page{' '}
            <span className="font-medium text-foreground">{page}</span>
            {' '}of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ---------- Toast ---------- */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
