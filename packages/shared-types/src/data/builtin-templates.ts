import type { ResumeTemplate, TemplateConfig } from '../models/template.js';
import { defaultPagesLayout } from '../models/template.js';

/* -------------------------------------------------------------------------- */
/*  Built-in regional resume templates                                        */
/*  Layouts modelled on the real regional conventions:                        */
/*  - Europass: classic EU format — label gutter on the left, content right,  */
/*    EU-blue name, thin light-blue rules, photo top-right, personal details  */
/*  - USA: single column, centered name, uppercase ruled headings, Letter     */
/*  - UK/Australia: left-aligned, restrained single column, A4                */
/*  - Pakistan: two-column sidebar with photo + personal details              */
/* -------------------------------------------------------------------------- */

const BASE_TYPOGRAPHY: TemplateConfig['typography'] = {
  headingFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  nameSizePt: 24,
  sectionTitleSizePt: 13,
  bodySizePt: 10,
  lineHeight: 1.2,
};

const BASE_SPACING: TemplateConfig['spacing'] = {
  marginPt: 50,
  sectionGapPt: 12,
  entryGapPt: 6,
};

function makeTemplate(overrides: Partial<TemplateConfig> = {}): TemplateConfig {
  const config: TemplateConfig = {
    layout: 'classic',
    theme: 'default',
    colors: {
      primary: '#1e3a5f',
      secondary: '#2c5282',
      accent: '#2563eb',
      background: '#ffffff',
      text: '#1a202c',
      divider: '#333333',
    },
    typography: BASE_TYPOGRAPHY,
    spacing: BASE_SPACING,
    sidebarEnabled: false,
    sidebarWidthPercent: 0,
    sidebarSections: [],
    mainSections: [],
    headerAlignment: 'center',
    sectionTitleStyle: 'uppercase-line',
    pages: defaultPagesLayout(false),
    pageFormat: 'a4',
    showPhoto: false,
    showPersonalDetails: false,
    dateFormat: 'MM/YYYY',
    layoutVariant: 'standard',
    ...overrides,
  };
  // Keep legacy v1 placement fields in sync for the pdfkit/docx fallback renderers
  if (config.pageRows && config.pageRows.length > 0) {
    // v3-native placement: tinted/narrow first cells are the sidebar
    const sidebar: string[] = [];
    const main: string[] = [];
    for (const page of config.pageRows) {
      for (const row of page) {
        row.cells.forEach((cell, c) => {
          const width = cell.widthPercent ?? 100 / row.cells.length;
          if (cell.tinted === true || (row.cells.length > 1 && c === 0 && width < 50)) {
            sidebar.push(...cell.sections);
          } else {
            main.push(...cell.sections);
          }
        });
      }
    }
    config.sidebarSections = sidebar;
    config.mainSections = main;
    return config;
  }
  const pages = config.pages ?? [];
  if (pages[0] && pages[0].length > 1) {
    config.sidebarSections = [...(pages[0][0] ?? [])];
    config.mainSections = pages.flatMap((page) => page.slice(1).flat());
  } else {
    config.mainSections = pages.flat(2);
  }
  return config;
}

/**
 * Authentic modern-CV placement: a full-width summary row above a
 * two-column row with a tinted 33% sidebar (skills/languages/certs/education).
 */
function modernSidebarPageRows(): NonNullable<TemplateConfig['pageRows']> {
  return [
    [
      { cells: [{ sections: ['summary'] }] },
      {
        cells: [
          {
            widthPercent: 33,
            tinted: true,
            sections: ['skills', 'languages', 'certifications', 'education'],
          },
          { sections: ['experience', 'projects', 'publications', 'volunteer', 'references'] },
        ],
      },
    ],
  ];
}

export type BuiltInTemplate = Omit<ResumeTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & {
  isBuiltIn: true;
};

