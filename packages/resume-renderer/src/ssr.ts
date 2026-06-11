import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BuilderLayoutState, TemplateConfig } from '@auto-job-apply/shared-types';
import { ResumeDocument } from './document.js';
import { resumeBaseCss } from './styles.js';
import { normalizeResumeData } from './types.js';

/**
 * Server-side render a resume to a self-contained HTML document.
 * Used by the API's WYSIWYG PDF engine (headless Chromium printing).
 */
export function renderResumeHtml(
  profileLike: unknown,
  config: TemplateConfig,
  layoutState: BuilderLayoutState,
): string {
  const data = normalizeResumeData(profileLike);
  const markup = renderToStaticMarkup(
    createElement(ResumeDocument, { data, config, layoutState, pageGapPx: 0 }),
  );
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${resumeBaseCss(config.pageFormat)}</style>
  </head>
  <body>${markup}</body>
</html>`;
}
