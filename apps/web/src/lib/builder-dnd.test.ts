import { describe, expect, it } from 'vitest';
import type { BuilderLayoutState } from '@auto-job-apply/shared-types';
import { findSectionPosition, makeCellId, parseCellId, resolveDrop } from './builder-dnd';

const pages: BuilderLayoutState['pages'] = [
  [
    { cells: [{ sections: ['summary'] }] },
    {
      cells: [
        { widthPercent: 33, tinted: true, sections: ['skills', 'languages'] },
        { sections: ['experience', 'education'] },
      ],
    },
  ],
  [{ cells: [{ sections: ['projects'] }] }],
];

describe('resolveDrop (full drag pipeline resolution)', () => {
  it('moves a block dropped on a cell to its end', () => {
    expect(resolveDrop('summary', makeCellId(1, 0, 0), pages)).toEqual({
      kind: 'move',
      sectionId: 'summary',
      target: { page: 1, row: 0, cell: 0, index: 1 },
    });
  });

  it('moves a block dropped onto another block to that position', () => {
    expect(resolveDrop('skills', 'education', pages)).toEqual({
      kind: 'move',
      sectionId: 'skills',
      target: { page: 0, row: 1, cell: 1, index: 1 },
    });
  });

  it('adds a library item dropped on a cell', () => {
    expect(resolveDrop('lib:references', makeCellId(0, 1, 0), pages)).toEqual({
      kind: 'add',
      sectionId: 'references',
      target: { page: 0, row: 1, cell: 0, index: 2 },
    });
  });

  it('adds a library item dropped onto an existing block at its position', () => {
    expect(resolveDrop('lib:references', 'summary', pages)).toEqual({
      kind: 'add',
      sectionId: 'references',
      target: { page: 0, row: 0, cell: 0, index: 0 },
    });
  });

  it('handles custom section ids', () => {
    const custom = 'custom.11111111-1111-4111-8111-111111111111';
    expect(resolveDrop(`lib:${custom}`, makeCellId(1, 0, 0), pages)).toEqual({
      kind: 'add',
      sectionId: custom,
      target: { page: 1, row: 0, cell: 0, index: 1 },
    });
  });

  it('no-ops when dropped on itself, nowhere, or an unknown target', () => {
    expect(resolveDrop('summary', 'summary', pages)).toEqual({ kind: 'noop' });
    expect(resolveDrop('summary', null, pages)).toEqual({ kind: 'noop' });
    expect(resolveDrop('summary', 'not-a-real-id', pages)).toEqual({ kind: 'noop' });
    expect(resolveDrop('summary', makeCellId(9, 9, 9), pages)).toEqual({ kind: 'noop' });
  });
});

describe('helpers', () => {
  it('droppable ids round-trip', () => {
    expect(parseCellId(makeCellId(3, 1, 2))).toEqual({ page: 3, row: 1, cell: 2 });
    expect(parseCellId('summary')).toBeNull();
    expect(parseCellId('col:1:2')).toBeNull();
  });

  it('findSectionPosition locates sections across pages, rows, and cells', () => {
    expect(findSectionPosition(pages, 'projects')).toEqual({ page: 1, row: 0, cell: 0, index: 0 });
    expect(findSectionPosition(pages, 'languages')).toEqual({ page: 0, row: 1, cell: 0, index: 1 });
    expect(findSectionPosition(pages, 'missing')).toBeNull();
  });
});
