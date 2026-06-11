import { z } from 'zod';

// Color configuration for a template
export const TemplateColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  text: z.string(),
  divider: z.string(),
});
export type TemplateColors = z.infer<typeof TemplateColorsSchema>;

// Typography configuration
export const TemplateTypographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  nameSizePt: z.number(),
  sectionTitleSizePt: z.number(),
  bodySizePt: z.number(),
  lineHeight: z.number(),
});
export type TemplateTypography = z.infer<typeof TemplateTypographySchema>;

// Spacing configuration (in points for PDF)
export const TemplateSpacingSchema = z.object({
  marginPt: z.number(),
  sectionGapPt: z.number(),
  entryGapPt: z.number(),
});
export type TemplateSpacing = z.infer<typeof TemplateSpacingSchema>;

export const LayoutType = z.enum(['classic', 'modern', 'minimal', 'creative']);
export type LayoutType = z.infer<typeof LayoutType>;

/* -------------------------------------------------------------------------- */
/*  Page-builder layout model                                                 */
/*  v2 (input): pages[pageIndex][columnIndex] = ordered list of section ids  */
/*  v3 (current): pages -> rows -> 1-3 cells (width/tint) -> section ids     */
/* -------------------------------------------------------------------------- */

export const BUILT_IN_SECTION_IDS = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'languages',
  'publications',
  'volunteer',
  'references',
] as const;

export const BuiltInSectionId = z.enum(BUILT_IN_SECTION_IDS);
export type BuiltInSectionId = z.infer<typeof BuiltInSectionId>;

export const CUSTOM_SECTION_PREFIX = 'custom.';

/** Built-in section id, or "custom.<uuid>" for user-defined sections */
export const SectionIdSchema = z.union([
  BuiltInSectionId,
  z.string().regex(/^custom\.[0-9a-fA-F-]{36}$/),
]);
export type SectionId = z.infer<typeof SectionIdSchema>;

export function isCustomSectionId(id: string): boolean {
  return id.startsWith(CUSTOM_SECTION_PREFIX);
}

export function customSectionRef(uuid: string): string {
  return `${CUSTOM_SECTION_PREFIX}${uuid}`;
}

export function customSectionUuid(sectionId: string): string {
  return sectionId.slice(CUSTOM_SECTION_PREFIX.length);
}

/** v2 input shape: pages -> columns -> ordered section ids (still accepted everywhere) */
export const PagesLayoutSchema = z.array(z.array(z.array(z.string())));
export type PagesLayout = z.infer<typeof PagesLayoutSchema>;

/* ----------------------- v3 row-based grid model -------------------------- */

/** A cell inside a row: holds an ordered list of sections */
export const LayoutCellSchema = z.object({
  /** percentage width within its row (remaining cells share the leftover) */
  widthPercent: z.number().min(10).max(90).optional(),
  /** tinted background (sidebar look) */
  tinted: z.boolean().optional(),
  sections: z.array(z.string()),
});
export type LayoutCell = z.infer<typeof LayoutCellSchema>;

/** A horizontal row on the page, divided into 1–3 cells */
export const LayoutRowSchema = z.object({
  cells: z.array(LayoutCellSchema).min(1).max(3),
});
export type LayoutRow = z.infer<typeof LayoutRowSchema>;

/** One page = a vertical stack of rows */
export const PageRowsSchema = z.array(LayoutRowSchema);
export type PageRows = z.infer<typeof PageRowsSchema>;

export const PageFormat = z.enum(['a4', 'letter']);
export type PageFormat = z.infer<typeof PageFormat>;

export const SECTION_LABELS: Record<string, string> = {
  summary: 'Summary',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  publications: 'Publications',
  volunteer: 'Volunteer',
  references: 'References',
};

export const ThemeType = z.enum(['default', 'blue', 'green', 'dark']);
export type ThemeType = z.infer<typeof ThemeType>;

export const SectionTitleStyle = z.enum(['uppercase-line', 'bold-colored', 'simple', 'boxed']);
export type SectionTitleStyle = z.infer<typeof SectionTitleStyle>;

export const HeaderAlignment = z.enum(['center', 'left', 'right']);
export type HeaderAlignment = z.infer<typeof HeaderAlignment>;

