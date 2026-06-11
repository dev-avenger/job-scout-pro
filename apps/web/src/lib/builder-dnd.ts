import type { BuilderLayoutState } from '@auto-job-apply/shared-types';

export const LIBRARY_DRAG_PREFIX = 'lib:';

type LayoutPages = BuilderLayoutState['pages'];

export interface DropPosition {
  page: number;
  row: number;
  cell: number;
  index: number;
}

export function makeCellId(page: number, row: number, cell: number): string {
  return `cell:${page}:${row}:${cell}`;
}

export function parseCellId(id: string): { page: number; row: number; cell: number } | null {
  const match = /^cell:(\d+):(\d+):(\d+)$/.exec(id);
  if (!match) return null;
  return { page: Number(match[1]), row: Number(match[2]), cell: Number(match[3]) };
}

export function findSectionPosition(pages: LayoutPages, sectionId: string): DropPosition | null {
  for (let p = 0; p < pages.length; p++) {
    const page = pages[p] ?? [];
    for (let r = 0; r < page.length; r++) {
      const cells = page[r]?.cells ?? [];
      for (let c = 0; c < cells.length; c++) {
        const i = cells[c]!.sections.indexOf(sectionId);
        if (i !== -1) return { page: p, row: r, cell: c, index: i };
      }
    }
  }
  return null;
}

export type ResolvedDrop =
  | { kind: 'add'; sectionId: string; target: DropPosition }
  | { kind: 'move'; sectionId: string; target: DropPosition }
  | { kind: 'noop' };

/**
 * Pure resolution of a dnd-kit drag end event into a layout operation.
 * - Library items (id "lib:<section>") are added at the drop position.
 * - Canvas blocks are moved; dropping on a cell appends to that cell,
 *   dropping on another block takes that block's position.
 */
export function resolveDrop(activeId: string, overId: string | null, pages: LayoutPages): ResolvedDrop {
  if (!overId) return { kind: 'noop' };

  const fromLibrary = activeId.startsWith(LIBRARY_DRAG_PREFIX);
  const sectionId = fromLibrary ? activeId.slice(LIBRARY_DRAG_PREFIX.length) : activeId;

  let target: DropPosition | null = null;
  const cellTarget = parseCellId(overId);
  if (cellTarget) {
    const length = pages[cellTarget.page]?.[cellTarget.row]?.cells[cellTarget.cell]?.sections.length;
    if (length === undefined) return { kind: 'noop' };
    target = { ...cellTarget, index: length };
  } else if (overId !== activeId) {
    target = findSectionPosition(pages, overId);
  }
  if (!target) return { kind: 'noop' };

  if (fromLibrary) return { kind: 'add', sectionId, target };
  if (sectionId === overId) return { kind: 'noop' };
  return { kind: 'move', sectionId, target };
}
