import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Plus, Pencil, Trash2, Save, X, Loader2, LayoutList } from 'lucide-react';

interface CustomField {
  label: string;
  value: string;
}

interface CustomSectionItem {
  id: string;
  fields: CustomField[];
}

interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

interface CustomSectionEditorProps {
  sections: CustomSection[];
  onUpdate: (sections: CustomSection[]) => void;
}

export function CustomSectionEditor({ sections, onUpdate }: CustomSectionEditorProps) {
  const [addingSection, setAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingItem, setEditingItem] = useState<{ sectionId: string; itemId: string | null } | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [addingItem, setAddingItem] = useState<string | null>(null);

  const handleAddSection = () => {
    if (!newTitle.trim()) return;
    const newSection: CustomSection = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      items: [],
    };
    onUpdate([...sections, newSection]);
    setNewTitle('');
    setAddingSection(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    onUpdate(sections.filter((s) => s.id !== sectionId));
  };

  const handleAddField = () => {
    setFields([...fields, { label: '', value: '' }]);
  };

  const handleSaveItem = (sectionId: string) => {
    const validFields = fields.filter((f) => f.label.trim() && f.value.trim());
    if (validFields.length === 0) return;

    const updated = sections.map((s) => {
      if (s.id !== sectionId) return s;

      if (editingItem?.itemId) {
        return {
          ...s,
          items: s.items.map((item) =>
            item.id === editingItem.itemId ? { ...item, fields: validFields } : item,
          ),
        };
      }

      return {
        ...s,
        items: [...s.items, { id: crypto.randomUUID(), fields: validFields }],
      };
    });

    onUpdate(updated);
    setFields([]);
    setEditingItem(null);
    setAddingItem(null);
  };

  const handleDeleteItem = (sectionId: string, itemId: string) => {
    onUpdate(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((item) => item.id !== itemId) }
          : s,
      ),
    );
  };

  const startEdit = (sectionId: string, item: CustomSectionItem) => {
    setEditingItem({ sectionId, itemId: item.id });
    setFields([...item.fields]);
    setAddingItem(null);
  };

  const startAdd = (sectionId: string) => {
    setAddingItem(sectionId);
    setFields([{ label: '', value: '' }]);
    setEditingItem(null);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setAddingItem(null);
    setFields([]);
  };

  const renderFieldEditor = (sectionId: string) => (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/10 p-4">
      {fields.map((field, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Label"
            value={field.label}
            onChange={(e) => {
              const updated = [...fields];
              updated[i] = { label: e.target.value, value: updated[i]?.value ?? '' };
              setFields(updated);
            }}
          />
          <Input
            placeholder="Value"
            value={field.value}
            onChange={(e) => {
              const updated = [...fields];
              updated[i] = { label: updated[i]?.label ?? '', value: e.target.value };
              setFields(updated);
            }}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleAddField} className="text-xs gap-1">
          <Plus className="h-3 w-3" /> Add Field
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => handleSaveItem(sectionId)}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={cancelEdit}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">Custom Sections</h3>
        </div>
        <Dialog open={addingSection} onOpenChange={setAddingSection}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Add Section
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Custom Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Section Title (e.g. Awards, Hobbies)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddingSection(false)}>Cancel</Button>
                <Button onClick={handleAddSection} disabled={!newTitle.trim()}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sections.length === 0 && (
        <p className="text-xs text-muted-foreground">No custom sections. Add one to include extra information on your resume.</p>
      )}

      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium">{section.title}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => handleDeleteSection(section.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {section.items.map((item) =>
            editingItem?.sectionId === section.id && editingItem?.itemId === item.id ? (
              <div key={item.id}>{renderFieldEditor(section.id)}</div>
            ) : (
              <div key={item.id} className="group flex items-start justify-between rounded-lg border bg-muted/20 p-3">
                <div className="space-y-0.5 min-w-0 flex-1">
                  {item.fields.map((f, i) => (
                    <p key={i} className="text-xs">
                      <span className="font-medium">{f.label}:</span> {f.value}
                    </p>
                  ))}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(section.id, item)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteItem(section.id, item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ),
          )}

          {addingItem === section.id ? (
            renderFieldEditor(section.id)
          ) : (
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => startAdd(section.id)}>
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
