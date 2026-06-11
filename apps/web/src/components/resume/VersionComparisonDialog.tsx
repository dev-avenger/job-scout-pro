import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, GitCompare } from 'lucide-react';
import { apiClient } from '../../api/client';
import { LiveResumePreview } from './LiveResumePreview';
import type { Profile } from '../../types/resume';

interface ResumeVersion {
  id: string;
  profileId: string;
  templateLayout?: string;
  templateTheme?: string;
  tailoredContent?: Record<string, unknown>;
  atsScore?: number;
  createdAt: string;
}

export function VersionComparisonDialog({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [leftId, setLeftId] = useState<string>('current');
  const [rightId, setRightId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      apiClient.get<ResumeVersion[]>(`/profiles/${profileId}/versions`),
      apiClient.get<Profile>(`/profiles/${profileId}`),
    ])
      .then(([vers, prof]) => {
        setVersions(vers);
        setProfile(prof);
        if (vers.length > 0 && vers[0]) setRightId(vers[0].id);
      })
      .finally(() => setLoading(false));
  }, [open, profileId]);

  const getVersionData = (id: string): Profile | null => {
    if (id === 'current') return profile;
    const version = versions.find((v) => v.id === id);
    if (!version?.tailoredContent || !profile) return profile;
    return { ...profile, ...version.tailoredContent } as Profile;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <GitCompare className="h-3.5 w-3.5" />
          Compare
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Versions
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Left side */}
            <div className="flex-1 flex flex-col min-w-0">
              <select
                value={leftId}
                onChange={(e) => setLeftId(e.target.value)}
                className="mb-2 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="current">Current Profile</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.templateLayout ?? 'Version'} - {new Date(v.createdAt).toLocaleDateString()}
                    {v.atsScore != null ? ` (ATS: ${v.atsScore})` : ''}
                  </option>
                ))}
              </select>
              <ScrollArea className="flex-1 border rounded-lg">
                {getVersionData(leftId) && (
                  <LiveResumePreview resumeData={getVersionData(leftId)!} />
                )}
              </ScrollArea>
            </div>

            {/* Right side */}
            <div className="flex-1 flex flex-col min-w-0">
              <select
                value={rightId}
                onChange={(e) => setRightId(e.target.value)}
                className="mb-2 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="current">Current Profile</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.templateLayout ?? 'Version'} - {new Date(v.createdAt).toLocaleDateString()}
                    {v.atsScore != null ? ` (ATS: ${v.atsScore})` : ''}
                  </option>
                ))}
              </select>
              <ScrollArea className="flex-1 border rounded-lg">
                {getVersionData(rightId) && (
                  <LiveResumePreview resumeData={getVersionData(rightId)!} />
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
