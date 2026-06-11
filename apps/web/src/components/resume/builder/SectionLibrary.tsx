import { useDraggable } from '@dnd-kit/core';
import {
  Award,
  BookOpen,
  Brain,
  Briefcase,
  FileText,
  FolderOpen,
  GraduationCap,
  GripVertical,
  Heart,
  LayoutList,
  Plus,
  UserPlus,
  Languages as LanguagesIcon,
} from 'lucide-react';
import type { CustomSection } from '@auto-job-apply/shared-types';
import {
  BUILT_IN_SECTION_IDS,
  SECTION_LABELS,
  customSectionRef,
  placedSectionIds,
} from '@auto-job-apply/shared-types';
import { useResumeBuilderStore } from '../../../stores/resume-builder-store';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';

export { LIBRARY_DRAG_PREFIX } from '../../../lib/builder-dnd';
import { LIBRARY_DRAG_PREFIX } from '../../../lib/builder-dnd';

const SECTION_ICONS: Record<string, React.ElementType> = {
  summary: FileText,
  skills: Brain,
  experience: Briefcase,
  education: GraduationCap,
  projects: FolderOpen,
  certifications: Award,
  languages: LanguagesIcon,
  publications: BookOpen,
  volunteer: Heart,
  references: UserPlus,
};

function LibraryItem({ sectionId, label, placed }: { sectionId: string; label: string; placed: boolean }) {
  const { addSectionToLayout } = useResumeBuilderStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${LIBRARY_DRAG_PREFIX}${sectionId}`,
    disabled: placed,
  });

  const Icon = SECTION_ICONS[sectionId] ?? LayoutList;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-card p-2 text-sm transition-colors',
        placed ? 'opacity-45' : 'hover:bg-muted/50',
        isDragging && 'opacity-30',
      )}
    >
      <button
        type="button"
        className={cn(
          'touch-none text-muted-foreground',
          placed ? 'cursor-not-allowed' : 'cursor-grab hover:text-foreground active:cursor-grabbing',
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate font-medium">{label}</span>
      {placed ? (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">On page</span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5"
          title="Add to layout"
          onClick={() => addSectionToLayout(sectionId)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function SectionLibrary({
  customSections,
  onAddCustomSection,
}: {
  customSections: CustomSection[];
  onAddCustomSection: () => void;
}) {
  const layoutState = useResumeBuilderStore((s) => s.layoutState);
  const placed = new Set(placedSectionIds(layoutState.pages));

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Standard sections
        </h3>
        <div className="space-y-1.5">
          {BUILT_IN_SECTION_IDS.map((id) => (
            <LibraryItem key={id} sectionId={id} label={SECTION_LABELS[id] ?? id} placed={placed.has(id)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Custom sections
        </h3>
        <div className="space-y-1.5">
          {customSections.map((cs) => (
            <LibraryItem
              key={cs.id}
              sectionId={customSectionRef(cs.id)}
              label={cs.title}
              placed={placed.has(customSectionRef(cs.id))}
            />
          ))}
          {customSections.length === 0 && (
            <p className="rounded border border-dashed p-2 text-xs text-muted-foreground">
              No custom sections yet.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={onAddCustomSection}>
          <Plus className="mr-1 h-4 w-4" /> Add custom section
        </Button>
      </div>

      <p className="mt-auto text-[11px] leading-snug text-muted-foreground">
        Drag sections onto the page, between columns, or across pages. Use the eye icon on a block to
        hide it without losing its position.
      </p>
    </div>
  );
}
