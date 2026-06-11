import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import {
  FileText,
  Mail,
  Phone,
  MapPin,
  Link2 as Linkedin,
  Star,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import type { ContactInfo, Profile } from '../../types/resume';

export interface ProfileFormProps {
  initial?: Profile | null;
  onSubmit: (data: {
    name: string;
    contactInfo: ContactInfo;
    isDefault: boolean;
    summary: string;
    skills: string[];
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function ProfileForm({ initial, onSubmit, onCancel, submitLabel }: ProfileFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.contactInfo?.email ?? '');
  const [phone, setPhone] = useState(initial?.contactInfo?.phone ?? '');
  const [location, setLocation] = useState(initial?.contactInfo?.location ?? '');
  const [linkedin, setLinkedin] = useState(initial?.contactInfo?.linkedin ?? '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [skills, setSkills] = useState(initial?.skills?.join(', ') ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        contactInfo: {
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          linkedin: linkedin.trim(),
        },
        isDefault,
        summary: summary.trim(),
        skills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="animate-fade-in rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">
          Profile Name <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Software Engineer Resume"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Contact Information</h3>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">LinkedIn</label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Summary</label>
        <textarea
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="A brief professional summary..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Skills</label>
        <Input
          type="text"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="React, TypeScript, Node.js, PostgreSQL"
        />
        <p className="text-xs text-muted-foreground">Separate skills with commas</p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Set as default profile
          </span>
        </div>
      </label>

      <Separator />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitting ? 'Saving...' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
