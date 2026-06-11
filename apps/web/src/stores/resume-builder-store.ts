import { create } from 'zustand';
import { temporal } from 'zundo';
import type {
  BuilderLayoutState,
  LayoutCell,
  LayoutType,
  PageRows,
  SectionOrderItem,
  TemplateColors,
  TemplateConfig,
  ThemeType,
} from '@auto-job-apply/shared-types';
import {
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  isCustomSectionId,
  migrateLayoutState,
  placedSectionIds,
} from '@auto-job-apply/shared-types';
import { getTemplateConfig } from '../lib/template-config';

export interface SectionPosition {
  page: number;
  row: number;
  cell: number;
  index: number;
}

/* ------------------------------ helpers ----------------------------------- */

type LayoutPages = BuilderLayoutState['pages'];

function clonePages(pages: LayoutPages): LayoutPages {
  return pages.map((page) =>
    page.map((row) => ({
      cells: row.cells.map((cell) => ({ ...cell, sections: [...cell.sections] })),
    })),
  );
}

function removeFromPages(pages: LayoutPages, sectionId: string): LayoutPages {
  return pages.map((page) =>
    page.map((row) => ({
      cells: row.cells.map((cell) => ({
        ...cell,
        sections: cell.sections.filter((id) => id !== sectionId),
      })),
    })),
  );
}

function emptyRow(): PageRows[number] {
  return { cells: [{ sections: [] }] };
}

function pageSections(page: PageRows): string[] {
  return page.flatMap((row) => row.cells.flatMap((cell) => cell.sections));
}

function lastCellOf(pages: LayoutPages): LayoutCell | undefined {
  const lastPage = pages[pages.length - 1];
  const lastRow = lastPage?.[lastPage.length - 1];
  return lastRow?.cells[lastRow.cells.length - 1];
}

function mirrorSectionOrder(layoutState: BuilderLayoutState): SectionOrderItem[] {
  const hidden = new Set(layoutState.hiddenSections);
  return placedSectionIds(layoutState.pages).map((id) => ({
    id,
    label: SECTION_LABELS[id] ?? (isCustomSectionId(id) ? 'Custom section' : id),
    visible: !hidden.has(id),
  }));
}

function layoutFromConfig(config: TemplateConfig, previous?: BuilderLayoutState): BuilderLayoutState {
  const pages = migrateLayoutState(undefined, config).pages;

  // Carry over custom sections that would otherwise be dropped
  if (previous) {
    const placed = new Set(placedSectionIds(pages));
    const lostCustom = placedSectionIds(previous.pages).filter(
      (id) => isCustomSectionId(id) && !placed.has(id),
    );
    if (lostCustom.length > 0) {
      lastCellOf(pages)?.sections.push(...lostCustom);
    }
  }

  return {
    version: 3,
    pages,
    hiddenSections: previous?.hiddenSections ?? [],
    sectionColumns: config.sectionColumns ?? previous?.sectionColumns,
  };
}

/* -------------------------------- store ----------------------------------- */

interface ResumeBuilderState {
  /** v3 source of truth for section placement (pages -> rows -> cells) */
  layoutState: BuilderLayoutState;
  /** legacy mirror consumed by the profile-detail panel */
  sectionOrder: SectionOrderItem[];
  selectedLayout: LayoutType;
  selectedTheme: ThemeType;
  templateConfig: TemplateConfig;
  showPreview: boolean;
  activeVersionId: string | null;
  /** unsaved builder changes (autosave flag) */
  dirty: boolean;

  // Custom theme overrides
  customColors: Partial<TemplateColors> | null;
  customTypography: Partial<TemplateConfig['typography']> | null;
  customSpacing: Partial<TemplateConfig['spacing']> | null;

