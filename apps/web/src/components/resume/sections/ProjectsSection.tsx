import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Pencil, Trash2, Plus, Save, X, Loader2 } from 'lucide-react';
import { useSectionData } from '../../../hooks/useSectionData';
import { AiBulletButton } from '../AiBulletButton';
import type { ProjectEntry } from '../../../types/resume';

export function ProjectsSection({ profileId, onDataChange }: { profileId: string; onDataChange?: () => void }) {
  const { entries, loading, saving, error, addEntry, updateEntry, deleteEntry } =
    useSectionData<ProjectEntry>(profileId, 'projects', onDataChange);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [form, setForm] = useState<Omit<ProjectEntry, 'id'>>({
    name: '',
    description: '',
    url: '',
    technologies: [],
  });

  const resetForm = () => {
    setForm({ name: '', description: '', url: '', technologies: [] });
    setTechInput('');
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (entry: ProjectEntry) => {
    setEditing(entry.id ?? null);
    setForm({
      name: entry.name,
      description: entry.description,
      url: entry.url,
      technologies: entry.technologies ?? [],
    });
    setTechInput((entry.technologies ?? []).join(', '));
    setAdding(false);
  };

  const handleSave = async () => {
    const techs = techInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const data = { ...form, technologies: techs };
    if (editing) {
      await updateEntry(editing, data);
    } else {
      await addEntry(data as ProjectEntry);
    }
    resetForm();
  };

  const renderForm = (isEditing: boolean) => (
    <div className={`space-y-3 rounded-lg border ${isEditing ? 'bg-muted/20' : 'border-dashed bg-muted/10'} p-4`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="URL (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      </div>
      <textarea
        rows={3}
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none"
      />
      <Input
        placeholder="Technologies (comma-separated)"
        value={techInput}
        onChange={(e) => setTechInput(e.target.value)}
      />
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
              <p className="text-sm font-medium">{entry.name}</p>
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                  {entry.url}
                </a>
              )}
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
              {entry.technologies && entry.technologies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.technologies.map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tech}
                    </Badge>
                  ))}
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
        renderForm(false)
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={() => { resetForm(); setAdding(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Project
        </Button>
      )}
    </div>
  );
}
