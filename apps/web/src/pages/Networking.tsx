import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { PageHeader } from '../components/PageHeader';
import { Users, Plus, Mail, Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface OutreachSuggestion {
  contacts: Array<{ role: string; title?: string; likelyEmailPattern?: string; rationale: string }>;
  draft: { subject: string; body: string };
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  title?: string;
  company?: string;
  relationshipType?: string;
  linkedinUrl?: string;
  tags?: string[];
}

const EMPTY_FORM = {
  name: '',
  email: '',
  title: '',
  company: '',
  relationshipType: 'recruiter',
  linkedinUrl: '',
};

export function Networking() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft-outreach dialog
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftInput, setDraftInput] = useState({ companyName: '', jobTitle: '' });
  const [suggestion, setSuggestion] = useState<OutreachSuggestion | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const loadContacts = () => {
    apiClient.get<Contact[]>('/contacts').then(setContacts).catch(() => {});
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const openDialog = () => {
    setForm({ ...EMPTY_FORM });
    setError(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Only send non-empty optional fields (the API validates email/url format).
      const payload: Record<string, string> = { name: form.name.trim() };
      for (const key of ['email', 'title', 'company', 'relationshipType', 'linkedinUrl'] as const) {
        const value = form[key].trim();
        if (value) payload[key] = value;
      }
      await apiClient.post('/contacts', payload);
      setDialogOpen(false);
      loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const openDraft = () => {
    setDraftInput({ companyName: '', jobTitle: '' });
    setSuggestion(null);
    setDraftSubject('');
    setDraftBody('');
    setDraftError(null);
    setDraftSaved(false);
    setDraftOpen(true);
  };

  const runSuggest = async () => {
    if (!draftInput.companyName.trim() || !draftInput.jobTitle.trim()) {
      setDraftError('Company and role are required.');
      return;
    }
    setSuggesting(true);
    setDraftError(null);
    try {
      const res = await apiClient.post<OutreachSuggestion>('/outreach/suggest', {
        companyName: draftInput.companyName.trim(),
        jobTitle: draftInput.jobTitle.trim(),
      });
      setSuggestion(res);
      setDraftSubject(res.draft?.subject ?? '');
      setDraftBody(res.draft?.body ?? '');
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to generate suggestions.');
    } finally {
      setSuggesting(false);
    }
  };

  const saveDraft = async () => {
    if (!draftSubject.trim() || !draftBody.trim()) {
      setDraftError('Subject and body are required to save.');
      return;
    }
    setSavingDraft(true);
    setDraftError(null);
    try {
      await apiClient.post('/outreach', {
        type: 'outreach',
        subject: draftSubject.trim(),
        body: draftBody.trim(),
      });
      setDraftSaved(true);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Networking & CRM"
        description="Manage your professional contacts and outreach"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" className="shadow-soft" onClick={openDraft}>
              <Sparkles className="w-4 h-4 mr-2" />
              Draft Outreach
            </Button>
            <Button className="shadow-soft" onClick={openDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        }
      />

      {contacts.length === 0 ? (
        <Card className="border-border/60 shadow-soft">
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Add recruiters, hiring managers, and referrals to track your
              networking efforts.
            </p>
            <Button variant="outline" className="mt-5" onClick={openDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first contact
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="p-4 flex items-center gap-4 border-border/60 shadow-soft card-hover"
            >
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                {contact.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {contact.name}
                  </span>
                  {contact.relationshipType && (
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {contact.relationshipType}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[contact.title, contact.company].filter(Boolean).join(' at ')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {contact.email && (
                  <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
            <DialogDescription>
              Track a recruiter, hiring manager, or referral in your CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-name">Name *</Label>
              <Input id="contact-name" value={form.name} onChange={setField('name')} placeholder="Jane Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="contact-title">Title</Label>
                <Input id="contact-title" value={form.title} onChange={setField('title')} placeholder="Eng. Manager" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact-company">Company</Label>
                <Input id="contact-company" value={form.company} onChange={setField('company')} placeholder="Acme" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" value={form.email} onChange={setField('email')} placeholder="jane@acme.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-linkedin">LinkedIn URL</Label>
              <Input id="contact-linkedin" value={form.linkedinUrl} onChange={setField('linkedinUrl')} placeholder="https://linkedin.com/in/jane" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact-rel">Relationship</Label>
              <select
                id="contact-rel"
                value={form.relationshipType}
                onChange={(e) => setForm((p) => ({ ...p, relationshipType: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="recruiter">Recruiter</option>
                <option value="hiring_manager">Hiring manager</option>
                <option value="referral">Referral</option>
                <option value="colleague">Colleague</option>
                <option value="other">Other</option>
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Add contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft outreach</DialogTitle>
            <DialogDescription>
              Suggest who to contact at a company for a role and draft an intro email.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="draft-company">Company *</Label>
                <Input id="draft-company" value={draftInput.companyName}
                  onChange={(e) => setDraftInput((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Acme" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="draft-role">Role *</Label>
                <Input id="draft-role" value={draftInput.jobTitle}
                  onChange={(e) => setDraftInput((p) => ({ ...p, jobTitle: e.target.value }))}
                  placeholder="Senior Backend Engineer" />
              </div>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={runSuggest} disabled={suggesting}>
                {suggesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {suggestion ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {suggestion && (
              <>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Who to contact</p>
                  <div className="space-y-2">
                    {suggestion.contacts.map((c, i) => (
                      <div key={i} className="rounded-lg border border-border/60 p-3">
                        <p className="text-sm font-medium text-foreground">
                          {c.role}{c.title ? ` · ${c.title}` : ''}
                        </p>
                        {c.likelyEmailPattern && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.likelyEmailPattern}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{c.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="draft-subject">Subject</Label>
                  <Input id="draft-subject" value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="draft-body">Message</Label>
                  <textarea id="draft-body" value={draftBody} onChange={(e) => setDraftBody(e.target.value)}
                    rows={8}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed" />
                </div>
              </>
            )}

            {draftError && <p className="text-sm text-destructive">{draftError}</p>}
            {draftSaved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved as a draft in Outreach.</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDraftOpen(false)}>Close</Button>
            {suggestion && !draftSaved && (
              <Button onClick={saveDraft} disabled={savingDraft}>
                {savingDraft ? 'Saving…' : 'Save as draft'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
