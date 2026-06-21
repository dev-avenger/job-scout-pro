import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { PageHeader } from '../components/PageHeader';
import { apiClient } from '../api/client';
import { UserCheck, Brain, Sparkles, Loader2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface InterviewApp {
  id: string;
  jobTitle?: string | null;
  companyName?: string | null;
  jobLocation?: string | null;
}

interface PaginatedResponse {
  items: InterviewApp[];
}

interface PrepQuestion {
  question: string;
  category: string;
  difficulty: string;
  suggestedAnswer: string;
  tips?: string;
}

interface InterviewPrepResult {
  technicalQuestions: PrepQuestion[];
  behavioralQuestions: PrepQuestion[];
  questionsToAsk: Array<{ question: string; purpose: string }>;
  talkingPoints: string[];
  potentialConcerns: Array<{ concern: string; howToAddress: string }>;
  companyInsights: string[];
}

interface PrepState {
  loading: boolean;
  error: string | null;
  data: InterviewPrepResult | null;
  open: boolean;
}

function QuestionList({ title, questions }: { title: string; questions: PrepQuestion[] }) {
  if (!questions.length) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <details key={i} className="rounded-lg border border-border/60 p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground flex items-center gap-2">
              <span className="flex-1">{q.question}</span>
              <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>
            </summary>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{q.suggestedAnswer}</p>
            {q.tips && <p className="text-xs text-primary mt-1">{q.tips}</p>}
          </details>
        ))}
      </div>
    </div>
  );
}

export function InterviewPrep() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<InterviewApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [prep, setPrep] = useState<Record<string, PrepState>>({});

  useEffect(() => {
    apiClient
      .get<PaginatedResponse>('/applications?status=interview&limit=50')
      .then((d) => setApps(d.items ?? []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  const generate = async (appId: string) => {
    setPrep((p) => ({ ...p, [appId]: { loading: true, error: null, data: p[appId]?.data ?? null, open: true } }));
    try {
      const data = await apiClient.post<InterviewPrepResult>('/research/interview-prep', { applicationId: appId });
      setPrep((p) => ({ ...p, [appId]: { loading: false, error: null, data, open: true } }));
    } catch (err) {
      setPrep((p) => ({
        ...p,
        [appId]: { loading: false, error: err instanceof Error ? err.message : 'Failed to generate prep', data: null, open: true },
      }));
    }
  };

  const toggle = (appId: string) =>
    setPrep((p) => ({ ...p, [appId]: { ...(p[appId] ?? { loading: false, error: null, data: null }), open: !p[appId]?.open } }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Interview Preparation"
        description="AI-generated prep materials for your upcoming interviews"
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <UserCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-foreground">No upcoming interviews</h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            When an application reaches the interview stage it will appear here, ready for
            one-click prep generation.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => navigate('/applications')}>
            Go to Applications
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const state = prep[app.id];
            return (
              <Card key={app.id} className="border-border/60 shadow-soft">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{app.jobTitle ?? 'Role'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[app.companyName, app.jobLocation].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {state?.data && (
                        <Button variant="ghost" size="sm" onClick={() => toggle(app.id)}>
                          {state.open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button size="sm" onClick={() => generate(app.id)} disabled={state?.loading}>
                        {state?.loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {state?.data ? 'Regenerate' : 'Generate prep'}
                      </Button>
                    </div>
                  </div>

                  {state?.error && <p className="text-sm text-destructive mt-3">{state.error}</p>}

                  {state?.data && state.open && (
                    <div className="mt-5 space-y-5 border-t border-border/60 pt-5">
                      {state.data.talkingPoints.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Brain className="h-3.5 w-3.5" /> Talking points
                          </p>
                          <ul className="space-y-1">
                            {state.data.talkingPoints.map((t, i) => (
                              <li key={i} className="text-sm text-foreground flex gap-2">
                                <span className="text-muted-foreground/50">•</span>{t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <QuestionList title="Likely technical questions" questions={state.data.technicalQuestions} />
                      <QuestionList title="Likely behavioral questions" questions={state.data.behavioralQuestions} />

                      {state.data.questionsToAsk.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Questions to ask them</p>
                          <ul className="space-y-1">
                            {state.data.questionsToAsk.map((q, i) => (
                              <li key={i} className="text-sm text-foreground">
                                {q.question}
                                <span className="text-muted-foreground"> — {q.purpose}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {state.data.potentialConcerns.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Concerns to address</p>
                          <div className="space-y-2">
                            {state.data.potentialConcerns.map((c, i) => (
                              <div key={i} className="rounded-lg border border-border/60 p-3">
                                <p className="text-sm font-medium text-foreground">{c.concern}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{c.howToAddress}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {state.data.companyInsights.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Company insights</p>
                          <ul className="space-y-1">
                            {state.data.companyInsights.map((c, i) => (
                              <li key={i} className="text-sm text-foreground flex gap-2">
                                <span className="text-muted-foreground/50">•</span>{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
