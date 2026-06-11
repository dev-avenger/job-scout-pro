import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Columns, Eye, EyeOff, GripVertical, Pencil, X } from 'lucide-react';
import type { TemplateConfig } from '@auto-job-apply/shared-types';
import { isCustomSectionId } from '@auto-job-apply/shared-types';
import {
  SectionContent,
  sectionHasContent,
  sectionLabel,
  type ResumeRenderData,
} from '@auto-job-apply/resume-renderer';
import { useResumeBuilderStore } from '../../../stores/resume-builder-store';
import { cn } from '../../../lib/utils';

interface SectionBlockProps {
  sectionId: string;
  data: ResumeRenderData;
  config: TemplateConfig;
  hidden: boolean;
  /** inner item columns (1–3) */
  columns?: number;
  /** Europass-style label-left rendering */
  labelLeft?: boolean;
  onEditCustom?: (customSectionUuid: string) => void;
  /** inline WYSIWYG text editing */
  onFieldEdit?: (path: string, value: string) => void;
}

export function SectionBlock({
  sectionId,
  data,
  config,
  hidden,
  columns,
  labelLeft,
  onEditCustom,
  onFieldEdit,
}: SectionBlockProps) {
  const { toggleSectionHidden, removeSectionFromLayout, setSectionColumns } = useResumeBuilderStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
  });

  const label = sectionLabel(sectionId, data);
  const hasContent = sectionHasContent(sectionId, data);
  const isCustom = isCustomSectionId(sectionId);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/block relative rounded-sm transition-shadow',
        isDragging && 'z-20 opacity-60 ring-2 ring-primary/60',
        !isDragging && 'hover:ring-1 hover:ring-primary/40',
        hidden && 'opacity-40',
      )}
      data-section-id={sectionId}
    >
      {/* Hover controls */}
      <div className="absolute -top-2.5 right-1 z-10 hidden items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm group-hover/block:flex">
        <button
          type="button"
          className="cursor-grab p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          title={`Drag ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {isCustom && onEditCustom && (
          <button
            type="button"
            className="p-0.5 text-muted-foreground hover:text-foreground"
            title="Edit custom section"
            onClick={() => onEditCustom(sectionId.slice('custom.'.length))}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-0.5 p-0.5 text-muted-foreground hover:text-foreground"
          title={`Item columns: ${columns ?? 1} (click to change)`}
          onClick={() => setSectionColumns(sectionId, ((columns ?? 1) % 3) + 1)}
        >
          <Columns className="h-3.5 w-3.5" />
          <span className="text-[9px] font-semibold">{columns ?? 1}</span>
        </button>
        <button
          type="button"
          className="p-0.5 text-muted-foreground hover:text-foreground"
          title={hidden ? 'Show section' : 'Hide section'}
          onClick={() => toggleSectionHidden(sectionId)}
        >
          {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          className="p-0.5 text-muted-foreground hover:text-destructive"
          title="Remove from layout"
          onClick={() => removeSectionFromLayout(sectionId)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {hasContent ? (
        <SectionContent
          sectionId={sectionId}
          data={data}
          config={config}
          columns={columns}
          labelLeft={labelLeft}
          onFieldEdit={onFieldEdit}
        />
      ) : (
        <div className="mb-2 rounded border border-dashed border-muted-foreground/30 p-2 text-center text-[10px] text-muted-foreground">
          {label} — no content yet
        </div>
      )}
    </div>
  );
}
