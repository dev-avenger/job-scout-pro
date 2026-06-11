import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Palette, RotateCcw } from 'lucide-react';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';
import type { TemplateColors, TemplateTypography, TemplateSpacing } from '@auto-job-apply/shared-types';

const WEB_SAFE_FONTS = [
  "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "'Georgia', serif",
  "'Times New Roman', Times, serif",
  "'Courier New', Courier, monospace",
  "'Verdana', Geneva, sans-serif",
  "'Trebuchet MS', Helvetica, sans-serif",
  "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  "'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
];

export function ThemeCustomizer() {
  const {
    templateConfig,
    customColors, setCustomColors,
    customTypography, setCustomTypography,
    customSpacing, setCustomSpacing,
    resetCustomizations,
  } = useResumeBuilderStore();

  const colors = { ...templateConfig.colors, ...customColors };
  const typography = { ...templateConfig.typography, ...customTypography };
  const spacing = { ...templateConfig.spacing, ...customSpacing };

  const updateColor = (key: keyof TemplateColors, value: string) => {
    setCustomColors({ ...customColors, [key]: value });
  };

  const updateFont = (key: 'headingFont' | 'bodyFont', value: string) => {
    setCustomTypography({ ...customTypography, [key]: value });
  };

  const updateSpacing = (key: keyof TemplateSpacing, value: number) => {
    setCustomSpacing({ ...customSpacing, [key]: value });
  };

  const colorFields: { key: keyof TemplateColors; label: string }[] = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
    { key: 'text', label: 'Text' },
    { key: 'background', label: 'Background' },
  ];

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Palette className="h-4 w-4" />
            Customize Theme
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={resetCustomizations}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Colors */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Colors</p>
          <div className="grid grid-cols-2 gap-2">
            {colorFields.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border border-input"
                />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Fonts</p>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Heading Font</label>
              <select
                value={typography.headingFont ?? WEB_SAFE_FONTS[0]}
                onChange={(e) => updateFont('headingFont', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {WEB_SAFE_FONTS.map((f) => (
                  <option key={f} value={f}>{(f.split(',')[0] ?? f).replace(/'/g, '')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Body Font</label>
              <select
                value={typography.bodyFont ?? WEB_SAFE_FONTS[0]}
                onChange={(e) => updateFont('bodyFont', e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {WEB_SAFE_FONTS.map((f) => (
                  <option key={f} value={f}>{(f.split(',')[0] ?? f).replace(/'/g, '')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Spacing */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Spacing</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground">Margin</label>
                <span className="text-[10px] text-muted-foreground">{spacing.marginPt}pt</span>
              </div>
              <Slider
                value={[spacing.marginPt]}
                onValueChange={([v]) => updateSpacing('marginPt', v ?? 40)}
                min={20}
                max={80}
                step={5}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground">Section Gap</label>
                <span className="text-[10px] text-muted-foreground">{spacing.sectionGapPt}pt</span>
              </div>
              <Slider
                value={[spacing.sectionGapPt]}
                onValueChange={([v]) => updateSpacing('sectionGapPt', v ?? 16)}
                min={4}
                max={30}
                step={2}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-muted-foreground">Entry Gap</label>
                <span className="text-[10px] text-muted-foreground">{spacing.entryGapPt}pt</span>
              </div>
              <Slider
                value={[spacing.entryGapPt]}
                onValueChange={([v]) => updateSpacing('entryGapPt', v ?? 8)}
                min={2}
                max={16}
                step={1}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
