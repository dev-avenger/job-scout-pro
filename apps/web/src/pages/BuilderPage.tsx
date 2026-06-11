import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowLeft, Check, Download, Loader2, Redo2, Undo2 } from 'lucide-react';
import type { CustomSection } from '@auto-job-apply/shared-types';
import { customSectionRef, placedSectionIds } from '@auto-job-apply/shared-types';
import { normalizeResumeData, sectionLabel } from '@auto-job-apply/resume-renderer';
import { apiClient } from '../api/client';
import { useResumeBuilderStore } from '../stores/resume-builder-store';
import { mergeTemplateConfig } from '../lib/template-config';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { BuilderCanvas } from '../components/resume/builder/BuilderCanvas';
import { resolveDrop } from '../lib/builder-dnd';
import { LIBRARY_DRAG_PREFIX, SectionLibrary } from '../components/resume/builder/SectionLibrary';
import { PageSetupPanel } from '../components/resume/builder/PageSetupPanel';
import { TemplatesPanel } from '../components/resume/builder/TemplatesPanel';
import { TemplateGallery } from '../components/resume/TemplateGallery';
import { ThemeCustomizer } from '../components/resume/ThemeCustomizer';
import { CustomSectionEditor } from '../components/resume/CustomSectionEditor';
import type { Profile } from '../types/resume';

type ProfileWithCustom = Profile & { customSections?: CustomSection[] };

/**
 * Immutably set a dot-separated path inside an array/object tree.
 * Numeric segments index arrays; the final value replaces the leaf.
 */
function setPath(target: unknown, segments: string[], value: string): unknown {
  const seg = segments[0];
  if (seg === undefined) return value;
  if (Array.isArray(target)) {
    const idx = Number(seg);
    if (!Number.isInteger(idx) || idx < 0 || idx >= target.length) return target;
    const next = [...target];
    next[idx] = setPath(target[idx], segments.slice(1), value);
    return next;
  }
  if (target && typeof target === 'object') {
    const record = target as Record<string, unknown>;
    return { ...record, [seg]: setPath(record[seg], segments.slice(1), value) };
  }
  return target;
}

