import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Loader2, Trash2, Eye, Clock, FileText } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';

interface ResumeVersion {
  id: string;
  profileId: string;
  templateLayout?: string;
  templateTheme?: string;
  templateRegion?: string;
  atsScore?: number;
  coverLetter?: string;
  tailoredContent?: Record<string, unknown>;
  createdAt: string;
}

export function ResumeVersionsPanel({ profileId }: { profileId: string }) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { activeVersionId, setActiveVersionId } = useResumeBuilderStore();

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ResumeVersion[]>(`/profiles/${profileId}/versions`);
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleDelete = async (versionId: string) => {
    setDeletingId(versionId);
    try {
      await apiClient.delete(`/profiles/${profileId}/versions/${versionId}`);
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
      if (activeVersionId === versionId) setActiveVersionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setDeletingId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No versions yet.</p>
        <p className="text-xs text-muted-foreground/60">
          Use "Tailor with AI" to create a job-specific version.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}

      {versions.map((version) => (
        <Card
          key={version.id}
          className={`group cursor-pointer transition-all duration-200 hover:shadow-sm ${
            activeVersionId === version.id ? 'border-primary ring-1 ring-primary/20' : ''
          }`}
          onClick={() => setActiveVersionId(activeVersionId === version.id ? null : version.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium truncate">
                    {version.templateLayout ?? 'Version'} / {version.templateTheme ?? 'default'}
                  </p>
                  {version.atsScore != null && (
                    <Badge className={`text-[10px] px-1.5 py-0 ${getScoreColor(version.atsScore)}`}>
                      ATS: {version.atsScore}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(version.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVersionId(version.id);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(version.id);
                  }}
                  disabled={deletingId === version.id}
                >
                  {deletingId === version.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