  // v3 actions
  setLayoutState: (layoutState: BuilderLayoutState) => void;
  moveSection: (sectionId: string, to: SectionPosition) => void;
  addSectionToLayout: (sectionId: string, to?: SectionPosition) => void;
  removeSectionFromLayout: (sectionId: string) => void;
  toggleSectionHidden: (sectionId: string) => void;
  /** Set how many inner columns a section's items flow in (1–3) */
  setSectionColumns: (sectionId: string, columns: number) => void;
  addPage: () => void;
  removePage: (pageIndex: number) => void;
  /** Insert an empty single-cell row (at the end when atIndex is omitted) */
  addRow: (page: number, atIndex?: number) => void;
  /** Remove a row; its sections move to the neighbouring row */
  removeRow: (page: number, row: number) => void;
  /** Split a row into 1–3 cells (merging sections back into the first cell when shrinking) */
  setRowCellCount: (page: number, row: number, count: 1 | 2 | 3) => void;
  /** Set a cell's width within its row (clamped to 15–85%) */
  setCellWidth: (page: number, row: number, cell: number, widthPercent: number) => void;
  /** Toggle the tinted (sidebar-look) background of a cell */
  toggleCellTint: (page: number, row: number, cell: number) => void;
  applyTemplateConfig: (config: TemplateConfig) => void;
  /** Patch design fields without touching section placement */
  updateTemplateConfig: (partial: Partial<TemplateConfig>) => void;
  /** Restructure every page to one or two columns */
  setTwoColumn: (enabled: boolean) => void;
  markSaved: () => void;

  // legacy + shared actions
  setSectionOrder: (order: SectionOrderItem[]) => void;
  toggleSectionVisibility: (id: string) => void;
  setSelectedLayout: (layout: LayoutType) => void;
  setSelectedTheme: (theme: ThemeType) => void;
  setShowPreview: (show: boolean) => void;
  initFromProfile: (sectionOrder?: unknown) => void;
  setActiveVersionId: (id: string | null) => void;

  setCustomColors: (colors: Partial<TemplateColors> | null) => void;
  setCustomTypography: (typography: Partial<TemplateConfig['typography']> | null) => void;
  setCustomSpacing: (spacing: Partial<TemplateConfig['spacing']> | null) => void;
  resetCustomizations: () => void;
}

const initialConfig = getTemplateConfig('classic', 'default');
const initialLayout = migrateLayoutState(undefined, initialConfig);

