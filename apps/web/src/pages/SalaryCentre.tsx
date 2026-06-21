import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PageHeader } from '../components/PageHeader';
import { apiClient } from '../api/client';
import { DollarSign, TrendingUp, BarChart3, Loader2, Sparkles } from 'lucide-react';

interface SalaryEstimate {
  currency: string;
  periodicity: 'year' | 'month' | 'hour';
  low: number;
  mid: number;
  high: number;
  confidence: number;
  rationale: string;
  notes: string[];
}

const SENIORITY = ['Internship', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Principal', 'Lead', 'Manager'];

function fmt(currency: string, n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

export function SalaryCentre() {
  const [form, setForm] = useState({
    title: '',
    location: '',
    experienceLevel: 'Mid-level',
    requiredSkills: '',
  });
  const [result, setResult] = useState<SalaryEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimate = async () => {
    if (!form.title.trim()) {
      setError('Job title is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const skills = form.requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiClient.post<SalaryEstimate>('/research/salary', {
        title: form.title.trim(),
        location: form.location.trim() || undefined,
        experienceLevel: form.experienceLevel,
        requiredSkills: skills.length ? skills : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate salary.');
    } finally {
      setLoading(false);
    }
  };

  const per = result ? `/${result.periodicity}` : '';
  const stats = result
    ? [
        { label: 'Market Midpoint', value: `${fmt(result.currency, result.mid)}${per}`, icon: DollarSign, chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
        { label: 'Range', value: `${fmt(result.currency, result.low)} – ${fmt(result.currency, result.high)}`, icon: TrendingUp, chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
        { label: 'Confidence', value: `${Math.round(result.confidence * 100)}%`, icon: BarChart3, chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
      ]
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Salary Centre"
        description="Estimate the market salary range for any role"
      />

      <Card className="p-5 border-border/60 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sal-title">Job title *</Label>
            <Input id="sal-title" value={form.title} placeholder="Senior Software Engineer"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sal-loc">Location</Label>
            <Input id="sal-loc" value={form.location} placeholder="Berlin, Germany"
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sal-exp">Seniority</Label>
            <select id="sal-exp" value={form.experienceLevel}
              onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {SENIORITY.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sal-skills">Key skills (comma-separated)</Label>
            <Input id="sal-skills" value={form.requiredSkills} placeholder="React, Node.js, AWS"
              onChange={(e) => setForm((f) => ({ ...f, requiredSkills: e.target.value }))} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        <div className="mt-4">
          <Button onClick={estimate} disabled={loading} className="shadow-soft">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Estimate salary
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-5 border-border/60 shadow-soft card-hover">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-lg shrink-0 ${stat.chip}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                      <p className="text-xl font-bold tracking-tight mt-0.5">{stat.value}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5 border-border/60 shadow-soft space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Rationale</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.rationale}</p>
            </div>
            {result.notes.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground">Notes</h3>
                <ul className="mt-1 space-y-1">
                  {result.notes.map((n, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-muted-foreground/50">•</span>{n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground/70">
              AI estimate based on role, location and seniority — verify against live market data before negotiating.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
