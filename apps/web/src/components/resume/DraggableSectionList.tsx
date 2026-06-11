import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Briefcase, GraduationCap, FolderOpen, Award, Languages, BookOpen, Heart, UserPlus, FileText, Brain } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';
import type { SectionOrderItem } from '@auto-job-apply/shared-types';

const SECTION_ICONS: Record<string, React.ElementType> = {
  summary: FileText,
  skills: Brain,
  experience: Briefcase,
  education: GraduationCap,
  projects: FolderOpen,
  certifications: Award,
  languages: Languages,
  publications: BookOpen,
  volunteer: Heart,
  references: UserPlus,
};

function SortableItem({ item }: { item: SectionOrderItem }) {
  const { toggleSectionVisibility } = useResumeBuilderStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = SECTION_ICONS[item.id] || FileText;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card p-2.5 hover:bg-muted/50 transition-colors"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium flex-1">{item.label}</span>
      <Switch
        checked={item.visible}
        onCheckedChange={() => toggleSectionVisibility(item.id)}
      />
    </div>
  );
}

export function DraggableSectionList() {
  const { sectionOrder, setSectionOrder } = useResumeBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.findIndex((item) => item.id === active.id);
      const newIndex = sectionOrder.findIndex((item) => item.id === over.id);
      setSectionOrder(arrayMove(sectionOrder, oldIndex, newIndex));
    }
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Section Order
      </h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sectionOrder.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sectionOrder.map((item) => (
              <SortableItem key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