// Full template configuration
export const TemplateConfigSchema = z.object({
  layout: LayoutType,
  theme: ThemeType,
  colors: TemplateColorsSchema,
  typography: TemplateTypographySchema,
  spacing: TemplateSpacingSchema,
  sidebarEnabled: z.boolean(),
  sidebarWidthPercent: z.number(),
  /** @deprecated v1 placement — superseded by `pages` */
  sidebarSections: z.array(z.string()),
  /** @deprecated v1 placement — superseded by `pages` */
  mainSections: z.array(z.string()),
  headerAlignment: HeaderAlignment,
  sectionTitleStyle: SectionTitleStyle,
  // ---- v2 page-builder fields (optional for backward compatibility) ----
  /** pages -> columns -> ordered section ids */
  pages: PagesLayoutSchema.optional(),
  pageFormat: PageFormat.optional(),
  showPhoto: z.boolean().optional(),
  showPersonalDetails: z.boolean().optional(),
  /** e.g. 'MM/YYYY' (US) or 'MM.YYYY' (EU) */
  dateFormat: z.string().optional(),
  /**
   * Structural variant:
   * - 'standard'   — section titles above content (default)
   * - 'label-left' — Europass-style: section titles in a left gutter,
   *                  content in the right column, thin rules between sections
   */
  layoutVariant: z.enum(['standard', 'label-left']).optional(),
  /** template-default inner column count per section (copied into the layout state on apply) */
  sectionColumns: z.record(z.number().int().min(1).max(3)).optional(),
  /** v3-native template placement: pages -> rows -> 1-3 cells (preferred over `pages`) */
  pageRows: z.array(PageRowsSchema).optional(),
});
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

// Section order for the page builder
export const SectionOrderItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  visible: z.boolean(),
});
export type SectionOrderItem = z.infer<typeof SectionOrderItemSchema>;

export const DEFAULT_SECTION_ORDER: SectionOrderItem[] = [
  { id: 'summary', label: 'Summary', visible: true },
  { id: 'skills', label: 'Skills', visible: true },
  { id: 'experience', label: 'Experience', visible: true },
  { id: 'education', label: 'Education', visible: true },
  { id: 'projects', label: 'Projects', visible: true },
  { id: 'certifications', label: 'Certifications', visible: true },
  { id: 'languages', label: 'Languages', visible: true },
  { id: 'publications', label: 'Publications', visible: true },
  { id: 'volunteer', label: 'Volunteer', visible: true },
  { id: 'references', label: 'References', visible: true },
];

/* -------------------------------------------------------------------------- */
/*  Persisted builder state (stored in profiles.section_order jsonb)          */
/* -------------------------------------------------------------------------- */

/** Legacy v2 persisted shape (pages -> columns -> section ids). Still accepted on input. */
export const BuilderLayoutStateV2Schema = z.object({
  version: z.literal(2),
  /** pages -> columns -> section ids */
  pages: PagesLayoutSchema,
  /** sections present in pages but currently hidden from output */
  hiddenSections: z.array(z.string()).default([]),
  /** per-section inner column count (items flow in 1–3 columns) */
  sectionColumns: z.record(z.number().int().min(1).max(3)).optional(),
});
export type BuilderLayoutStateV2 = z.infer<typeof BuilderLayoutStateV2Schema>;

/** Current (v3) persisted shape: pages -> rows -> 1-3 cells -> section ids */
export const BuilderLayoutStateSchema = z.object({
  version: z.literal(3),
  /** pages -> rows -> cells -> section ids */
  pages: z.array(PageRowsSchema),
  /** sections present in pages but currently hidden from output */
  hiddenSections: z.array(z.string()).default([]),
  /** per-section inner column count (items flow in 1–3 columns) */
  sectionColumns: z.record(z.number().int().min(1).max(3)).optional(),
});
export type BuilderLayoutState = z.infer<typeof BuilderLayoutStateSchema>;

export function defaultPagesLayout(twoColumn = false): PagesLayout {
  if (twoColumn) {
    return [
      [
        ['skills', 'languages', 'certifications', 'education'],
        ['summary', 'experience', 'projects', 'publications', 'volunteer', 'references'],
      ],
    ];
  }
  return [[[...BUILT_IN_SECTION_IDS]]];
}

/** Convert a v2 page (columns of section ids) into one v3 row. */
function rowFromColumns(columns: string[][]): LayoutRow {
  if (columns.length <= 1) {
    return { cells: [{ sections: [...(columns[0] ?? [])] }] };
  }
  const cells: LayoutCell[] = columns
    .slice(0, 3)
    .map((column, c) =>
      c === 0
        ? { widthPercent: 33, tinted: true, sections: [...column] }
        : { sections: [...column] },
    );
  // v2 never produced more than 2 columns, but fold any extras into the last cell
  const extra = columns.slice(3).flat();
  if (extra.length > 0) cells[cells.length - 1]!.sections.push(...extra);
  return { cells };
}

/** Convert a full v2 PagesLayout into v3 pages (one row per page). */
function rowsFromPagesLayout(pages: PagesLayout): PageRows[] {
  return pages.map((page) => [rowFromColumns(page)]);
}

function cloneRows(pages: PageRows[]): PageRows[] {
  return pages.map((page) =>
    page.map((row) => ({
      cells: row.cells.map((cell) => ({ ...cell, sections: [...cell.sections] })),
    })),
  );
}

