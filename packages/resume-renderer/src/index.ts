export { normalizeResumeData } from './types.js';
export type { ResumeRenderData } from './types.js';
export { PAGE_SIZES_PX, pageSizePx, templateCssVars, resumeBaseCss } from './styles.js';
export {
  SectionTitle,
  SectionContent,
  CustomSectionContent,
  sectionLabel,
  sectionHasContent,
} from './sections.js';
export type { SectionRenderContext } from './sections.js';
export { ResumeHeader, ResumePage, ResumeDocument, cellWidthPercent } from './document.js';
export type { ResumePageProps, ResumeDocumentProps } from './document.js';
export { renderResumeHtml } from './ssr.js';
