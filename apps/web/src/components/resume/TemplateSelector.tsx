import { cn } from '../../lib/utils';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';
import { Check, Layout, Palette } from 'lucide-react';
import type { LayoutType, ThemeType } from '@auto-job-apply/shared-types';

const LAYOUTS: { id: LayoutType; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Single column, centered' },
  { id: 'modern', label: 'Modern', desc: '2-column sidebar' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean, wide margins' },
  { id: 'creative', label: 'Creative', desc: 'Colored header band' },
];

const THEMES: { id: ThemeType; label: string; swatch: string }[] = [
  { id: 'default', label: 'Navy', swatch: '#1e3a5f' },
  { id: 'blue', label: 'Blue', swatch: '#1e40af' },
  { id: 'green', label: 'Green', swatch: '#065f46' },
  { id: 'dark', label: 'Dark', swatch: '#111827' },
];

export function TemplateSelector() {
  const { selectedLayout, selectedTheme, setSelectedLayout, setSelectedTheme } = useResumeBuilderStore();

  return (
    <div className="space-y-4">
      {/* Layouts */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Layout className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layout</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map(({ id, label, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedLayout(id)}
              className={cn(
                'relative rounded-lg border p-2 text-left transition-all hover:shadow-sm',
                selectedLayout === id
                  ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30',
              )}
            >
              {selectedLayout === id && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </div>
              )}
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Themes */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme</h3>
        </div>
        <div className="flex gap-2">
          {THEMES.map(({ id, label, swatch }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedTheme(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all hover:shadow-sm',
                selectedTheme === id
                  ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30',
              )}
            >
              <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: swatch }} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
