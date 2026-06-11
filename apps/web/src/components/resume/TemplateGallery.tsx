import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Check, Layout } from 'lucide-react';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';
import { MiniResumePreview, getPreviewColors } from './MiniResumePreview';
import type { LayoutType, ThemeType } from '@auto-job-apply/shared-types';

const LAYOUTS: { id: LayoutType; label: string; description: string }[] = [
  { id: 'classic', label: 'Classic', description: 'Traditional single-column format' },
  { id: 'modern', label: 'Modern', description: 'Two-column with sidebar' },
  { id: 'minimal', label: 'Minimal', description: 'Clean with generous whitespace' },
  { id: 'creative', label: 'Creative', description: 'Bold header with boxed sections' },
];

const THEMES: { id: ThemeType; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'blue', label: 'Blue' },
  { id: 'green', label: 'Green' },
  { id: 'dark', label: 'Dark' },
];

export function TemplateGallery() {
  const { selectedLayout, selectedTheme, setSelectedLayout, setSelectedTheme } = useResumeBuilderStore();

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layout className="h-4 w-4" />
          Template Gallery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="layouts">
          <TabsList className="w-full">
            <TabsTrigger value="layouts" className="flex-1">Layouts</TabsTrigger>
            <TabsTrigger value="themes" className="flex-1">Themes</TabsTrigger>
          </TabsList>

          <TabsContent value="layouts" className="pt-3">
            <div className="grid grid-cols-2 gap-3">
              {LAYOUTS.map((layout) => {
                const isSelected = selectedLayout === layout.id;
                const colors = getPreviewColors(layout.id);
                return (
                  <div
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout.id)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border-2 bg-card p-2.5 transition-all duration-200 hover:shadow-lg',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                        : 'border-border hover:border-muted-foreground/30',
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-md">
                      <MiniResumePreview colors={colors} />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium">{layout.label}</p>
                      <p className="text-[10px] text-muted-foreground">{layout.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="themes" className="pt-3">
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                const colors = getPreviewColors(theme.id);
                return (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border-2 bg-card p-2.5 transition-all duration-200 hover:shadow-lg',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                        : 'border-border hover:border-muted-foreground/30',
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-md">
                      <MiniResumePreview colors={colors} />
                    </div>
                    <p className="mt-2 text-center text-xs font-medium">{theme.label}</p>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
