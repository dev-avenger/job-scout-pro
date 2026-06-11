import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScoreCard } from '../components/ScoreCard';
import { apiClient } from '../api/client';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Briefcase,
  Building2,
  MapPin,
  AlertTriangle,
  FileText,
  Mail,
  BarChart3,
  MessageSquare,
  History,
  Shield,
  Eye,
  Ban,
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

interface ApplicationData {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  autonomyMode: string;
  retryCount: number;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  job: {
    title: string;
    company: string;
    location: string;
    url?: string;
  };
  scores: {
    relevance: number;
    ats: number;
    scam: number;
  } | null;
  documents: {
    resumeText: string | null;
    coverLetterText: string | null;
  } | null;
  formAnswers: Array<{
    fieldLabel: string;
    answer: string;
  }>;
  emails: Array<{
    id: string;
    from: string;
    subject: string;
    date: string;
    classification: string;
  }>;
  companyBrief: {
    description: string;
    size: string;
    industry: string;
    glassdoorScore: number | null;
    cultureScore: number | null;
    growthScore: number | null;
  } | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    variant: 'info' | 'warning' | 'success' | 'destructive' | 'secondary';
    label: string;
  }
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

function getScoreBarColor(score: number, invert = false): string {
  const effective = invert ? 100 - score : score;
  if (effective >= 80) return 'bg-emerald-500';
  if (effective >= 60) return 'bg-yellow-500';
  if (effective >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'created':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'submitted':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'retry':
      return <RotateCcw className="w-4 h-4 text-amber-500" />;
    case 'withdrawn':
      return <Ban className="w-4 h-4 text-gray-500" />;
    case 'approved':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <History className="w-4 h-4 text-muted-foreground" />;
  }
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 bg-muted animate-pulse rounded-lg" />
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-24 bg-muted animate-pulse rounded-xl" />
      <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
      <div className="h-64 bg-muted animate-pulse rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Bar Component
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  score,
  invert = false,
  description,
}: {
  label: string;
  score: number;
  invert?: boolean;
  description?: string;
}) {
  const displayScore = Math.round(score);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-foreground">{label}</span>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <ScoreCard label="" score={displayScore} />
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            getScoreBarColor(displayScore, invert),
          )}
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const fetchApplication = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApplicationData>(
        `/applications/${id}`,
      );
      setApplication(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load application',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchEvents = useCallback(async () => {
    if (!id) return;
    setEventsLoading(true);
    try {
      const data = await apiClient.get<TimelineEvent[]>(
        `/applications/${id}/events`,
      );
      setEvents(data);
    } catch {
      // Silently fail for events; the main data is still available
    } finally {
      setEventsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchEvents();
    }
  }, [activeTab, fetchEvents]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleAction = async (action: 'approve' | 'reject' | 'retry' | 'withdraw') => {
    if (!id) return;
    setActionLoading(action);
    try {
      await apiClient.post(`/applications/${id}/${action}`);
      await fetchApplication();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} application`,
      );
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------------------
  // Derived State
  // -------------------------------------------------------------------------

  if (loading) return <LoadingSkeleton />;

  if (error && !application) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/applications')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </Button>
        <div className="mt-8 flex flex-col items-center justify-center py-16">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Failed to Load Application
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchApplication}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const statusConfig = STATUS_CONFIG[application.status] ?? {
    variant: 'secondary' as const,
    label: application.status,
  };

  const showApproveReject =
    application.status === 'queued' || application.status === 'review_needed';
  const showRetry = application.status === 'failed';
  const showWithdraw =
    application.status === 'submitted' || application.status === 'confirmed';

  // -------------------------------------------------------------------------
  // Render: Overview Tab
  // -------------------------------------------------------------------------

  function renderOverview() {
    if (!application) return null;
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Job Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Briefcase className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Job Title</p>
                  <p className="text-sm font-medium text-foreground">
                    {application.job.title}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-medium text-foreground">
                    {application.job.company}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium text-foreground">
                    {application.job.location}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Autonomy Mode</p>
                  <Badge variant="outline" className="capitalize mt-0.5">
                    {application.autonomyMode}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">
                  {formatDate(application.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span className="text-foreground">
                  {formatDate(application.submittedAt)}
                </span>
              </div>
            </div>

            {/* Retry count */}
            {application.retryCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <RotateCcw className="w-4 h-4" />
                {application.retryCount}{' '}
                {application.retryCount === 1 ? 'retry' : 'retries'}
              </div>
            )}

            {/* Failure reason */}
            {application.failureReason && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      Failure Reason
                    </p>
                    <p className="text-sm text-destructive/80 mt-0.5">
                      {application.failureReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Scores Tab
  // -------------------------------------------------------------------------

  function renderScores() {
    if (!application?.scores) {
      return (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center py-8">
              <BarChart3 className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No scoring data available for this application.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Application Scores</CardTitle>
          <CardDescription>
            AI-generated scores evaluating this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreBar
            label="Relevance Score"
            score={application.scores.relevance}
            description="How well your profile matches this job"
          />
          <ScoreBar
            label="ATS Score"
            score={application.scores.ats}
            description="Applicant tracking system compatibility"
          />
          <ScoreBar
            label="Scam Score"
            score={application.scores.scam}
            invert
            description="Likelihood this posting is fraudulent (lower is better)"
          />
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Documents Tab
  // -------------------------------------------------------------------------

  function renderDocuments() {
    if (
      !application?.documents?.resumeText &&
      !application?.documents?.coverLetterText
    ) {
      return (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents available for this application.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {application.documents?.resumeText && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resume Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {application.documents.resumeText}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {application.documents?.coverLetterText && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Cover Letter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {application.documents.coverLetterText}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Form Answers Tab
  // -------------------------------------------------------------------------

  function renderFormAnswers() {
    if (!application?.formAnswers || application.formAnswers.length === 0) {
      return (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center py-8">
              <MessageSquare className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No form answers recorded for this application.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Answers</CardTitle>
          <CardDescription>
            Answers the agent filled in on the application form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 w-1/3">
                    Field
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">
                    Answer
                  </th>
                </tr>
              </thead>
              <tbody>
                {application.formAnswers.map((answer, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'border-t',
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                    )}
                  >
                    <td className="p-3 text-sm font-medium text-foreground align-top">
                      {answer.fieldLabel}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {answer.answer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Emails Tab
  // -------------------------------------------------------------------------

  function renderEmails() {
    if (!application?.emails || application.emails.length === 0) {
      return (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center py-8">
              <Mail className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No related emails found for this application.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Emails</CardTitle>
          <CardDescription>
            Emails associated with this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {application.emails.map((email) => (
            <div
              key={email.id}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <Mail className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {email.subject}
                  </p>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {email.classification}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>From: {email.from}</span>
                  <span>{formatDate(email.date)}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Company Brief Tab
  // -------------------------------------------------------------------------

  function renderCompanyBrief() {
    if (!application?.companyBrief) {
      return (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center py-8">
              <Building2 className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No company research data available.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const brief = application.companyBrief;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Brief
          </CardTitle>
          <CardDescription>
            Research data about {application.job.company}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Info grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Industry</p>
              <p className="text-sm font-medium text-foreground">
                {brief.industry}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Company Size</p>
              <p className="text-sm font-medium text-foreground">
                {brief.size}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground leading-relaxed">
              {brief.description}
            </p>
          </div>

          <Separator />

          {/* Scores */}
          <div className="space-y-4">
            {brief.glassdoorScore !== null && (
              <ScoreBar
                label="Glassdoor Score"
                score={brief.glassdoorScore}
                description="Overall employee rating"
              />
            )}
            {brief.cultureScore !== null && (
              <ScoreBar
                label="Culture Score"
                score={brief.cultureScore}
                description="Workplace culture rating"
              />
            )}
            {brief.growthScore !== null && (
              <ScoreBar
                label="Growth Score"
                score={brief.growthScore}
                description="Career growth opportunities"
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Timeline Tab
  // -------------------------------------------------------------------------

  function renderTimeline() {
    if (eventsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading timeline...</p>
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center py-8">
              <History className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No timeline events recorded yet.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline</CardTitle>
          <CardDescription>
            Chronological history of this application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {events.map((event, idx) => (
                <div key={event.id} className="flex items-start gap-4 relative">
                  {/* Dot */}
                  <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-background border-2 border-border shrink-0">
                    {getEventTypeIcon(event.type)}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      'flex-1 min-w-0 pb-4',
                      idx < events.length - 1 && 'border-b border-border/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {event.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Main Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/applications')}
        className="gap-1.5 -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {application.job.title}
            </h1>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {application.job.company}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {application.job.location}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {showApproveReject && (
            <>
              <Button
                size="sm"
                disabled={actionLoading === 'approve'}
                onClick={() => handleAction('approve')}
              >
                {actionLoading === 'approve' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading === 'reject'}
                onClick={() => handleAction('reject')}
              >
                {actionLoading === 'reject' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </Button>
            </>
          )}
          {showRetry && (
            <Button
              size="sm"
              variant="destructive"
              disabled={actionLoading === 'retry'}
              onClick={() => handleAction('retry')}
            >
              {actionLoading === 'retry' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Retry
            </Button>
          )}
          {showWithdraw && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading === 'withdraw'}
              onClick={() => handleAction('withdraw')}
            >
              {actionLoading === 'withdraw' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              Withdraw
            </Button>
          )}
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scores" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Scores
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="form-answers" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Form Answers
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Emails
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <History className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{renderOverview()}</TabsContent>
        <TabsContent value="scores">{renderScores()}</TabsContent>
        <TabsContent value="documents">{renderDocuments()}</TabsContent>
        <TabsContent value="form-answers">{renderFormAnswers()}</TabsContent>
        <TabsContent value="emails">{renderEmails()}</TabsContent>
        <TabsContent value="company">{renderCompanyBrief()}</TabsContent>
        <TabsContent value="timeline">{renderTimeline()}</TabsContent>
      </Tabs>
    </div>
  );
}
