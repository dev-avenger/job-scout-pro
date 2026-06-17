import { useState } from 'react';
import { apiClient } from '../../../api/client';

/* Shapes returned by POST /profiles/:id/tailor-and-score */
interface AtsAnalysis {
  semanticMatchScore: number;
  matchedKeywords: string[];
  missingKeywords: Array<{ keyword: string; importance: 'critical' | 'preferred'; suggestion: string }>;
  hardSkillGaps: string[];
  parseSafetyIssues: string[];
  prioritizedSuggestions: Array<{ priority: 'high' | 'medium' | 'low'; suggestion: string }>;
  verdict: string;
}
interface TailorResult {
  jobInsights: {
    seniority: string;
    industry: string;
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    softSkills: string[];
    focus: string;
  };
  tailoredSummary: string;
  tailoredExperience: Array<{ title: string; company: string; bullets: string[] }>;
  prioritizedSkills: Array<{ name: string; category?: string }>;
  sectionsToHide: string[];
  coverLetterOutline: string[];
}
interface TailorAndScore {
  tailored: TailorResult;
  score: { overallScore: number; analysis: AtsAnalysis | null };
  llmCostCents: number;
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color = value >= 75 ? 'text-emerald-600' : value >= 50 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex flex-col items-center rounded-lg border border-border/60 px-3 py-2">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{Math.round(value)}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

export function TailorForJobPanel({ profileId }: { profileId: string }) {
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TailorAndScore | null>(null);

  const run = async () => {
    if (!jobDescription.trim()) {
      setError('Paste the job description first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<TailorAndScore>(`/profiles/${profileId}/tailor-and-score`, {
        jobDescription,
        jobTitle: jobTitle || undefined,
        companyName: companyName || undefined,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tailoring failed.');
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.score.analysis ?? null;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Paste a job description to tailor this resume and see how well it matches.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
          placeholder="Job title (optional)"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />
        <input
          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
          placeholder="Company (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>
      <textarea
        className="h-32 w-full resize-y rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
        placeholder="Paste the job description here…"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      <button
        onClick={run}
        disabled={loading}
        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Tailoring…' : 'Tailor for this job'}
      </button>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 pt-1">
          {/* Scores */}
          <div className="flex gap-2">
            <ScoreRing value={result.score.overallScore} label="ATS" />
            {analysis && <ScoreRing value={analysis.semanticMatchScore} label="Match" />}
          </div>
          {analysis?.verdict && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">
              {analysis.verdict}
            </p>
          )}

          {/* Missing keywords */}
          {analysis && analysis.missingKeywords.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">Missing keywords</h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingKeywords.map((m) => (
                  <span
                    key={m.keyword}
                    title={m.suggestion}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      m.importance === 'critical'
                        ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {m.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {analysis && analysis.prioritizedSuggestions.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">Top suggestions</h4>
              <ul className="space-y-1">
                {analysis.prioritizedSuggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        s.priority === 'high'
                          ? 'bg-red-500'
                          : s.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-muted-foreground'
                      }`}
                    />
                    <span className="text-muted-foreground">{s.suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tailored summary */}
          <div>
            <h4 className="mb-1 text-xs font-semibold">Tailored summary</h4>
            <p className="rounded-md border border-border/60 px-3 py-2 text-xs">
              {result.tailored.tailoredSummary}
            </p>
          </div>

          {/* Tailored experience */}
          {result.tailored.tailoredExperience.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">Rewritten experience</h4>
              <div className="space-y-2">
                {result.tailored.tailoredExperience.map((exp, i) => (
                  <div key={i} className="rounded-md border border-border/60 px-3 py-2">
                    <p className="text-xs font-medium">
                      {[exp.title, exp.company].filter(Boolean).join(' · ')}
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
                      {exp.bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections to hide */}
          {result.tailored.sectionsToHide.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">Suggested to hide for this role</h4>
              <div className="flex flex-wrap gap-1.5">
                {result.tailored.sectionsToHide.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] capitalize text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cover-letter outline */}
          {result.tailored.coverLetterOutline.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold">Cover-letter outline</h4>
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                {result.tailored.coverLetterOutline.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-right text-[10px] text-muted-foreground/70">
            AI cost: ${(result.llmCostCents / 100).toFixed(3)}
          </p>
        </div>
      )}
    </div>
  );
}
