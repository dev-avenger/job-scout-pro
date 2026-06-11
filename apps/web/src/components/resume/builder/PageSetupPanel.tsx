import type { PageFormat } from '@auto-job-apply/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { FileText } from 'lucide-react';
import { useResumeBuilderStore } from '../../../stores/resume-builder-store';

export function PageSetupPanel() {
  const { templateConfig, updateTemplateConfig, setTwoColumn, layoutState } = useResumeBuilderStore();
  const twoColumn = (layoutState.pages[0] ?? []).some((row) => row.cells.length > 1);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          Page setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Page format</Label>
          <Select
            value={templateConfig.pageFormat ?? 'a4'}
            onValueChange={(v) => updateTemplateConfig({ pageFormat: v as PageFormat })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
              <SelectItem value="letter">US Letter (8.5 × 11 in)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Two-column layout</Label>
          <Switch checked={twoColumn} onCheckedChange={setTwoColumn} />
        </div>

        {!twoColumn && (
          <div className="space-y-1.5">
            <Label className="text-xs">Section titles</Label>
            <Select
              value={templateConfig.layoutVariant ?? 'standard'}
              onValueChange={(v) =>
                updateTemplateConfig({ layoutVariant: v as 'standard' | 'label-left' })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Above content (standard)</SelectItem>
                <SelectItem value="label-left">Left gutter (Europass style)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {twoColumn && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              Sidebar width: {templateConfig.sidebarWidthPercent || 33}%
            </Label>
            <Slider
              min={20}
              max={50}
              step={1}
              value={[templateConfig.sidebarWidthPercent || 33]}
              onValueChange={([v]) => updateTemplateConfig({ sidebarWidthPercent: v })}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Show photo</Label>
            <p className="text-[10px] text-muted-foreground">Requires a photo URL in region fields</p>
          </div>
          <Switch
            checked={templateConfig.showPhoto ?? false}
            onCheckedChange={(v) => updateTemplateConfig({ showPhoto: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Personal details</Label>
            <p className="text-[10px] text-muted-foreground">DOB, nationality, CNIC… (Europass/PK)</p>
          </div>
          <Switch
            checked={templateConfig.showPersonalDetails ?? false}
            onCheckedChange={(v) => updateTemplateConfig({ showPersonalDetails: v })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Date format</Label>
          <Select
            value={templateConfig.dateFormat ?? 'MM/YYYY'}
            onValueChange={(v) => updateTemplateConfig({ dateFormat: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/YYYY">MM/YYYY (US/UK)</SelectItem>
              <SelectItem value="MM.YYYY">MM.YYYY (EU)</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
