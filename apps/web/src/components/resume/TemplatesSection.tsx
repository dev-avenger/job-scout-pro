import { useState } from 'react';
import { cn } from '../../lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../ui/card';
import { Separator } from '../ui/separator';
import {
  FileText,
  Palette,
  Layout,
  Globe,
  Check,
} from 'lucide-react';
import type { TemplatesData } from '../../types/resume';
import { MiniResumePreview, getPreviewColors } from './MiniResumePreview';

export function TemplatesSection({ templates }: { templates: TemplatesData | null }) {
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  if (!templates) return null;

  const isEmpty =
    templates.regions.length === 0 &&
    templates.layouts.length === 0 &&
    templates.themes.length === 0;

  if (isEmpty) {
    return (
      <Card className="border-0 shadow-md animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Templates</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No templates available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md animate-fade-in" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg">Templates</CardTitle>
        </div>
        <CardDescription>Choose a region, layout, and theme for your resume.</CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6 space-y-8">
        {/* Regions */}
        {templates.regions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Regions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {templates.regions.map((region) => (
                <Card
                  key={region.id}
                  className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/40 hover:bg-primary/5"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-200">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{region.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{region.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Layouts - Visual Grid */}
        {templates.layouts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Layouts</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {templates.layouts.map((layout) => {
                const colors = getPreviewColors(layout);
                const isSelected = selectedLayout === layout;
                return (
                  <div
                    key={layout}
                    onClick={() => setSelectedLayout(isSelected ? null : layout)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border-2 bg-card p-3 transition-all duration-200 hover:shadow-lg',
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
                    <p className="mt-2 text-center text-xs font-medium truncate">{layout}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Themes - Visual Grid */}
        {templates.themes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Themes</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {templates.themes.map((theme) => {
                const colors = getPreviewColors(theme);
                const isSelected = selectedTheme === theme;
                return (
                  <div
                    key={theme}
                    onClick={() => setSelectedTheme(isSelected ? null : theme)}
                    className={cn(
                      'group relative cursor-pointer rounded-xl border-2 bg-card p-3 transition-all duration-200 hover:shadow-lg',
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
                    <p className="mt-2 text-center text-xs font-medium truncate">{theme}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
