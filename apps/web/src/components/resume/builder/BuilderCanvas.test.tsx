// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { normalizeResumeData } from '@auto-job-apply/resume-renderer';
import { BUILTIN_TEMPLATES, placedSectionIds } from '@auto-job-apply/shared-types';
import { useResumeBuilderStore } from '../../../stores/resume-builder-store';
import { BuilderCanvas, makeCellId, parseCellId } from './BuilderCanvas';
import { SectionLibrary } from './SectionLibrary';

const initialSnapshot = { ...useResumeBuilderStore.getState() };

const sampleProfile = {
  name: 'Faisal Nadeem',
  contactInfo: { email: 'faisalnadeem0803@gmail.com', phone: '+92 300 1234567' },
  summary: 'Full-stack engineer.',
  skills: ['React', 'NestJS'],
  experience: [{ title: 'Senior Dev', company: 'TechCo', startDate: '2021', bullets: ['Built the builder'] }],
  education: [{ degree: 'BS CS', institution: 'FAST', date: '2020' }],
  customSections: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Awards',
      type: 'list' as const,
      items: [{ id: 'i1', fields: [{ label: '', value: 'Best Engineer 2023' }] }],
    },
  ],
};

const data = normalizeResumeData(sampleProfile);

function renderCanvas() {
  const config = useResumeBuilderStore.getState().templateConfig;
  return render(
    <DndContext>
      <BuilderCanvas data={data} config={config} />
    </DndContext>,
  );
}

const pages = () => useResumeBuilderStore.getState().layoutState.pages;

beforeEach(() => {
  cleanup();
  useResumeBuilderStore.setState(initialSnapshot, true);
  useResumeBuilderStore.temporal.getState().clear();
});

