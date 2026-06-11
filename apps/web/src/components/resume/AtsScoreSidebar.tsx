import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Shield, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { apiClient } from '../../api/client';

interface AtsSectionScore {
  score: number;
  feedback: string;
}

interface AtsScoreResult {
  overallScore: number;
  sections: Record<string, AtsSectionScore>;
  suggestions: string[];
  keywordMatches: string[];
  missingKeywords: string[];
}

export function AtsScoreSidebar({ profileId }: { profileId: string }) {
  const [result, setResult] = useState<AtsScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<AtsScoreResult>(`/profiles/${profileId}/ats-score`, {});
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ATS score');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchScore, 2000);
  }, [fetchScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getCircleColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const circumference = 2 * Math.PI * 40;
  const offset = result ? circumference - (result.overallScore / 100) * circumference : circumference;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            ATS Score
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchScore}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {result && (
          <>
            {/* Circular Score */}
            <div className="flex justify-center">
              <div className="relative h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/30"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={getCircleColor(result.overallScore)}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore}
                  </span>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-1.5">
              {Object.entries(result.sections).map(([key, section]) => (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className={`text-[10px] font-medium ${getScoreColor(section.score)}`}>
                      {section.score}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${section.score}%`,
                        backgroundColor: getCircleColor(section.score),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Tips</p>
                {result.suggestions.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground leading-tight">
                    - {s}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {loading && !result && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