export const BUILTIN_TEMPLATES: BuiltInTemplate[] = [
  {
    slug: 'europass',
    name: 'Europass CV',
    region: 'eu_europass',
    description:
      'The classic EU Europass layout: section labels in a left gutter ("Personal information", "Work Experience", "Education and Training"…), content on the right, EU-blue name, thin light-blue rules, photo top-right, personal details and EU date format.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      layout: 'classic',
      theme: 'blue',
      layoutVariant: 'label-left',
      colors: {
        primary: '#003399', // EU blue — name + section labels
        secondary: '#4473C5',
        accent: '#4473C5',
        background: '#ffffff',
        text: '#202124',
        divider: '#A8C6E8', // thin light-blue section rules
      },
      typography: {
        headingFont: 'Arial, Helvetica, sans-serif',
        bodyFont: 'Arial, Helvetica, sans-serif',
        nameSizePt: 20,
        sectionTitleSizePt: 11,
        bodySizePt: 10,
        lineHeight: 1.25,
      },
      spacing: { marginPt: 40, sectionGapPt: 10, entryGapPt: 6 },
      headerAlignment: 'left',
      sectionTitleStyle: 'simple',
      // Europass is a single flow: Profile → Work Experience → Education and
      // Training → skills blocks. The gutter comes from the layout variant.
      pages: [
        [
          [
            'summary',
            'experience',
            'education',
            'skills',
            'languages',
            'certifications',
            'projects',
            'publications',
            'volunteer',
            'references',
          ],
        ],
      ],
      sectionColumns: { skills: 2, languages: 2 },
      pageFormat: 'a4',
      showPhoto: true,
      showPersonalDetails: true,
      dateFormat: 'MM.YYYY',
    }),
  },
  {
    slug: 'usa-resume',
    name: 'USA Resume',
    region: 'us_standard',
    description:
      'US norm: single column, centered name, uppercase ruled headings, skills in two columns, no photo or personal details (anti-discrimination), Letter size, one-page bias.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      pageFormat: 'letter',
      dateFormat: 'MM/YYYY',
      sectionColumns: { skills: 2 },
      pages: [
        [
          [
            'summary',
            'skills',
            'experience',
            'education',
            'projects',
            'certifications',
            'publications',
            'volunteer',
            'languages',
            'references',
          ],
        ],
      ],
      spacing: { marginPt: 45, sectionGapPt: 10, entryGapPt: 5 },
    }),
  },
  {
    slug: 'uk-cv',
    name: 'UK CV',
    region: 'uk_standard',
    description:
      'UK-style CV: left-aligned name, simple bold headings, single column, no photo, A4.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      layout: 'minimal',
      headerAlignment: 'left',
      sectionTitleStyle: 'simple',
      pageFormat: 'a4',
      dateFormat: 'MM/YYYY',
      typography: { ...BASE_TYPOGRAPHY, nameSizePt: 21, sectionTitleSizePt: 12, lineHeight: 1.3 },
      spacing: { marginPt: 55, sectionGapPt: 13, entryGapPt: 7 },
    }),
  },
  {
    slug: 'australia-cv',
    name: 'Australia CV',
    region: 'au_standard',
    description:
      'Australian CV: left-aligned, single column, no photo, A4, fuller detail (2–3 pages accepted), DD/MM/YYYY dates.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      theme: 'green',
      colors: {
        primary: '#065f46',
        secondary: '#047857',
        accent: '#10b981',
        background: '#ffffff',
        text: '#1a202c',
        divider: '#065f46',
      },
      headerAlignment: 'left',
      sectionTitleStyle: 'bold-colored',
      pageFormat: 'a4',
      dateFormat: 'DD/MM/YYYY',
    }),
  },
  {
    slug: 'pakistan-cv',
    name: 'Pakistan CV',
    region: 'pk_cv',
    description:
      "Pakistan-style CV: photo and personal details (father's name, CNIC, domicile) with a tinted sidebar for skills/languages/education, A4.",
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      layout: 'modern',
      sidebarEnabled: true,
      sidebarWidthPercent: 33,
      headerAlignment: 'left',
      sectionTitleStyle: 'bold-colored',
      pages: defaultPagesLayout(true),
      pageRows: modernSidebarPageRows(),
      pageFormat: 'a4',
      showPhoto: true,
      showPersonalDetails: true,
      dateFormat: 'DD/MM/YYYY',
    }),
  },
  {
    slug: 'modern-sidebar',
    name: 'Modern Sidebar',
    region: 'general',
    description: 'Two-column layout with tinted sidebar for skills and education.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      layout: 'modern',
      sidebarEnabled: true,
      sidebarWidthPercent: 35,
      headerAlignment: 'left',
      sectionTitleStyle: 'bold-colored',
      pages: defaultPagesLayout(true),
      pageRows: modernSidebarPageRows(),
      spacing: { marginPt: 40, sectionGapPt: 14, entryGapPt: 8 },
    }),
  },
  {
    slug: 'minimal',
    name: 'Minimal',
    region: 'general',
    description: 'Whitespace-heavy single column with understated headings.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      layout: 'minimal',
      headerAlignment: 'left',
      sectionTitleStyle: 'simple',
      spacing: { marginPt: 60, sectionGapPt: 16, entryGapPt: 8 },
      typography: { ...BASE_TYPOGRAPHY, nameSizePt: 20, sectionTitleSizePt: 11, lineHeight: 1.4 },
    }),
  },
  {
    slug: 'creative-banner',
    name: 'Creative Banner',
    region: 'general',
    description: 'Coloured header banner with boxed section titles.',
    isBuiltIn: true,
    version: 1,
    config: makeTemplate({
      layout: 'creative',
      theme: 'dark',
      colors: {
        primary: '#111827',
        secondary: '#1f2937',
        accent: '#6366f1',
        background: '#ffffff',
        text: '#111827',
        divider: '#111827',
      },
      sectionTitleStyle: 'boxed',
      typography: { ...BASE_TYPOGRAPHY, nameSizePt: 26 },
    }),
  },
];
