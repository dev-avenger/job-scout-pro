import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import { Pencil, Trash2, Plus, Save, X, Loader2 } from 'lucide-react';
import { useSectionData } from '../../../hooks/useSectionData';
import type { LanguageEntry } from '../../../types/resume';

const proficiencyColor = (p: string) => {
  switch (p) {
    case 'native': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'fluent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'intermediate': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'basic': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    default: return '';
  }
};

export function LanguagesSection({ profileId, onDataChange }: { profileId: string; onDataChange?: () => void }) {
  const { entries, loading, saving, error, addEntry, updateEntry, deleteEntry } =
    useSectionData<LanguageEntry>(profileId, 'languages', onDataChange);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<LanguageEntry, 'id'>>({
    language: '',
    proficiency: 'intermediate',
  });

  const resetForm = () => {
    setForm({ language: '', proficiency: 'intermediate' });
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (entry: LanguageEntry) => {
    setEditing(entry.id ?? null);
    setForm({
      language: entry.language,
      proficiency: entry.proficiency,
    });
    setAdding(false);
  };

  const handleSave = async () => {
    if (editing) {
      await updateEntry(editing, form);
    } else {
      await addEntry(form as LanguageEntry);
    }
    resetForm();
  };

  const renderForm = (isEditing: boolean) => (
    <div className={`space-y-3 rounded-lg border ${isEditing ? 'bg-muted/20' : 'border-dashed bg-muted/10'} p-4`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        <select
          value={form.proficiency}
          onChange={(e) => setForm({ ...form, proficiency: e.target.value as 'native' | 'fluent' | 'intermediate' | 'basic' })}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <option value="native">Native</option>
          <option value="fluent">Fluent</option>
          <option value="intermediate">Intermediate</option>
          <option value="basic">Basic</option>
        </select>
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
          <div key={entry.id} className="group flex items-center justify-between rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium">{entry.language}</p>
              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 capitalize', proficiencyColor(entry.proficiency))}>
                {entry.proficiency}
              </Badge>
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
          <Plus className="h-3.5 w-3.5" /> Add Language
        </Button>
      )}
    </div>
  );
}
