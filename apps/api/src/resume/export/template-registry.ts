import type { TemplateConfig, LayoutType, ThemeType, TemplateColors } from '@auto-job-apply/shared-types';

const THEME_COLORS: Record<ThemeType, TemplateColors> = {
  default: {
    primary: '#1e3a5f',
    secondary: '#2c5282',
    accent: '#2563eb',
    background: '#ffffff',
    text: '#1a202c',
    divider: '#333333',
  },
  blue: {
    primary: '#1e40af',
    secondary: '#2563eb',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#1e293b',
    divider: '#1e40af',
  },
  green: {
    primary: '#065f46',
    secondary: '#047857',
    accent: '#10b981',
    background: '#ffffff',
    text: '#1a202c',
    divider: '#065f46',
  },
  dark: {
    primary: '#111827',
    secondary: '#1f2937',
    accent: '#6366f1',
    background: '#ffffff',
    text: '#111827',
    divider: '#111827',
  },
};

const LAYOUT_CONFIGS: Record<LayoutType, Omit<TemplateConfig, 'theme' | 'colors'>> = {
  classic: {
    layout: 'classic',
    typography: {
      headingFont: 'Helvetica',
      bodyFont: 'Helvetica',
      nameSizePt: 24,
      sectionTitleSizePt: 13,
      bodySizePt: 10,
      lineHeight: 1.2,
    },
    spacing: {
      marginPt: 50,
      sectionGapPt: 12,
      entryGapPt: 6,
    },
    sidebarEnabled: false,
    sidebarWidthPercent: 0,
    sidebarSections: [],
    mainSections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'languages', 'publications', 'volunteer', 'references'],
    headerAlignment: 'center',
    sectionTitleStyle: 'uppercase-line',
  },
  modern: {
    layout: 'modern',
    typography: {
      headingFont: 'Helvetica',
      bodyFont: 'Helvetica',
      nameSizePt: 22,
      sectionTitleSizePt: 12,
      bodySizePt: 10,
      lineHeight: 1.3,
    },
    spacing: {
      marginPt: 40,
      sectionGapPt: 14,
      entryGapPt: 8,
    },
    sidebarEnabled: true,
    sidebarWidthPercent: 35,
    sidebarSections: ['skills', 'languages', 'certifications', 'education'],
    mainSections: ['summary', 'experience', 'projects', 'publications', 'volunteer', 'references'],
    headerAlignment: 'left',
    sectionTitleStyle: 'bold-colored',
  },
  minimal: {
    layout: 'minimal',
    typography: {
      headingFont: 'Helvetica',
      bodyFont: 'Helvetica',
      nameSizePt: 20,
      sectionTitleSizePt: 11,
      bodySizePt: 10,
      lineHeight: 1.4,
    },
    spacing: {
      marginPt: 60,
      sectionGapPt: 16,
      entryGapPt: 8,
    },
    sidebarEnabled: false,
    sidebarWidthPercent: 0,
    sidebarSections: [],
    mainSections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'languages', 'publications', 'volunteer', 'references'],
    headerAlignment: 'left',
    sectionTitleStyle: 'simple',
  },
  creative: {
    layout: 'creative',
    typography: {
      headingFont: 'Helvetica',
      bodyFont: 'Helvetica',
      nameSizePt: 26,
      sectionTitleSizePt: 12,
      bodySizePt: 10,
      lineHeight: 1.3,
    },
    spacing: {
      marginPt: 50,
      sectionGapPt: 14,
      entryGapPt: 7,
    },
    sidebarEnabled: false,
    sidebarWidthPercent: 0,
    sidebarSections: [],
    mainSections: ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'languages', 'publications', 'volunteer', 'references'],
    headerAlignment: 'center',
    sectionTitleStyle: 'boxed',
  },
};

export function getTemplateConfig(layout: LayoutType = 'classic', theme: ThemeType = 'default'): TemplateConfig {
  const layoutConfig = LAYOUT_CONFIGS[layout];
  const colors = THEME_COLORS[theme];

  return {
    ...layoutConfig,
    theme,
    colors,
  };
}
