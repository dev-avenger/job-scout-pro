import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Pencil, Trash2, Plus, Save, X, Loader2 } from 'lucide-react';
import { useSectionData } from '../../../hooks/useSectionData';
import type { EducationEntry } from '../../../types/resume';

export function EducationSection({ profileId, onDataChange }: { profileId: string; onDataChange?: () => void }) {
  const { entries, loading, saving, error, addEntry, updateEntry, deleteEntry } =
    useSectionData<EducationEntry>(profileId, 'education', onDataChange);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<EducationEntry, 'id'>>({
    degree: '',
    institution: '',
    startDate: '',
    endDate: '',
    gpa: '',
  });

  const resetForm = () => {
    setForm({ degree: '', institution: '', startDate: '', endDate: '', gpa: '' });
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (entry: EducationEntry) => {
    setEditing(entry.id ?? null);
    setForm({
      degree: entry.degree,
      institution: entry.institution,
      startDate: entry.startDate,
      endDate: entry.endDate,
      gpa: entry.gpa,
    });
    setAdding(false);
  };

  const handleSave = async () => {
    if (editing) {
      await updateEntry(editing, form);
    } else {
      await addEntry(form as EducationEntry);
    }
    resetForm();
  };

  const renderForm = (isEditing: boolean) => (
    <div className={`space-y-3 rounded-lg border ${isEditing ? 'bg-muted/20' : 'border-dashed bg-muted/10'} p-4`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Degree" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
        <Input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
        <Input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <Input type="date" placeholder="End Date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <Input placeholder="GPA (optional)" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {isEditing ? 'Save' : 'Add'}
        </Button>
        <Button size="sm" variant="outline" onClick={resetForm}><X className="h-3.5 w-3.5" /> Cancel</Button>
      </div>
    </div>
  );

  if (loading) return <div className="py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-destructive">{error}</p>}

      {entries.map((entry) =>
        editing === entry.id ? (
          <div key={entry.id}>{renderForm(true)}</div>
        ) : (
          <div key={entry.id} className="group flex items-start justify-between rounded-lg border bg-muted/20 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{entry.degree}</p>
              <p className="text-xs text-muted-foreground">{entry.institution}</p>
              <p className="text-xs text-muted-foreground/60">
                {entry.startDate} &mdash; {entry.endDate || 'Present'}
                {entry.gpa && ` · GPA: ${entry.gpa}`}
              </p>
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
        renderForm(false)
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => { resetForm(); setAdding(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Education
        </Button>
      )}
    </div>
  );
}