export const useResumeBuilderStore = create<ResumeBuilderState>()(
  temporal(
    (set) => ({
      layoutState: initialLayout,
      sectionOrder: DEFAULT_SECTION_ORDER,
      selectedLayout: 'classic',
      selectedTheme: 'default',
      templateConfig: initialConfig,
      showPreview: false,
      activeVersionId: null,
      dirty: false,
      customColors: null,
      customTypography: null,
      customSpacing: null,

      /* ------------------------------ v3 ------------------------------ */

      setLayoutState: (layoutState) =>
        set({ layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true }),

      moveSection: (sectionId, to) =>
        set((state) => {
          const pages = removeFromPages(clonePages(state.layoutState.pages), sectionId);
          const cell = pages[to.page]?.[to.row]?.cells[to.cell];
          if (!cell) return state;
          cell.sections.splice(Math.min(to.index, cell.sections.length), 0, sectionId);
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      addSectionToLayout: (sectionId, to) =>
        set((state) => {
          if (placedSectionIds(state.layoutState.pages).includes(sectionId)) return state;
          const pages = clonePages(state.layoutState.pages);
          const target = to ? pages[to.page]?.[to.row]?.cells[to.cell] : undefined;
          if (to && target) {
            target.sections.splice(Math.min(to.index, target.sections.length), 0, sectionId);
          } else {
            lastCellOf(pages)?.sections.push(sectionId);
          }
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      removeSectionFromLayout: (sectionId) =>
        set((state) => {
          const pages = removeFromPages(clonePages(state.layoutState.pages), sectionId);
          const layoutState = {
            ...state.layoutState,
            pages,
            hiddenSections: state.layoutState.hiddenSections.filter((id) => id !== sectionId),
          };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      toggleSectionHidden: (sectionId) =>
        set((state) => {
          const hidden = state.layoutState.hiddenSections.includes(sectionId)
            ? state.layoutState.hiddenSections.filter((id) => id !== sectionId)
            : [...state.layoutState.hiddenSections, sectionId];
          const layoutState = { ...state.layoutState, hiddenSections: hidden };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      setSectionColumns: (sectionId, columns) =>
        set((state) => {
          const clamped = Math.min(Math.max(Math.round(columns), 1), 3);
          const sectionColumns = { ...(state.layoutState.sectionColumns ?? {}) };
          if (clamped <= 1) delete sectionColumns[sectionId];
          else sectionColumns[sectionId] = clamped;
          return {
            layoutState: { ...state.layoutState, sectionColumns },
            dirty: true,
          };
        }),

      addPage: () =>
        set((state) => {
          const pages = clonePages(state.layoutState.pages);
          pages.push([emptyRow()]);
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, dirty: true };
        }),

      removePage: (pageIndex) =>
        set((state) => {
          if (state.layoutState.pages.length <= 1) return state;
          const pages = clonePages(state.layoutState.pages);
          const [removed] = pages.splice(pageIndex, 1);
          const target = pages[Math.max(0, pageIndex - 1)];
          if (removed && target) {
            // merge the removed page's rows into the previous page
            target.push(...removed);
          }
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      addRow: (pageIndex, atIndex) =>
        set((state) => {
          const pages = clonePages(state.layoutState.pages);
          const page = pages[pageIndex];
          if (!page) return state;
          const at = Math.min(Math.max(atIndex ?? page.length, 0), page.length);
          page.splice(at, 0, emptyRow());
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, dirty: true };
        }),

      removeRow: (pageIndex, rowIndex) =>
        set((state) => {
          const pages = clonePages(state.layoutState.pages);
          const page = pages[pageIndex];
          const row = page?.[rowIndex];
          if (!page || !row) return state;
          if (page.length <= 1) {
            // a page always keeps at least one (empty) row
            page[rowIndex] = emptyRow();
          } else {
            const sections = row.cells.flatMap((cell) => cell.sections);
            page.splice(rowIndex, 1);
            const target = rowIndex > 0 ? page[rowIndex - 1] : page[0];
            target?.cells[0]?.sections.push(...sections);
          }
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      setRowCellCount: (pageIndex, rowIndex, count) =>
        set((state) => {
          const clamped = Math.min(Math.max(Math.round(count), 1), 3);
          const pages = clonePages(state.layoutState.pages);
          const row = pages[pageIndex]?.[rowIndex];
          if (!row || row.cells.length === clamped) return state;
          let cells: LayoutCell[];
          if (clamped < row.cells.length) {
            cells = row.cells.slice(0, clamped);
            const extra = row.cells.slice(clamped).flatMap((cell) => cell.sections);
            cells[0]!.sections.push(...extra);
          } else {
            cells = [...row.cells];
            while (cells.length < clamped) cells.push({ sections: [] });
          }
          if (clamped === 2) {
            cells[0]!.widthPercent = 50;
            delete cells[1]!.widthPercent;
          } else {
            for (const cell of cells) delete cell.widthPercent;
          }
          row.cells = cells;
          const layoutState = { ...state.layoutState, pages };
          return { layoutState, sectionOrder: mirrorSectionOrder(layoutState), dirty: true };
        }),

      setCellWidth: (pageIndex, rowIndex, cellIndex, widthPercent) =>
        set((state) => {
          const pages = clonePages(state.layoutState.pages);
          const cell = pages[pageIndex]?.[rowIndex]?.cells[cellIndex];
          if (!cell) return state;
          cell.widthPercent = Math.min(Math.max(Math.round(widthPercent), 15), 85);
          return { layoutState: { ...state.layoutState, pages }, dirty: true };
        }),

      toggleCellTint: (pageIndex, rowIndex, cellIndex) =>
        set((state) => {
          const pages = clonePages(state.layoutState.pages);
          const cell = pages[pageIndex]?.[rowIndex]?.cells[cellIndex];
          if (!cell) return state;
          cell.tinted = !cell.tinted;
          return { layoutState: { ...state.layoutState, pages }, dirty: true };
        }),

      applyTemplateConfig: (config) =>
        set((state) => {
          const layoutState = layoutFromConfig(config, state.layoutState);
          return {
            templateConfig: config,
            selectedLayout: config.layout,
            selectedTheme: config.theme,
            customColors: null,
            customTypography: null,
            customSpacing: null,
            layoutState,
            sectionOrder: mirrorSectionOrder(layoutState),
            dirty: true,
          };
        }),

      updateTemplateConfig: (partial) =>
        set((state) => ({
          templateConfig: { ...state.templateConfig, ...partial },
          dirty: true,
        })),

      setTwoColumn: (enabled) =>
        set((state) => {
          const pages = state.layoutState.pages.map((page) => {
            const all = pageSections(page);
            if (enabled) {
              if (page.some((row) => row.cells.length > 1)) return clonePages([page])[0]!;
              const sidebarDefaults = ['skills', 'languages', 'certifications', 'education'];
              const sidebar = all.filter((id) => sidebarDefaults.includes(id));
              const main = all.filter((id) => !sidebarDefaults.includes(id));
              return [
                {
                  cells: [
                    { widthPercent: 33, tinted: true, sections: sidebar },
                    { sections: main },
                  ],
                },
              ];
            }
            return [{ cells: [{ sections: all }] }];
          });
          const layoutState = { ...state.layoutState, pages };
          return {
            layoutState,
            templateConfig: {
              ...state.templateConfig,
              sidebarEnabled: enabled,
              sidebarWidthPercent: enabled
                ? state.templateConfig.sidebarWidthPercent || 33
                : state.templateConfig.sidebarWidthPercent,
            },
            sectionOrder: mirrorSectionOrder(layoutState),
            dirty: true,
          };
        }),

      markSaved: () => set({ dirty: false }),

      /* ---------------------------- legacy ----------------------------- */

      setSectionOrder: (order) =>
        set((state) => {
          // Reorder within the existing page/row structure where possible.
          const layoutState = migrateLayoutState(order, state.templateConfig);
          return { sectionOrder: order, layoutState, dirty: true };
        }),

      toggleSectionVisibility: (id) =>
        set((state) => {
          const hidden = state.layoutState.hiddenSections.includes(id)
            ? state.layoutState.hiddenSections.filter((h) => h !== id)
            : [...state.layoutState.hiddenSections, id];
          const layoutState = { ...state.layoutState, hiddenSections: hidden };
          return {
            layoutState,
            sectionOrder: state.sectionOrder.map((item) =>
              item.id === id ? { ...item, visible: !item.visible } : item,
            ),
            dirty: true,
          };
        }),

      setSelectedLayout: (layout) =>
        set((state) => {
          const config = getTemplateConfig(layout, state.selectedTheme);
          const layoutState = layoutFromConfig(
            { ...config, pages: undefined, pageRows: undefined },
            state.layoutState,
          );
          return {
            selectedLayout: layout,
            templateConfig: config,
            layoutState,
            sectionOrder: mirrorSectionOrder(layoutState),
            dirty: true,
          };
        }),

      setSelectedTheme: (theme) =>
        set((state) => ({
          selectedTheme: theme,
          templateConfig: getTemplateConfig(state.selectedLayout, theme),
          dirty: true,
        })),

      setShowPreview: (show) => set({ showPreview: show }),

      initFromProfile: (sectionOrder) =>
        set((state) => {
          const layoutState = migrateLayoutState(sectionOrder, state.templateConfig);
          return {
            layoutState,
            sectionOrder: mirrorSectionOrder(layoutState),
            dirty: false,
          };
        }),

      setActiveVersionId: (id) => set({ activeVersionId: id }),

      setCustomColors: (colors) => set({ customColors: colors, dirty: true }),
      setCustomTypography: (typography) => set({ customTypography: typography, dirty: true }),
      setCustomSpacing: (spacing) => set({ customSpacing: spacing, dirty: true }),
      resetCustomizations: () =>
        set({ customColors: null, customTypography: null, customSpacing: null, dirty: true }),
    }),
    {
      limit: 100,
      partialize: (state) => ({
        layoutState: state.layoutState,
        templateConfig: state.templateConfig,
        selectedLayout: state.selectedLayout,
        selectedTheme: state.selectedTheme,
        sectionOrder: state.sectionOrder,
        customColors: state.customColors,
        customTypography: state.customTypography,
        customSpacing: state.customSpacing,
      }),
      equality: (past, current) => JSON.stringify(past) === JSON.stringify(current),
    },
  ),
);
