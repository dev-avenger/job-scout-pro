import { beforeEach, describe, expect, it } from 'vitest';
import { placedSectionIds } from '@auto-job-apply/shared-types';
import { useResumeBuilderStore } from './resume-builder-store';

const initialSnapshot = { ...useResumeBuilderStore.getState() };

const pages = () => useResumeBuilderStore.getState().layoutState.pages;
const state = () => useResumeBuilderStore.getState();
const cell = (p: number, r: number, c: number) => pages()[p]![r]!.cells[c]!;
const allPlaced = () => placedSectionIds(pages());

beforeEach(() => {
  useResumeBuilderStore.setState(initialSnapshot, true);
  useResumeBuilderStore.temporal.getState().clear();
});

describe('resume-builder-store layout engine (v3 rows)', () => {
  it('starts with a single-page, single-row, single-cell default layout', () => {
    expect(pages()).toHaveLength(1);
    expect(pages()[0]).toHaveLength(1);
    expect(pages()[0]![0]!.cells).toHaveLength(1);
    expect(cell(0, 0, 0).sections).toContain('summary');
    expect(cell(0, 0, 0).sections).toContain('experience');
  });

  it('moveSection reorders within a cell', () => {
    state().moveSection('experience', { page: 0, row: 0, cell: 0, index: 0 });
    expect(cell(0, 0, 0).sections[0]).toBe('experience');
    expect(state().dirty).toBe(true);
  });

  it('moveSection moves across pages', () => {
    state().addPage();
    state().moveSection('skills', { page: 1, row: 0, cell: 0, index: 0 });
    expect(cell(0, 0, 0).sections).not.toContain('skills');
    expect(cell(1, 0, 0).sections).toEqual(['skills']);
  });

  it('add/removeSectionFromLayout round-trips', () => {
    state().removeSectionFromLayout('projects');
    expect(allPlaced()).not.toContain('projects');
    state().addSectionToLayout('projects', { page: 0, row: 0, cell: 0, index: 2 });
    expect(cell(0, 0, 0).sections[2]).toBe('projects');
    // adding twice is a no-op
    state().addSectionToLayout('projects');
    expect(allPlaced().filter((id) => id === 'projects')).toHaveLength(1);
  });

  it('toggleSectionHidden tracks hidden sections and mirrors visibility', () => {
    state().toggleSectionHidden('summary');
    expect(state().layoutState.hiddenSections).toContain('summary');
    expect(state().sectionOrder.find((s) => s.id === 'summary')?.visible).toBe(false);
    state().toggleSectionHidden('summary');
    expect(state().layoutState.hiddenSections).not.toContain('summary');
  });

  it('removePage merges its rows into the previous page', () => {
    state().addPage();
    state().moveSection('references', { page: 1, row: 0, cell: 0, index: 0 });
    state().removePage(1);
    expect(pages()).toHaveLength(1);
    expect(allPlaced()).toContain('references');
  });

  it('setTwoColumn splits a page into a sidebar row and merges back', () => {
    state().setTwoColumn(true);
    expect(pages()[0]![0]!.cells).toHaveLength(2);
    expect(cell(0, 0, 0).sections).toContain('skills'); // sidebar default
    expect(cell(0, 0, 0).tinted).toBe(true);
    expect(cell(0, 0, 0).widthPercent).toBe(33);
    expect(cell(0, 0, 1).sections).toContain('experience');
    const all = [...allPlaced()].sort();
    state().setTwoColumn(false);
    expect(pages()[0]![0]!.cells).toHaveLength(1);
    expect([...cell(0, 0, 0).sections].sort()).toEqual(all); // nothing lost
  });

  it('addRow inserts an empty single-cell row', () => {
    expect(pages()[0]).toHaveLength(1);
    state().addRow(0);
    expect(pages()[0]).toHaveLength(2);
    expect(pages()[0]![1]!.cells).toEqual([{ sections: [] }]);
    state().addRow(0, 0); // insert at the top
    expect(pages()[0]).toHaveLength(3);
    expect(pages()[0]![0]!.cells[0]!.sections).toEqual([]);
  });

  it('removeRow moves its sections to the neighbouring row', () => {
    state().addRow(0, 0);
    state().moveSection('summary', { page: 0, row: 0, cell: 0, index: 0 });
    expect(cell(0, 0, 0).sections).toEqual(['summary']);
    state().removeRow(0, 0); // first row -> sections go to the (new) first row
    expect(pages()[0]).toHaveLength(1);
    expect(cell(0, 0, 0).sections).toContain('summary');
    expect(allPlaced().filter((id) => id === 'summary')).toHaveLength(1);
  });

  it('removeRow on the only row keeps an empty row', () => {
    state().removeRow(0, 0);
    expect(pages()[0]).toHaveLength(1);
    expect(cell(0, 0, 0).sections).toEqual([]);
  });

  it('setRowCellCount grows and shrinks cells, merging sections back', () => {
    state().setRowCellCount(0, 0, 2);
    expect(pages()[0]![0]!.cells).toHaveLength(2);
    expect(cell(0, 0, 0).widthPercent).toBe(50);
    expect(cell(0, 0, 1).sections).toEqual([]);
    state().moveSection('skills', { page: 0, row: 0, cell: 1, index: 0 });
    state().setRowCellCount(0, 0, 3);
    expect(pages()[0]![0]!.cells).toHaveLength(3);
    state().setRowCellCount(0, 0, 1);
    expect(pages()[0]![0]!.cells).toHaveLength(1);
    expect(cell(0, 0, 0).sections).toContain('skills'); // merged back
    expect(cell(0, 0, 0).widthPercent).toBeUndefined();
  });

  it('setCellWidth clamps to 15–85 percent', () => {
    state().setRowCellCount(0, 0, 2);
    state().setCellWidth(0, 0, 0, 33);
    expect(cell(0, 0, 0).widthPercent).toBe(33);
    state().setCellWidth(0, 0, 0, 5);
    expect(cell(0, 0, 0).widthPercent).toBe(15);
    state().setCellWidth(0, 0, 0, 99);
    expect(cell(0, 0, 0).widthPercent).toBe(85);
  });

  it('toggleCellTint flips the tinted flag', () => {
    expect(cell(0, 0, 0).tinted).toBeUndefined();
    state().toggleCellTint(0, 0, 0);
    expect(cell(0, 0, 0).tinted).toBe(true);
    state().toggleCellTint(0, 0, 0);
    expect(cell(0, 0, 0).tinted).toBe(false);
  });

  it('applyTemplateConfig adopts template pages and keeps custom sections', () => {
    const customRef = 'custom.11111111-1111-4111-8111-111111111111';
    state().addSectionToLayout(customRef);
    const twoColConfig = {
      ...state().templateConfig,
      layout: 'modern' as const,
      pages: [[['skills'], ['summary', 'experience']]],
    };
    state().applyTemplateConfig(twoColConfig);
    expect(pages()[0]![0]!.cells).toHaveLength(2);
    expect(cell(0, 0, 0).tinted).toBe(true); // v2 template pages -> tinted sidebar cell
    expect(allPlaced()).toContain(customRef); // custom section carried over
  });

  it('applyTemplateConfig prefers v3-native pageRows over pages', () => {
    state().applyTemplateConfig({
      ...state().templateConfig,
      pages: [[['skills']]],
      pageRows: [
        [
          { cells: [{ sections: ['summary'] }] },
          { cells: [{ widthPercent: 33, tinted: true, sections: ['skills'] }, { sections: ['experience'] }] },
        ],
      ],
    });
    expect(pages()[0]).toHaveLength(2);
    expect(pages()[0]![0]!.cells[0]!.sections).toEqual(['summary']);
    expect(cell(0, 1, 0).widthPercent).toBe(33);
  });

  it('initFromProfile migrates v1 arrays and v2 objects to v3', () => {
    state().initFromProfile([
      { id: 'experience', label: 'Experience', visible: true },
      { id: 'summary', label: 'Summary', visible: false },
    ]);
    expect(cell(0, 0, 0).sections[0]).toBe('experience');
    expect(state().layoutState.hiddenSections).toContain('summary');

    state().initFromProfile({ version: 2, pages: [[['education']]], hiddenSections: [] });
    expect(state().layoutState.version).toBe(3);
    expect(pages()).toEqual([[{ cells: [{ sections: ['education'] }] }]]);

    state().initFromProfile({
      version: 3,
      pages: [[{ cells: [{ sections: ['projects'] }] }]],
      hiddenSections: [],
    });
    expect(pages()).toEqual([[{ cells: [{ sections: ['projects'] }] }]]);
  });

  it('undo/redo restores layout changes', () => {
    const before = JSON.stringify(pages());
    state().moveSection('education', { page: 0, row: 0, cell: 0, index: 0 });
    expect(JSON.stringify(pages())).not.toBe(before);
    useResumeBuilderStore.temporal.getState().undo();
    expect(JSON.stringify(pages())).toBe(before);
    useResumeBuilderStore.temporal.getState().redo();
    expect(cell(0, 0, 0).sections[0]).toBe('education');
  });

  it('setSectionColumns sets, clamps, and clears per-section columns', () => {
    state().setSectionColumns('skills', 2);
    expect(state().layoutState.sectionColumns).toEqual({ skills: 2 });
    state().setSectionColumns('languages', 9); // clamped to 3
    expect(state().layoutState.sectionColumns).toEqual({ skills: 2, languages: 3 });
    state().setSectionColumns('skills', 1); // 1 column = default, key removed
    expect(state().layoutState.sectionColumns).toEqual({ languages: 3 });
    expect(state().dirty).toBe(true);
  });

  it('applyTemplateConfig adopts template-default section columns', () => {
    state().applyTemplateConfig({
      ...state().templateConfig,
      pages: [[['summary', 'skills']]],
      sectionColumns: { skills: 2 },
    });
    expect(state().layoutState.sectionColumns).toEqual({ skills: 2 });
  });

  it('updateTemplateConfig patches design without touching placement', () => {
    const before = JSON.stringify(pages());
    state().updateTemplateConfig({ pageFormat: 'letter' });
    expect(state().templateConfig.pageFormat).toBe('letter');
    expect(JSON.stringify(pages())).toBe(before);
  });
});