export function BuilderPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<ProfileWithCustom | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const store = useResumeBuilderStore();
  const {
    layoutState,
    templateConfig,
    customColors,
    customTypography,
    customSpacing,
    initFromProfile,
    moveSection,
    addSectionToLayout,
    dirty,
    markSaved,
  } = store;

  const config = mergeTemplateConfig(templateConfig, customColors, customTypography, customSpacing);
  const data = normalizeResumeData(profile ?? {});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ------------------------------ data load ------------------------------ */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await apiClient.get<ProfileWithCustom>(`/profiles/${profileId}`);
        if (cancelled) return;
        setProfile(p);
        initFromProfile(p.sectionOrder);
        // Place any persisted custom sections that aren't in the layout yet
        const placed = new Set(placedSectionIds(useResumeBuilderStore.getState().layoutState.pages));
        for (const cs of p.customSections ?? []) {
          const ref = customSectionRef(cs.id);
          if (!placed.has(ref)) useResumeBuilderStore.getState().addSectionToLayout(ref);
        }
        useResumeBuilderStore.getState().markSaved();
        useResumeBuilderStore.temporal.getState().clear();
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  /* ------------------------------- autosave ------------------------------ */

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || !profile) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await apiClient.put(`/profiles/${profile.id}`, {
          sectionOrder: useResumeBuilderStore.getState().layoutState,
        });
        markSaved();
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, layoutState, profile?.id]);

  /* ----------------------------- drag handling --------------------------- */

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    const drop = resolveDrop(
      String(active.id),
      over ? String(over.id) : null,
      useResumeBuilderStore.getState().layoutState.pages,
    );
    if (drop.kind === 'add') addSectionToLayout(drop.sectionId, drop.target);
    else if (drop.kind === 'move') moveSection(drop.sectionId, drop.target);
  };

  /* --------------------------- inline editing ---------------------------- */

  /**
   * WYSIWYG edit from the canvas: deep-update the profile immutably and
   * persist the changed top-level field right away.
   */
  const applyFieldEdit = async (path: string, value: string) => {
    if (!profile) return;
    const segments = path.split('.');
    const field = segments[0];
    if (!field) return;
    const current = profile as unknown as Record<string, unknown>;
    let updated: unknown;

    if (field === 'name' || field === 'summary') {
      updated = value;
    } else if (field === 'skills') {
      if (segments.length === 1) {
        updated = value.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        const idx = Number(segments[1]);
        const skills = Array.isArray(current.skills) ? [...(current.skills as unknown[])] : [];
        if (!Number.isInteger(idx) || idx < 0 || idx >= skills.length) return;
        const old = skills[idx];
        skills[idx] =
          old && typeof old === 'object' ? { ...(old as Record<string, unknown>), name: value } : value;
        updated = skills;
      }
    } else if (field === 'customSections') {
      const uuid = segments[1];
      const sections = Array.isArray(current.customSections)
        ? (current.customSections as CustomSection[])
        : [];
      if (!uuid || !sections.some((s) => s.id === uuid)) return;
      updated = sections.map((s) => (s.id === uuid ? (setPath(s, segments.slice(2), value) as CustomSection) : s));
    } else if (
      field === 'experience' ||
      field === 'education' ||
      field === 'projects'
    ) {
      const items = current[field];
      if (!Array.isArray(items)) return;
      updated = setPath(items, segments.slice(1), value);
    } else {
      return;
    }

    setProfile({ ...profile, [field]: updated } as ProfileWithCustom);
    try {
      setSaveState('saving');
      await apiClient.put(`/profiles/${profile.id}`, { [field]: updated });
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  /* --------------------------- custom sections --------------------------- */

  const updateCustomSections = async (sections: CustomSection[]) => {
    if (!profile) return;
    const normalized = sections.map((s) => ({ ...s, type: s.type ?? ('list' as const), items: s.items ?? [] }));
    const previous = profile.customSections ?? [];
    setProfile({ ...profile, customSections: normalized });
    // Newly added sections go straight onto the page
    for (const s of normalized) {
      if (!previous.some((p) => p.id === s.id)) addSectionToLayout(customSectionRef(s.id));
    }
    // Removed sections leave the layout
    for (const p of previous) {
      if (!normalized.some((s) => s.id === p.id)) {
        useResumeBuilderStore.getState().removeSectionFromLayout(customSectionRef(p.id));
      }
    }
    try {
      await apiClient.put(`/profiles/${profile.id}`, { customSections: normalized });
    } catch {
      setSaveState('error');
    }
  };

  /* ------------------------------- undo/redo ----------------------------- */

  const undo = () => useResumeBuilderStore.temporal.getState().undo();
  const redo = () => useResumeBuilderStore.temporal.getState().redo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* -------------------------------- export ------------------------------- */

  const exportPdf = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      await apiClient.downloadBlob(
        `/profiles/${profile.id}/export/pdf`,
        `${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`,
        {
          method: 'POST',
          body: {
            config,
            layoutState: useResumeBuilderStore.getState().layoutState,
          },
        },
      );
    } finally {
      setExporting(false);
    }
  };

  /* --------------------------------- render ------------------------------ */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{loadError ?? 'Profile not found'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/resume">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to profiles
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b pb-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/resume">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-sm font-semibold leading-tight">{profile.name}</h1>
          <p className="text-[11px] text-muted-foreground">Page builder</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            {saveState === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
            {saveState === 'saved' && <Check className="h-3 w-3 text-green-600" />}
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save failed'}
          </span>
          <Button variant="outline" size="sm" onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Three-pane editor */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="flex min-h-0 flex-1">
          {/* Left: section library */}
          <aside className="w-60 shrink-0 overflow-y-auto border-r">
            <SectionLibrary
              customSections={profile.customSections ?? []}
              onAddCustomSection={() => setCustomDialogOpen(true)}
            />
          </aside>

          {/* Center: canvas */}
          <main className="min-w-0 flex-1 overflow-auto bg-muted/40">
            <BuilderCanvas
              data={data}
              config={config}
              onEditCustom={() => setCustomDialogOpen(true)}
              onFieldEdit={(path, value) => void applyFieldEdit(path, value)}
            />
          </main>

          {/* Right: design panel */}
          <aside className="w-80 shrink-0 overflow-y-auto border-l p-3">
            <Tabs defaultValue="design">
              <TabsList className="w-full">
                <TabsTrigger value="design" className="flex-1">
                  Design
                </TabsTrigger>
                <TabsTrigger value="page" className="flex-1">
                  Page
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex-1">
                  Templates
                </TabsTrigger>
              </TabsList>
              <TabsContent value="design" className="space-y-3 pt-3">
                <TemplateGallery />
                <ThemeCustomizer />
              </TabsContent>
              <TabsContent value="page" className="pt-3">
                <PageSetupPanel />
              </TabsContent>
              <TabsContent value="templates" className="pt-3">
                <TemplatesPanel />
              </TabsContent>
            </Tabs>
          </aside>
        </div>

        <DragOverlay>
          {activeDragId && (
            <div className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-lg">
              {sectionLabel(
                activeDragId.startsWith(LIBRARY_DRAG_PREFIX)
                  ? activeDragId.slice(LIBRARY_DRAG_PREFIX.length)
                  : activeDragId,
                data,
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Custom section editor dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Custom sections</DialogTitle>
          </DialogHeader>
          <CustomSectionEditor
            sections={(profile.customSections ?? []) as never}
            onUpdate={updateCustomSections as never}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
