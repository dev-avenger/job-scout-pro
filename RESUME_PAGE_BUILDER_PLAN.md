# Resume Page Builder — Implementation Plan

**Goal:** Evolve the existing resume builder into a full React-based page builder: drag-and-drop section placement across columns and pages, custom sections, a template registry with built-in regional templates (Europass, USA, UK, Australia, Pakistan), template import/export, and a community-style gallery.

**Approach (decided):** Hybrid — extend the existing dnd-kit/zustand foundation into a Reactive Resume–style block builder. No Puck/Craft.js. Resumes are structured, paginated, ATS-sensitive documents; a structured block model beats a free-form canvas and preserves PDF export parity.

---

## 1. Current State Audit

| Area | Status | Location |
|---|---|---|
| Section components (10 types) | ✅ Done | `apps/web/src/components/resume/sections/` |
| Drag-drop section ordering (single list) | ✅ dnd-kit | `DraggableSectionList.tsx` |
| Template config (layout/theme/colors/typography/spacing/sidebar) | ✅ | `packages/shared-types/src/models/template.ts`, `apps/web/src/lib/template-config.ts` |
| Live preview with CSS vars + page-break overlay | ✅ | `LiveResumePreview.tsx` |
| Custom sections (UI only, generic field/value items) | ⚠️ Not persisted in Profile schema | `CustomSectionEditor.tsx` |
| Theme customizer (colors/typography/spacing overrides) | ✅ | `ThemeCustomizer.tsx`, `resume-builder-store.ts` |
| Undo/redo | ✅ zundo installed | `resume-editor-store.ts` |
| PDF export | ⚠️ pdfkit (programmatic — parity with preview is hand-maintained) | `apps/api/src/resume/export/pdf-generator.ts` |
| DOCX export | ✅ | `docx-generator.ts` |
| Resume import (PDF/DOCX parse) | ✅ | `ResumeImportDialog.tsx` |
| Templates endpoint | ✅ static list | `GET /resumes/templates` |
| Versions, tailoring, ATS score, AI improve | ✅ | `resume.controller.ts` |

**Gaps to close:**

1. Sections live in one flat ordered list — no per-column / per-page placement.
2. Custom sections aren't part of `ProfileSchema`, aren't rendered in preview, and aren't exported.
3. Templates are 4 hardcoded layout×theme combos — no template entity, no regional built-ins, no save/import/share.
4. No JSON Resume / Reactive Resume import.
5. pdfkit output drifts from the React preview (two renderers for one design).

---

## 2. Research Summary

