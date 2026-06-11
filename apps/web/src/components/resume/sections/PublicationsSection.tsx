import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Pencil, Trash2, Plus, Save, X, Loader2 } from 'lucide-react';
import { useSectionData } from '../../../hooks/useSectionData';
import type { PublicationEntry } from '../../../types/resume';

export function PublicationsSection({ profileId, onDataChange }: { profileId: string; onDataChange?: () => void }) {
  const { entries, loading, saving, error, addEntry, updateEntry, deleteEntry } =
    useSectionData<PublicationEntry>(profileId, 'publications', onDataChange);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<PublicationEntry, 'id'>>({
    title: '',
    publisher: '',
    date: '',
    url: '',
  });

  const resetForm = () => {
    setForm({ title: '', publisher: '', date: '', url: '' });
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (entry: PublicationEntry) => {
    setEditing(entry.id ?? null);
    setForm({
      title: entry.title,
      publisher: entry.publisher,
      date: entry.date,
      url: entry.url,
    });
    setAdding(false);
  };

  const handleSave = async () => {
    if (editing) {
      await updateEntry(editing, form);
    } else {
      await addEntry(form as PublicationEntry);
    }
    resetForm();
  };

  const renderForm = (isEditing: boolean) => (
    <div className={`space-y-3 rounded-lg border ${isEditing ? 'bg-muted/20' : 'border-dashed bg-muted/10'} p-4`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
        <Input type="date" placeholder="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <Input placeholder="URL (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
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
              <p className="text-sm font-medium">{entry.title}</p>
              <p className="text-xs text-muted-foreground">{entry.publisher}</p>
              <p className="text-xs text-muted-foreground/60">{entry.date}</p>
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                  {entry.url}
                </a>
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
        renderForm(false)
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => { resetForm(); setAdding(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Publication
        </Button>
      )}
    </div>
  );
}
