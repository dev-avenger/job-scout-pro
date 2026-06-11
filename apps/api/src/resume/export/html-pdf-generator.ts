import { Injectable } from '@nestjs/common';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { BuilderLayoutState, TemplateConfig } from '@auto-job-apply/shared-types';
import { renderResumeHtml } from '@auto-job-apply/resume-renderer';

const logger = createLogger({ name: 'html-pdf-generator' });

/**
 * WYSIWYG PDF engine: renders the exact same React components used by the
 * web preview/builder (via @auto-job-apply/resume-renderer) to static HTML,
 * then prints it with headless Chromium (playwright-core).
 *
 * Requires a Chromium binary — either:
 *  - PLAYWRIGHT_CHROMIUM_PATH / CHROMIUM_PATH env var, or
 *  - browsers installed via `npx playwright install chromium`.
 *
 * Returns null when Chromium isn't available so callers can fall back to
 * the pdfkit engine.
 */
@Injectable()
export class HtmlPdfGenerator {
  async generate(
    profileLike: unknown,
    config: TemplateConfig,
    layoutState: BuilderLayoutState,
  ): Promise<Buffer | null> {
    let playwright: typeof import('playwright-core') | null = null;
    try {
      playwright = await import('playwright-core');
    } catch {
      logger.warn('playwright-core not installed — falling back to pdfkit engine');
      return null;
    }

    const html = renderResumeHtml(profileLike, config, layoutState);

    const executablePath =
      process.env.PLAYWRIGHT_CHROMIUM_PATH || process.env.CHROMIUM_PATH || undefined;

    let browser: import('playwright-core').Browser | null = null;
    try {
      browser = await playwright.chromium.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: config.pageFormat === 'letter' ? 'Letter' : 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      return Buffer.from(pdf);
    } catch (err) {
      logger.warn({ error: err }, 'Chromium PDF rendering failed — falling back to pdfkit engine');
      return null;
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }
}
