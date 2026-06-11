import { useEffect, useRef, useState } from 'react';
import { Check, Download, Globe, Save, Trash2, Upload } from 'lucide-react';
import type { ResumeTemplate, TemplateConfig } from '@auto-job-apply/shared-types';
import { BUILTIN_TEMPLATES, TemplateFileSchema } from '@auto-job-apply/shared-types';
import { apiClient } from '../../../api/client';
import { useResumeBuilderStore } from '../../../stores/resume-builder-store';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';

const REGION_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'eu_europass', label: 'Europe' },
  { id: 'us_standard', label: 'USA' },
  { id: 'uk_standard', label: 'UK' },
  { id: 'au_standard', label: 'Australia' },
  { id: 'pk_cv', label: 'Pakistan' },
];

interface GalleryEntry {
  key: string;
  name: string;
  region: string;
  description?: string;
  config: TemplateConfig;
  isBuiltIn: boolean;
  id?: string; // DB id for user templates
}

function TemplateThumb({ config }: { config: TemplateConfig }) {
  const sidebar = (config.pages?.[0]?.length ?? 1) > 1;
  const labelLeft = config.layoutVariant === 'label-left';

  if (labelLeft) {
    // Europass-style: label gutter left, content right, thin rules
    return (
      <div className="h-20 w-full overflow-hidden rounded border bg-white p-1.5">
        <div className="mb-1 flex items-start gap-1">
          <div className="h-2 w-2/5 rounded-sm" style={{ backgroundColor: config.colors.primary }} />
          {config.showPhoto && <div className="ml-auto h-3.5 w-3 rounded-sm bg-gray-300" />}
        </div>
        <div className="flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-1 border-t pt-0.5" style={{ borderColor: config.colors.divider }}>
              <div className="h-1 w-1/4 rounded-sm" style={{ backgroundColor: config.colors.primary }} />
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="h-0.5 w-full rounded-sm bg-gray-200" />
                <div className="h-0.5 w-5/6 rounded-sm bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-20 w-full overflow-hidden rounded border bg-white p-1.5">
      <div
        className="mb-1 h-2 w-2/3 rounded-sm"
        style={{ backgroundColor: config.layout === 'creative' ? config.colors.primary : config.colors.divider }}
      />
      <div className="flex h-[52px] gap-1">
        {sidebar && (
          <div className="w-1/3 rounded-sm" style={{ backgroundColor: `${config.colors.secondary}20` }} />
        )}
        <div className="flex flex-1 flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="h-1 w-1/3 rounded-sm" style={{ backgroundColor: config.colors.primary }} />
              <div className="h-0.5 w-full rounded-sm bg-gray-200" />
              <div className="h-0.5 w-5/6 rounded-sm bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TemplatesPanel() {
  const { templateConfig, applyTemplateConfig } = useResumeBuilderStore();
  const [region, setRegion] = useState('all');
  const [userTemplates, setUserTemplates] = useState<ResumeTemplate[]>([]);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUserTemplates = async () => {
    try {
      const data = await apiClient.get<ResumeTemplate[]>('/templates');
      setUserTemplates(data.filter((t) => !t.isBuiltIn));
    } catch {
      // templates API optional — built-ins still work
    }
  };

  useEffect(() => {
    loadUserTemplates();
  }, []);

  const entries: GalleryEntry[] = [
    ...BUILTIN_TEMPLATES.map((t) => ({
      key: `builtin:${t.slug}`,
      name: t.name,
      region: t.region,
      description: t.description,
      config: t.config,
      isBuiltIn: true,
    })),
    ...userTemplates.map((t) => ({
      key: `user:${t.id}`,
      name: t.name,
      region: t.region,
      description: t.description,
      config: t.config,
      isBuiltIn: false,
      id: t.id,
    })),
  ].filter((e) => region === 'all' || e.region === region);

  const apply = (entry: GalleryEntry) => {
    applyTemplateConfig(entry.config);
    setAppliedKey(entry.key);
  };

  const saveCurrent = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/templates', {
        name: newName.trim(),
        region: 'general',
        description: 'Saved from the page builder',
        config: templateConfig,
      });
      setNewName('');
      await loadUserTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiClient.delete(`/templates/${id}`);
      await loadUserTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const exportCurrent = () => {
    const file = {
      formatVersion: 1 as const,
      kind: 'auto-job-apply/resume-template' as const,
      template: {
        slug: 'exported-template',
        name: 'Exported template',
        region: 'general',
        description: 'Exported from the page builder',
        config: templateConfig,
        version: 1,
      },
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-template.resume-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    setError(null);
    try {
      const parsed = TemplateFileSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        setError('Not a valid .resume-template.json file');
        return;
      }
      applyTemplateConfig(parsed.data.template.config);
      setAppliedKey(null);
    } catch {
      setError('Could not read the template file');
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4" />
          Template registry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {REGION_FILTERS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRegion(r.id)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                region === r.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className={cn(
                'group relative cursor-pointer rounded-lg border-2 p-1.5 transition-all hover:shadow-md',
                appliedKey === entry.key ? 'border-primary ring-2 ring-primary/20' : 'border-border',
              )}
              onClick={() => apply(entry)}
              title={entry.description}
            >
              {appliedKey === entry.key && (
                <div className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <TemplateThumb config={entry.config} />
              <p className="mt-1 truncate text-xs font-medium">{entry.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {entry.isBuiltIn ? 'Built-in' : 'My template'}
              </p>
              {!entry.isBuiltIn && entry.id && (
                <button
                  type="button"
                  className="absolute bottom-1 right-1 hidden p-1 text-muted-foreground hover:text-destructive group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(entry.id!);
                  }}
                  title="Delete my template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex gap-1.5">
            <Input
              placeholder="Save current design as…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" disabled={!newName.trim() || saving} onClick={saveCurrent}>
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 flex-1" onClick={exportCurrent}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export file
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-3.5 w-3.5" /> Import file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = '';
              }}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