describe('BuilderCanvas', () => {
  it('renders the resume header and placed sections on the page', () => {
    renderCanvas();
    expect(screen.getByText('Faisal Nadeem')).toBeTruthy();
    expect(screen.getByText(/Full-stack engineer/)).toBeTruthy();
    expect(screen.getByText('Senior Dev')).toBeTruthy();
    expect(screen.getByText(/React, NestJS/)).toBeTruthy();
    expect(screen.getByText(/Page 1 of 1/)).toBeTruthy();
  });

  it('shows a placeholder for placed sections without content', () => {
    renderCanvas();
    // profile has no projects/certifications/etc -> placeholders
    expect(screen.getByText(/Projects — no content yet/)).toBeTruthy();
    expect(screen.getByText(/Certifications — no content yet/)).toBeTruthy();
  });

  it('renders a placed custom section with its content', () => {
    useResumeBuilderStore.getState().addSectionToLayout('custom.22222222-2222-4222-8222-222222222222');
    renderCanvas();
    expect(screen.getByText('Awards')).toBeTruthy();
    expect(screen.getByText('Best Engineer 2023')).toBeTruthy();
  });

  it('adds and removes pages from the canvas', () => {
    renderCanvas();
    fireEvent.click(screen.getByText(/Add page/));
    expect(pages()).toHaveLength(2);
    expect(screen.getByText(/Page 2 of 2/)).toBeTruthy();

    fireEvent.click(screen.getAllByTitle(/Remove page/)[1]!);
    expect(pages()).toHaveLength(1);
  });

  it('"Add row below" inserts a new row after the hovered row', () => {
    renderCanvas();
    expect(pages()[0]).toHaveLength(1);
    fireEvent.click(screen.getAllByTitle('Add row below')[0]!);
    expect(pages()[0]).toHaveLength(2);
    expect(pages()[0]![1]!.cells[0]!.sections).toEqual([]);
    // the new empty row renders a drop target
    expect(screen.getAllByText('Drop sections here').length).toBeGreaterThan(0);
  });

  it('"Delete row" merges sections back and removes the row', () => {
    useResumeBuilderStore.getState().addRow(0);
    renderCanvas();
    expect(pages()[0]).toHaveLength(2);
    fireEvent.click(screen.getAllByTitle('Delete row')[1]!);
    expect(pages()[0]).toHaveLength(1);
  });

  it('cell-count buttons split a row and the widths button cycles presets', () => {
    renderCanvas();
    fireEvent.click(screen.getAllByTitle('Split row into 2 columns')[0]!);
    expect(pages()[0]![0]!.cells).toHaveLength(2);
    expect(pages()[0]![0]!.cells[0]!.widthPercent).toBe(50);
    // 50/50 -> 33/67
    fireEvent.click(screen.getAllByTitle('Column widths')[0]!);
    expect(pages()[0]![0]!.cells[0]!.widthPercent).toBe(33);
  });

  it('renders two columns when the layout is two-column', () => {
    useResumeBuilderStore.getState().setTwoColumn(true);
    renderCanvas();
    // sidebar default contains skills; both cells render section content
    expect(screen.getByText(/React, NestJS/)).toBeTruthy();
    expect(screen.getByText('Senior Dev')).toBeTruthy();
  });

  it('hidden sections render dimmed but stay on the canvas', () => {
    useResumeBuilderStore.getState().toggleSectionHidden('experience');
    const { container } = renderCanvas();
    const block = container.querySelector('[data-section-id="experience"]');
    expect(block).toBeTruthy();
    expect(block!.className).toContain('opacity-40');
  });

  it('renders the Europass label-left layout with gutter titles', () => {
    const europass = BUILTIN_TEMPLATES.find((t) => t.slug === 'europass')!;
    useResumeBuilderStore.getState().applyTemplateConfig(europass.config);
    renderCanvas();
    // Europass-specific section labels (in the entry gutters)
    expect(screen.getByText('Work Experience')).toBeTruthy();
    expect(screen.getByText('Education and Training')).toBeTruthy();
    expect(screen.getByText('Personal information')).toBeTruthy();
    // content still rendered
    expect(screen.getByText('Senior Dev')).toBeTruthy();
  });

  it('columns button cycles a section through 1→2→3 item columns', () => {
    const { container } = renderCanvas();
    const columnsButton = () =>
      container
        .querySelector('[data-section-id="skills"]')!
        .querySelector('[title^="Item columns"]')!;
    fireEvent.click(columnsButton());
    expect(useResumeBuilderStore.getState().layoutState.sectionColumns?.skills).toBe(2);
    fireEvent.click(columnsButton());
    expect(useResumeBuilderStore.getState().layoutState.sectionColumns?.skills).toBe(3);
    fireEvent.click(columnsButton());
    expect(useResumeBuilderStore.getState().layoutState.sectionColumns?.skills).toBeUndefined();
  });

  it('droppable id helpers round-trip', () => {
    expect(parseCellId(makeCellId(2, 0, 1))).toEqual({ page: 2, row: 0, cell: 1 });
    expect(parseCellId('summary')).toBeNull();
  });
});

describe('SectionLibrary', () => {
  function renderLibrary() {
    return render(
      <DndContext>
        <SectionLibrary
          customSections={sampleProfile.customSections}
          onAddCustomSection={() => undefined}
        />
      </DndContext>,
    );
  }

  it('lists built-in sections and marks placed ones', () => {
    renderLibrary();
    expect(screen.getByText('Summary')).toBeTruthy();
    expect(screen.getByText('Experience')).toBeTruthy();
    // default layout places all built-ins
    expect(screen.getAllByText('On page').length).toBeGreaterThanOrEqual(10);
  });

  it('lists custom sections and allows adding unplaced ones to the layout', () => {
    renderLibrary();
    expect(screen.getByText('Awards')).toBeTruthy();
    // custom section is unplaced -> has an add button instead of "On page"
    const addButton = screen.getByTitle('Add to layout');
    fireEvent.click(addButton);
    expect(placedSectionIds(useResumeBuilderStore.getState().layoutState.pages)).toContain(
      'custom.22222222-2222-4222-8222-222222222222',
    );
  });
});
