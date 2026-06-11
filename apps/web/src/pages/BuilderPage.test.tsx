// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom lacks ResizeObserver (used by Radix sliders) — stub it before imports render
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).ResizeObserver ??= ResizeObserverStub;

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { placedSectionIds } from '@auto-job-apply/shared-types';
import { useResumeBuilderStore } from '../stores/resume-builder-store';
import { BuilderPage } from './BuilderPage';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
    post: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    downloadBlob: vi.fn().mockResolvedValue(undefined),
  },
}));

const mocked = vi.mocked(apiClient);

const profileFixture = {
  id: 'p1',
  name: 'Faisal Profile',
  isDefault: true,
  createdAt: '2026-01-01',
  contactInfo: { email: 'faisalnadeem0803@gmail.com', phone: '+92 300', location: 'Lahore', linkedin: '' },
  summary: 'Engineer.',
  skills: ['React'],
  experience: [{ title: 'Senior Dev', company: 'TechCo', startDate: '2021' }],
  customSections: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Hackathons',
      type: 'list',
      items: [{ id: 'h1', fields: [{ label: '', value: 'Winner 2024' }] }],
    },
  ],
  sectionOrder: [
    { id: 'summary', label: 'Summary', visible: true },
    { id: 'experience', label: 'Experience', visible: true },
    { id: 'skills', label: 'Skills', visible: true },
  ],
};

const initialSnapshot = { ...useResumeBuilderStore.getState() };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/resume/p1/builder']}>
      <Routes>
        <Route path="/resume/:profileId/builder" element={<BuilderPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useResumeBuilderStore.setState(initialSnapshot, true);
  useResumeBuilderStore.temporal.getState().clear();
  mocked.get.mockResolvedValue(profileFixture as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BuilderPage integration (mocked API)', () => {
  it('loads the profile, migrates v1 layout, and renders the full builder', async () => {
    renderPage();
    expect((await screen.findAllByText('Faisal Profile')).length).toBeGreaterThan(0);
    expect(mocked.get).toHaveBeenCalledWith('/profiles/p1');

    // canvas rendered with profile content
    expect(screen.getByText('Senior Dev')).toBeTruthy();
    // v1 sectionOrder migrated to v3 with that order preserved
    const pages = useResumeBuilderStore.getState().layoutState.pages;
    expect(pages[0]![0]!.cells[0]!.sections.slice(0, 3)).toEqual(['summary', 'experience', 'skills']);
    // persisted custom section auto-placed on the canvas
    expect(placedSectionIds(pages)).toContain('custom.33333333-3333-4333-8333-333333333333');
    expect(screen.getAllByText('Hackathons').length).toBeGreaterThan(0); // library item + canvas block
    expect(screen.getAllByText('Winner 2024').length).toBeGreaterThan(0);
    // three-pane chrome
    expect(screen.getByText('Standard sections')).toBeTruthy();
    expect(screen.getByText('Design')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('autosaves the v3 layout to the API after a layout change', async () => {
    renderPage();
    await screen.findAllByText('Faisal Profile');

    fireEvent.click(screen.getByText(/Add page/));
    expect(screen.getByText(/Saving/)).toBeTruthy();

    await waitFor(
      () => {
        expect(mocked.put).toHaveBeenCalledWith(
          '/profiles/p1',
          expect.objectContaining({
            sectionOrder: expect.objectContaining({
              version: 3,
              pages: expect.any(Array),
            }),
          }),
        );
      },
      { timeout: 3000 },
    );
    expect(await screen.findByText('Saved')).toBeTruthy();
    const payload = mocked.put.mock.calls.at(-1)![1] as { sectionOrder: { pages: unknown[] } };
    expect(payload.sectionOrder.pages).toHaveLength(2);
  });

  it('Export PDF posts the exact current design (WYSIWYG)', async () => {
    renderPage();
    await screen.findAllByText('Faisal Profile');

    fireEvent.click(screen.getByText('Export PDF'));
    await waitFor(() => expect(mocked.downloadBlob).toHaveBeenCalled());

    const [path, filename, options] = mocked.downloadBlob.mock.calls[0]! as [
      string,
      string,
      { method: string; body: { config: unknown; layoutState: { version: number } } },
    ];
    expect(path).toBe('/profiles/p1/export/pdf');
    expect(filename).toContain('.pdf');
    expect(options.method).toBe('POST');
    expect(options.body.config).toBeTruthy();
    expect(options.body.layoutState.version).toBe(3);
  });

  it('inline canvas edits (contentEditable blur) save the field to the API', async () => {
    renderPage();
    await screen.findAllByText('Faisal Profile');

    const summaryEl = screen.getByText('Engineer.');
    summaryEl.textContent = 'Principal Engineer.';
    fireEvent.blur(summaryEl);

    await waitFor(() => {
      expect(mocked.put).toHaveBeenCalledWith('/profiles/p1', { summary: 'Principal Engineer.' });
    });
    // local profile state updated too
    expect(screen.getByText('Principal Engineer.')).toBeTruthy();
  });

  it('undo/redo buttons revert and reapply layout changes', async () => {
    renderPage();
    await screen.findAllByText('Faisal Profile');

    const before = JSON.stringify(useResumeBuilderStore.getState().layoutState.pages);
    fireEvent.click(screen.getByText(/Add page/));
    expect(useResumeBuilderStore.getState().layoutState.pages).toHaveLength(2);

    fireEvent.click(screen.getByTitle(/Undo/));
    expect(JSON.stringify(useResumeBuilderStore.getState().layoutState.pages)).toBe(before);

    fireEvent.click(screen.getByTitle(/Redo/));
    expect(useResumeBuilderStore.getState().layoutState.pages).toHaveLength(2);
  });

  it('shows an error state when the profile fails to load', async () => {
    mocked.get.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    expect(await screen.findByText('boom')).toBeTruthy();
    expect(screen.getByText(/Back to profiles/)).toBeTruthy();
  });
});
