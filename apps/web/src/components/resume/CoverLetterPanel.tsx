import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Loader2, Sparkles, Copy, Check, FileText } from 'lucide-react';
import { apiClient } from '../../api/client';

export function CoverLetterPanel({ profileId }: { profileId: string }) {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!jobTitle.trim() || !companyName.trim() || !jobDescription.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await apiClient.post<{ coverLetter: string; costCents: number }>(
        `/profiles/${profileId}/cover-letter`,
        { jobTitle: jobTitle.trim(), companyName: companyName.trim(), jobDescription: jobDescription.trim() },
      );
      setCoverLetter(result.coverLetter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold tracking-tight">Cover Letter</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Job Title</label>
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Company Name</label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Job Description</label>
        <textarea
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none"
        />
      </div>

      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={generating || !jobTitle.trim() || !companyName.trim() || !jobDescription.trim()}
        className="gap-1.5"
      >
        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {generating ? 'Generating...' : 'Generate Cover Letter'}
      </Button>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {coverLetter && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Generated Cover Letter</p>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 gap-1">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{coverLetter}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
