import { useState } from 'react';
import { Button } from '../ui/button';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AiBulletButtonProps {
  profileId: string;
  bullet: string;
  onAccept: (improved: string) => void;
}

export function AiBulletButton({ profileId, bullet, onAccept }: AiBulletButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [improved, setImproved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImprove = async () => {
    if (!bullet.trim()) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    setImproved(null);
    try {
      const result = await apiClient.post<{ improved: string; costCents: number }>(
        `/profiles/${profileId}/ai/improve-bullet`,
        { bullet },
      );
      setImproved(result.improved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (improved) {
      onAccept(improved);
      setOpen(false);
      setImproved(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setImproved(null);
    setError(null);
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-amber-500"
        onClick={handleImprove}
        title="Improve with AI"
      >
        <Sparkles className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2 animate-fade-in">
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Improving bullet...
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {improved && (
        <>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase">AI Suggestion</p>
            <p className="text-xs leading-relaxed">{improved}</p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[10px] gap-1" onClick={handleAccept}>
              <Check className="h-2.5 w-2.5" />
              Accept
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={handleClose}>
              <X className="h-2.5 w-2.5" />
              Dismiss
            </Button>
          </div>
        </>
      )}

      {!loading && !improved && !error && (
        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={handleClose}>
          Cancel
        </Button>
      )}
    </div>
  );
}