/**
 * Migrate any legacy persisted shape (v1 SectionOrderItem[], v2 object, or
 * nothing) into the v3 BuilderLayoutState. Already-v3 payloads pass through.
 */
export function migrateLayoutState(
  raw: unknown,
  config?: Pick<TemplateConfig, 'sidebarEnabled' | 'sidebarSections'> & {
    pages?: PagesLayout;
    pageRows?: PageRows[];
    sectionColumns?: Record<string, number>;
  },
): BuilderLayoutState {
  // v3 passthrough
  const v3 = BuilderLayoutStateSchema.safeParse(raw);
  if (v3.success) return v3.data;

  // v2: pages -> columns -> section ids (each page becomes one row)
  const v2 = BuilderLayoutStateV2Schema.safeParse(raw);
  if (v2.success) {
    return {
      version: 3,
      pages: rowsFromPagesLayout(v2.data.pages),
      hiddenSections: v2.data.hiddenSections,
      sectionColumns: v2.data.sectionColumns,
    };
  }

  // v1: SectionOrderItem[]
  const v1 = z.array(SectionOrderItemSchema).safeParse(raw);
  if (v1.success && v1.data.length > 0) {
    const ordered = v1.data.map((s) => s.id);
    const hidden = v1.data.filter((s) => !s.visible).map((s) => s.id);
    if (config?.sidebarEnabled && config.sidebarSections.length > 0) {
      const sidebar = ordered.filter((id) => config.sidebarSections.includes(id));
      const main = ordered.filter((id) => !config.sidebarSections.includes(id));
      return { version: 3, pages: [[rowFromColumns([sidebar, main])]], hiddenSections: hidden };
    }
    return { version: 3, pages: [[rowFromColumns([ordered])]], hiddenSections: hidden };
  }

  // template-provided v3-native placement
  if (config?.pageRows && config.pageRows.length > 0) {
    return {
      version: 3,
      pages: cloneRows(config.pageRows),
      hiddenSections: [],
      sectionColumns: config.sectionColumns,
    };
  }

  // template-provided v2 placement
  if (config?.pages && config.pages.length > 0) {
    return {
      version: 3,
      pages: rowsFromPagesLayout(config.pages),
      hiddenSections: [],
      sectionColumns: config.sectionColumns,
    };
  }

  // default
  const twoColumn = Boolean(config?.sidebarEnabled && config.sidebarSections.length > 0);
  return { version: 3, pages: rowsFromPagesLayout(defaultPagesLayout(twoColumn)), hiddenSections: [] };
}

/** All section ids placed anywhere in the v3 layout, in reading order. */
export function placedSectionIds(pages: PageRows[]): string[] {
  return pages.flatMap((page) => page.flatMap((row) => row.cells.flatMap((cell) => cell.sections)));
}

/**
 * Derive v1 sidebar/main placement from a v3 layout so legacy renderers
 * (pdfkit/docx generators) can consume builder layouts. Cells that are
 * tinted, or that sit first in a multi-cell row with a width under 50%,
 * count as sidebar; everything else is main. Hidden sections are skipped.
 */
export function legacyPlacementFromLayout(layoutState: BuilderLayoutState): {
  sidebarSections: string[];
  mainSections: string[];
} {
  const hidden = new Set(layoutState.hiddenSections);
  const sidebar: string[] = [];
  const main: string[] = [];
  for (const page of layoutState.pages) {
    for (const row of page) {
      row.cells.forEach((cell, c) => {
        const width = cell.widthPercent ?? 100 / row.cells.length;
        const isSidebar = cell.tinted === true || (row.cells.length > 1 && c === 0 && width < 50);
        const visible = cell.sections.filter((id) => !hidden.has(id));
        if (isSidebar) sidebar.push(...visible);
        else main.push(...visible);
      });
    }
  }
  return { sidebarSections: sidebar, mainSections: main };
}

/* -------------------------------------------------------------------------- */
/*  Resume template entity (template registry)                                */
/* -------------------------------------------------------------------------- */

export const ResumeTemplateSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(60),
  name: z.string().min(1).max(100),
  region: z.string(),
  description: z.string().optional(),
  config: TemplateConfigSchema,
  previewImageUrl: z.string().optional(),
  isBuiltIn: z.boolean().default(false),
  userId: z.string().uuid().nullable().optional(),
  version: z.number().int().default(1),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type ResumeTemplate = z.infer<typeof ResumeTemplateSchema>;

/** Portable template file format (.resume-template.json) */
export const TemplateFileSchema = z.object({
  formatVersion: z.literal(1),
  kind: z.literal('auto-job-apply/resume-template'),
  template: ResumeTemplateSchema.omit({ id: true, userId: true, isBuiltIn: true, createdAt: true, updatedAt: true }),
});
export type TemplateFile = z.infer<typeof TemplateFileSchema>;
