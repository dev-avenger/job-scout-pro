import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Wand2, Sparkles, Loader2, Check } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AiGenerateDialogProps {
  profileId: string;
  onSuccess?: (result: any) => void;
}

export function AiGenerateDialog({ profileId, onSuccess }: AiGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiClient.post(`/profiles/${profileId}/tailor`, {
        jobDescription: jobDescription.trim(),
      });
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Wand2 className="h-4 w-4" />
          Tailor with AI
          <Sparkles className="h-3 w-3 text-amber-500" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Tailor Resume to Job
          </DialogTitle>
          <DialogDescription>
            Paste the job description and AI will tailor your resume to match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <textarea
            rows={8}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none"
            disabled={generating}
          />

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <p className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                <Check className="h-3.5 w-3.5" />
                Resume tailored successfully! Review the suggestions in the versions panel.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={generating}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button onClick={handleGenerate} disabled={generating || !jobDescription.trim()}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
