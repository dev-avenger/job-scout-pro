import type { PageFormat, TemplateConfig } from '@auto-job-apply/shared-types';

/** Page pixel dimensions at 96 dpi */
export const PAGE_SIZES_PX: Record<PageFormat, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 },
  letter: { width: 816, height: 1056 },
};

export function pageSizePx(format?: PageFormat | null): { width: number; height: number } {
  return PAGE_SIZES_PX[format ?? 'a4'];
}

export function templateCssVars(config: TemplateConfig): Record<string, string> {
  return {
    '--tmpl-primary': config.colors.primary,
    '--tmpl-secondary': config.colors.secondary,
    '--tmpl-accent': config.colors.accent,
    '--tmpl-background': config.colors.background,
    '--tmpl-text': config.colors.text,
    '--tmpl-divider': config.colors.divider,
    '--tmpl-heading-font': config.typography.headingFont,
    '--tmpl-body-font': config.typography.bodyFont,
    '--tmpl-name-size': `${config.typography.nameSizePt}pt`,
    '--tmpl-section-title-size': `${config.typography.sectionTitleSizePt}pt`,
    '--tmpl-body-size': `${config.typography.bodySizePt}pt`,
    '--tmpl-line-height': String(config.typography.lineHeight),
    '--tmpl-margin': `${config.spacing.marginPt}pt`,
    '--tmpl-section-gap': `${config.spacing.sectionGapPt}pt`,
    '--tmpl-entry-gap': `${config.spacing.entryGapPt}pt`,
    '--tmpl-sidebar-width': `${config.sidebarWidthPercent}%`,
  };
}

/**
 * Minimal stylesheet for standalone (print/SSR) rendering, where Tailwind
 * is not available. The components rely on inline styles for everything
 * except resets and print page rules.
 */
export function resumeBaseCss(format?: PageFormat | null): string {
  const { width, height } = pageSizePx(format);
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #ffffff; }
  @page { size: ${format === 'letter' ? 'Letter' : 'A4'}; margin: 0; }
  @media print {
    .resume-page { page-break-after: always; }
    .resume-page:last-child { page-break-after: auto; }
  }
  .resume-page { width: ${width}px; min-height: ${height}px; }
  `;
}
