import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Pencil, Trash2, Plus, Save, X, Loader2 } from 'lucide-react';
import { useSectionData } from '../../../hooks/useSectionData';
import { AiBulletButton } from '../AiBulletButton';
import type { ExperienceEntry } from '../../../types/resume';

export function ExperienceSection({ profileId, onDataChange }: { profileId: string; onDataChange?: () => void }) {
  const { entries, loading, saving, error, addEntry, updateEntry, deleteEntry } =
    useSectionData<ExperienceEntry>(profileId, 'experience', onDataChange);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<ExperienceEntry, 'id'>>({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const resetForm = () => {
    setForm({ title: '', company: '', startDate: '', endDate: '', description: '' });
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (entry: ExperienceEntry) => {
    setEditing(entry.id ?? null);
    setForm({
      title: entry.title,
      company: entry.company,
      startDate: entry.startDate,
      endDate: entry.endDate,
      description: entry.description,
    });
    setAdding(false);
  };

  const handleSave = async () => {
    if (editing) {
      await updateEntry(editing, form);
    } else {
      await addEntry(form as ExperienceEntry);
    }
    resetForm();
  };

  if (loading) return <div className="py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}

      {entries.map((entry) =>
        editing === entry.id ? (
          <div key={entry.id} className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="Job Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <Input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Input type="date" placeholder="End Date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <textarea
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}><X className="h-3.5 w-3.5" /> Cancel</Button>
            </div>
          </div>
        ) : (
          <div key={entry.id} className="group flex items-start justify-between rounded-lg border bg-muted/20 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{entry.title}</p>
              <p className="text-xs text-muted-foreground">{entry.company}</p>
              <p className="text-xs text-muted-foreground/60">
                {entry.startDate} &mdash; {entry.endDate || 'Present'}
              </p>
              {entry.description && (
                <div className="mt-1 flex items-start gap-1">
                  <p className="text-xs text-muted-foreground whitespace-pre-line flex-1">{entry.description}</p>
                  <AiBulletButton
                    profileId={profileId}
                    bullet={entry.description}
                    onAccept={(improved) => entry.id && updateEntry(entry.id, { ...entry, description: improved })}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => entry.id && deleteEntry(entry.id)} disabled={saving}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <div className="space-y-3 rounded-lg border border-dashed bg-muted/10 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input placeholder="Job Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input type="date" placeholder="End Date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <textarea
            rows={3}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}><X className="h-3.5 w-3.5" /> Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => { resetForm(); setAdding(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Experience
        </Button>
      )}
    </div>
  );
}