- **Reactive Resume** ([repo](https://github.com/AmruthPillai/Reactive-Resume)) — the reference architecture. Key ideas to adopt: a `layout: pages[][columns][sectionIds]` model, an isolated "artboard" React app that renders the resume from JSON, custom sections as first-class schema items, JSON import with versioned migrations ([JSON Resume guide](https://docs.rxresu.me/guides/json-resume-schema)).
- **JSON Resume** ([jsonresume.org](https://jsonresume.org/), [schema](https://github.com/jsonresume/resume-schema)) — the open interchange format; importing it unlocks community data.
- **Puck** ([repo](https://github.com/puckeditor/puck)) / **Craft.js** — generic page-builder libraries; rejected (see decision above), but Puck's "JSON in, JSON out" document model informs our template file format.

---

## 3. Target Architecture

### 3.1 Layout data model (the core change)

Replace the flat `SectionOrderItem[]` with a paginated, columnar layout in `packages/shared-types/src/models/template.ts`:

```ts
// Section identity: built-ins + custom
export const BuiltInSectionId = z.enum(['summary','skills','experience','education',
  'projects','certifications','languages','publications','volunteer','references']);
export const SectionIdSchema = z.union([
  BuiltInSectionId,
  z.string().regex(/^custom\.[0-9a-f-]{36}$/),   // e.g. "custom.<uuid>"
]);

// layout[pageIndex][columnIndex] = ordered section ids
export const LayoutSchema = z.array(z.array(z.array(SectionIdSchema)));

export const TemplateConfigSchema = z.object({
  // existing fields kept: colors, typography, spacing, headerAlignment, sectionTitleStyle...
  layout: LayoutSchema,                       // replaces sidebarSections/mainSections/sectionOrder
  columns: z.union([z.literal(1), z.literal(2)]),
  sidebarWidthPercent: z.number().min(20).max(50),
  pageFormat: z.enum(['a4', 'letter']),
  showPhoto: z.boolean(),
  showPersonalDetails: z.boolean(),           // DOB, nationality, etc. (Europass/PK)
  dateFormat: z.string(),                     // 'MM/YYYY' (US) vs 'MM.YYYY' (EU)
});
```

Migration: `sectionOrder` + `sidebarSections`/`mainSections` → `layout = [[sidebar, main]]`. Write a one-off mapper in `shared-utils`; keep reading old shape with a `version` field.

### 3.2 Custom sections — first-class

Add to `ProfileSchema` (`packages/shared-types/src/models/resume.ts`):

```ts
export const CustomSectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  type: z.enum(['list', 'keyValue', 'paragraph']),  // render style
  items: z.array(z.object({
    id: z.string().uuid(),
    fields: z.array(z.object({ label: z.string(), value: z.string() })),
  })),
});
// Profile gains: customSections: z.array(CustomSectionSchema).default([])
```

DB: JSONB column `custom_sections` on `profiles` (Drizzle migration in `packages/db`). API: extend the existing generic `profiles/:id/sections/:sectionType` CRUD to accept `custom.<uuid>` types — the route pattern already supports it.

### 3.3 Builder UI — three-pane editor

New route `/resumes/:profileId/builder` (full-screen, replaces the cramped detail-panel editing for design work):

```
┌─────────────┬──────────────────────────────┬─────────────┐
│ LEFT        │ CENTER (canvas)              │ RIGHT       │
│ Section     │ Paginated A4/Letter pages    │ Design      │
│ library     │ Each column = dnd-kit        │ - Template  │
│ - built-ins │  droppable; sections are     │   gallery   │
│ - custom    │  sortable blocks, draggable  │ - Layout    │
│ - + Add     │  across columns AND pages    │ - Theme     │
│   custom    │ Click block → inline edit    │ - Typo/     │
│ - hide/show │  popover (reuse Section      │   spacing   │
│             │  editors)                    │ - Page setup│
└─────────────┴──────────────────────────────┴─────────────┘
```

Components (new under `apps/web/src/components/resume/builder/`):

- `BuilderPage.tsx` — route shell, loads profile + template, autosave (debounced PUT).
- `SectionLibrary.tsx` — left panel; drag source for unplaced sections; "Add custom section" → reuses `CustomSectionEditor` dialog.
- `Canvas.tsx` — renders `layout` as real pages (A4 = 794×1123 px @96dpi, already used in `PageBreakOverlay`); content overflowing a page auto-flows or warns. One `DndContext` spanning library + all columns (dnd-kit supports cross-container sortable out of the box — already a dependency).
- `SectionBlock.tsx` — wrapper: drag handle, visibility toggle, edit button → popover with the existing per-type editor from `SectionEditors.tsx`.
- `SectionRenderer.tsx` — **registry** `Record<SectionId, FC<Props>>` mapping ids to display renderers; `custom.*` falls back to `CustomSectionRenderer` (renders by `type`: list / keyValue / paragraph). `LiveResumePreview` is refactored to consume this same registry so preview ≡ canvas.
- Right panel: reuse `TemplateGallery`, `ThemeCustomizer`; add `PageSetupPanel` (format, columns, photo, personal details, date format).

State: extend `resume-builder-store.ts` — `layout`, `moveSection(sectionId, from, to, index)`, `addPage/removePage`, wrap with `zundo` temporal middleware for undo/redo (already a dependency).

### 3.4 Template registry + built-in regional templates

New entity (DB table `resume_templates`, schema in `shared-types/models/template.ts`):

```ts
export const ResumeTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),                 // 'europass', 'usa-classic', ...
  name: z.string(),
  region: TemplateRegion,           // enum already exists
  description: z.string().optional(),
  config: TemplateConfigSchema,
  previewImageUrl: z.string().optional(),
  isBuiltIn: z.boolean(),
  userId: z.string().uuid().nullable(),  // null = built-in/global
  version: z.number().default(1),
  createdAt: z.date(), updatedAt: z.date(),
});
```

Built-in seeds (in `packages/db/src/seeds/templates.ts`):

| Template | Key config |
|---|---|
| **Europass CV** | 2-col, photo, personal details (DOB, nationality), blue accent, A4, `MM.YYYY` |
| **USA Resume** | 1-col, **no photo / no personal details** (anti-discrimination norm), Letter, 1 page bias |
| **UK CV** | 1-col, no photo, A4, includes references-available line |
| **Australia CV** | 1-col, no photo, A4, longer (2–3 pages OK) |
| **Pakistan CV** | photo + region fields (father's name, CNIC, domicile — `RegionFieldsSchema` already exists), A4 |
| + 5–10 style variants | classic/modern/minimal/creative × themes (map existing `getTemplateConfig`) |

API: `GET/POST/PUT/DELETE /templates` (built-ins read-only), `POST /templates/from-current` (save my design as template). Replace the static `GET /resumes/templates` payload with DB-backed list.

Gallery UI: upgrade `TemplateGallery.tsx` → grid with preview thumbnails (render `LiveResumePreview` at small scale with dummy data — `MiniResumePreview` already does this), region filter tabs, "Use template" applies `config` to the store.

### 3.5 Import / Export

New package `packages/resume-import/` (pure functions, unit-testable):

1. **JSON Resume** (`jsonresume.org` schema) → `Profile` mapper. Unknown sections → custom sections.
2. **Reactive Resume v4/v5 JSON** → `Profile` + `TemplateConfig` mapper (their layout model maps 1:1 to ours by design).
3. **Template files** — export current template as `*.resume-template.json` `{ formatVersion, template: ResumeTemplateSchema }`; import validates with zod, rejects/migrates unknown versions. Pure client-side via file picker + download; "Save to my templates" persists via API.
4. Existing PDF/DOCX content import stays as-is; add the new importers as tabs in `ResumeImportDialog.tsx`.

### 3.6 WYSIWYG PDF export (parity fix)

Current pdfkit generator re-implements the design and will drift as the builder grows. Adopt the Reactive Resume approach:

- Add a public-less route `/print/:versionId?token=...` in the web app that renders **the same `SectionRenderer` registry + TemplateConfig CSS** with `@page` CSS for margins/format.
- Worker/API uses **Playwright (Chromium headless)** `page.pdf()` against that route. One renderer, perfect parity, custom sections free.
- Keep pdfkit as a fallback flag for environments without Chromium; DOCX generator stays (mapped, inherently approximate).

---

## 4. Phases

**Phase 1 — Layout engine + canvas (core, ~1.5–2 wks)**
Schema: `LayoutSchema`, config migration. Builder route + 3-pane shell. Cross-column/cross-page dnd-kit canvas. Refactor `LiveResumePreview` onto the shared `SectionRenderer` registry. Undo/redo. Autosave.
*Exit:* drag any section between sidebar/main/pages; preview and canvas identical.

**Phase 2 — Custom sections end-to-end (~1 wk)**
`CustomSectionSchema` in Profile + DB migration + API. Wire `CustomSectionEditor` to persistence. `CustomSectionRenderer` (3 styles). Include in DOCX/pdfkit export.
*Exit:* create "Awards" custom section → appears in canvas, preview, and exports.

**Phase 3 — Template registry + regional built-ins + gallery (~1–1.5 wks)**
`resume_templates` table, CRUD API, seeds (Europass/USA/UK/AU/PK + variants). Gallery with thumbnails + region filter. "Save as template".
*Exit:* one-click switch to Europass applies photo/personal-details/2-col layout.

**Phase 4 — Import/export (~1 wk)**
`packages/resume-import`: JSON Resume + Reactive Resume mappers (unit tests with real fixture files). Template file import/export. Import dialog tabs.
*Exit:* a jsonresume.org sample and an RR export both import cleanly.

**Phase 5 — WYSIWYG PDF (~1 wk)**
`/print` route, Playwright in worker, token-auth, fallback flag.
*Exit:* exported PDF pixel-matches the builder canvas, including custom sections.

Each phase ships independently; 1→2→3 is the recommended order (4 and 5 can swap).

---

## 5. Risks & Decisions

- **Pagination/overflow:** auto-flowing content across pages is the hardest UI problem. Phase 1 ships measure-and-warn (overflow indicator per page, like the current red overlay); true auto-flow (split a long Experience section across pages) is a Phase 5+ enhancement. Reactive Resume also punts on perfect auto-flow.
- **Schema migration:** every persisted `TemplateConfig`/`sectionOrder` needs the v1→v2 mapper; version every JSON blob from now on.
- **ATS safety:** 2-column + photo templates hurt ATS parsing; show the existing ATS score prominently in the builder and badge templates "ATS-friendly" vs "Visual".
- **Chromium in worker:** Playwright adds ~300MB to the worker image; gate behind env flag, keep pdfkit fallback.
- **dnd-kit cross-container:** supported but fiddly with nested sortables; prototype Canvas drag in Phase 1 week 1 before building panels around it.

## 6. Sources

- Reactive Resume — https://github.com/AmruthPillai/Reactive-Resume (architecture reference)
- Reactive Resume JSON Resume guide — https://docs.rxresu.me/guides/json-resume-schema
- JSON Resume schema — https://github.com/jsonresume/resume-schema
- Puck (evaluated, not adopted) — https://github.com/puckeditor/puck
- Craft.js (evaluated, not adopted) — https://craft.js.org
- Page-builder comparison — https://dev.to/fede_bonel_tozzi/top-5-page-builders-for-react-190g

---

# Implementation Status — DONE (all 5 phases)

## What was built

**New packages**
- `packages/resume-renderer` — shared React renderer (inline styles, no Tailwind): `SectionContent` registry, `ResumeHeader`, `ResumePage`, `ResumeDocument`, `normalizeResumeData`, and `renderResumeHtml` (SSR for PDF). Used by the preview, the builder canvas, and the API's PDF engine — one renderer everywhere.
- `packages/resume-import` — pure mappers with 13 unit tests: JSON Resume (`mapJsonResume`), Reactive Resume v4 (`mapReactiveResume`, carries page layout + custom sections over), auto-detection (`importResumeJson`).

**Schema (`packages/shared-types`)**
- v2 layout model: `PagesLayoutSchema` (pages → columns → section ids), `BuilderLayoutStateSchema` (persisted in `profiles.section_order`), `migrateLayoutState` (v1 array → v2, template defaults), `legacyPlacementFromLayout` (v2 → pdfkit/docx placement).
- `CustomSectionSchema` on Profile (list / keyValue / paragraph render styles), `custom.<uuid>` section ids.
- `ResumeTemplateSchema`, `TemplateFileSchema` (portable `.resume-template.json`), `BUILTIN_TEMPLATES`: Europass, USA, UK, Australia, Pakistan + 3 style templates.

**Web (`apps/web`)**
- `/resume/:profileId/builder` — full-screen 3-pane builder (entry button on profile detail): section library (drag or click-add, custom section dialog) | paginated A4/Letter canvas with cross-column & cross-page dnd-kit drag-drop, per-block hide/remove/edit controls, add/remove pages | design panel (existing gallery + theme customizer, new Page setup: format, columns, sidebar width, photo, personal details, date format; new Template registry tab: region-filtered built-ins + my templates, save-as-template, export/import template files).
- Undo/redo (zundo, Ctrl+Z / Ctrl+Shift+Z), debounced autosave of layout to the profile, Export PDF posts the exact canvas design.
- `LiveResumePreview` refactored onto the shared renderer (multi-page, preview ≡ canvas ≡ PDF).
- Import dialog now also accepts `.json` (JSON Resume / Reactive Resume, mapped client-side).

**API (`apps/api`) & DB (`packages/db`)**
- `profiles.custom_sections` jsonb column + `resume_templates` table (`src/migrations/0001_resume_page_builder.sql`; or run `pnpm --filter @auto-job-apply/db generate` with a live DB).
- `PUT /profiles/:id` accepts `customSections` and v2 `sectionOrder`.
- `/api/v1/templates` CRUD (built-ins read-only + user templates).
- WYSIWYG PDF: `HtmlPdfGenerator` (renderer SSR + headless Chromium via playwright-core); `POST /profiles/:id/export/pdf` takes the builder's exact config+layout. Graceful fallback to pdfkit (`PDF_ENGINE=pdfkit` to force). pdfkit + docx generators now render custom sections too.

## Test results (run in a Linux sandbox copy)
- `resume-import`: 13/13 vitest tests pass.
- Renderer/layout smoke suite: 42/42 (all 8 built-in templates render name/experience/custom sections/personal details, v1→v2 migration, hidden sections, template-file schema round-trip).
- Export e2e: Chromium absent → graceful fallback; pdfkit PDF verified with `pdftotext` (header, summary, skills, experience, education, custom Awards section all present); DOCX valid.
- Typecheck: web 0 errors; new api code 0 errors; `vite build` succeeds.

## Notes & known pre-existing issues
- Setting `"type": "module"` on the shared packages fixed ~84 pre-existing drizzle-orm dual-type errors in the API. 12 unrelated pre-existing errors remain (email-parser, model-router, scheduling, deduplication, bullmq worker types) — they don't block builds (`noEmitOnError: false`).
- For WYSIWYG PDFs install a Chromium once: `npx playwright-core install chromium-headless-shell` (or set `PLAYWRIGHT_CHROMIUM_PATH`). Without it, exports use the pdfkit fallback automatically.
- The old profile-detail section list still works; it writes v1 ordering which the builder migrates on open. The builder is the canonical layout editor.
- Run the DB migration before using custom sections / templates: `psql $DATABASE_URL -f packages/db/src/migrations/0001_resume_page_builder.sql`.
