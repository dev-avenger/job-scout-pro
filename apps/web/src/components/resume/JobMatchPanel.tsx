import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AtsScoreResult {
  overallScore: number;
  sections: Record<string, { score: number; feedback: string }>;
  suggestions: string[];
  keywordMatches: string[];
  missingKeywords: string[];
}

export function JobMatchPanel({ profileId }: { profileId: string }) {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsScoreResult | null>(null);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<AtsScoreResult>(`/profiles/${profileId}/ats-score`, {
        jobDescription: jobDescription.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
    if (score >= 60) return 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800';
    return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Job Match Analysis</h3>
      </div>

      <div className="space-y-3">
        <textarea
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste a job description to see how well your resume matches..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none"
        />
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={loading || !jobDescription.trim()}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
          {loading ? 'Analyzing...' : 'Analyze Match'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Score */}
          <Card className={`border ${getScoreBg(result.overallScore)}`}>
            <CardContent className="py-4 flex items-center justify-center gap-3">
              <div className={`text-4xl font-bold ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}
              </div>
              <div>
                <p className="text-sm font-medium">ATS Score</p>
                <p className="text-xs text-muted-foreground">out of 100</p>
              </div>
            </CardContent>
          </Card>

          {/* Section Scores */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Section Breakdown</p>
            {Object.entries(result.sections).map(([key, section]) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-xs font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        section.score >= 80 ? 'bg-green-500' : section.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${section.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium w-7 text-right">{section.score}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Keywords */}
          {result.keywordMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Matched Keywords
              </p>
              <div className="flex flex-wrap gap-1">
                {result.keywordMatches.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {result.missingKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                Missing Keywords
              </p>
              <div className="flex flex-wrap gap-1">
                {result.missingKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Suggestions</p>
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0">-</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
