import { Injectable, Inject, Optional } from '@nestjs/common';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { userPreferences } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { AgentContext } from '@auto-job-apply/shared-types';
import { randomUUID } from 'crypto';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';
import { ImapClient, type ImapConfig } from '../inbox/email/imap-client.js';
import { AtsApplyService } from './ats-apply.service.js';
import { AnswerBank } from './answer-bank.js';
import { PdfGenerator } from '../resume/export/pdf-generator.js';
import { buildResumeData } from '../resume/export/resume-data.js';
import { FormMemory } from './form-memory.js';

const logger = createLogger({ name: 'browser-apply' });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PortalCredential {
  siteName: string;
  username: string;
  password: string;
}

export type ApplyOutcome =
  | { status: 'submitted'; detail: string }
  | { status: 'pending_review'; detail: string; filledFields?: Record<string, string> }
  | { status: 'needs_captcha'; detail: string }
  | { status: 'needs_login'; detail: string }
  | { status: 'manual'; detail: string; applyUrl?: string }
  | { status: 'failed'; detail: string };

interface ApplyParams {
  jobUrl: string;
  profile: Record<string, unknown>;
  userId: string;
  autonomyMode: 'guided' | 'supervised' | 'autonomous';
  credential?: PortalCredential;
  context: AgentContext;
  /** Per-call override: show a real browser window (helps clear Cloudflare). */
  headful?: boolean;
  /** Prepared form answers (from AtsApplyService.prepare) to fill into the form. */
  answers?: Array<{ fieldId: string; label?: string; value: unknown; type?: string }>;
  /** Job-tailored resume content; the attached PDF is generated from this. */
  tailored?: Record<string, unknown> | null;
}

/**
 * Drives a real (persistent) Chrome profile to apply on portals that have no
 * public form API — chiefly Indeed. Two scenarios:
 *
 *   A. "Easily apply" (Indeed-hosted): log in with the user's own credentials,
 *      open the job, walk the Indeed Apply form, fill from profile / answer
 *      bank / LLM, and submit ONLY in autonomous mode (otherwise park for
 *      review).
 *   B. "Apply on company site": follow the outbound redirect; if it lands on a
 *      supported ATS, hand off to AtsApplyService; otherwise return the link
 *      for assisted/manual apply.
 *
 * Reality checks baked in: a persistent Chrome profile (channel:'chrome') is
 * used because it clears Cloudflare far more often than headless-shell; any
 * CAPTCHA / 2FA / login wall short-circuits to the human CAPTCHA queue rather
 * than trying to defeat it.
 */
@Injectable()
export class BrowserApplyService {
  // One persistent profile dir per user+portal so the login survives restarts.
  private readonly profileRoot =
    process.env.BROWSER_PROFILE_DIR || join(process.cwd(), '.browser-profiles');
  // Env default; a per-call `headful` flag (from the user's Indeed setting)
  // overrides it.
  private readonly envHeadless = process.env.BROWSER_HEADLESS !== 'false';

  private resolveHeadless(headful?: boolean): boolean {
    return headful === undefined ? this.envHeadless : !headful;
  }

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly atsApplyService: AtsApplyService,
    private readonly answerBank: AnswerBank,
    @Optional() private readonly pdfGenerator?: PdfGenerator,
    @Optional() private readonly imapClient?: ImapClient,
  ) {}

  /** Read the user's stored IMAP config (set in Settings → Email). */
  private async getImapConfig(userId: string): Promise<ImapConfig | null> {
    try {
      const prefs = await this.db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });
      const channels = (prefs?.notificationChannels as Record<string, unknown> | null) ?? null;
      return (channels?.emailImapConfig as ImapConfig | undefined) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Poll the user's mailbox for a recent Indeed verification code. Indeed
   * emails a 5–6 digit one-time code; we fetch mail from the last few minutes,
   * keep the newest Indeed message, and extract the code.
   */
  private async fetchIndeedCode(userId: string, attempts = 10): Promise<string | null> {
    if (!this.imapClient) {
      logger.warn({ userId }, 'No ImapClient available — cannot auto-read Indeed code');
      return null;
    }
    const config = await this.getImapConfig(userId);
    if (!config) {
      logger.warn({ userId }, 'No IMAP config saved — connect mailbox in Settings → Email');
      return null;
    }
    logger.info({ userId, host: config.host, user: config.auth?.user }, 'Polling mailbox for Indeed code');

    for (let i = 0; i < attempts; i++) {
      try {
        const since = new Date(Date.now() - 10 * 60 * 1000); // last 10 min
        const emails = await this.imapClient.fetchNewEmails(config, since);
        const indeedEmails = emails
          .filter((e) => /indeed/i.test(`${e.from} ${e.subject}`))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        logger.info(
          { userId, attempt: i + 1, fetched: emails.length, fromIndeed: indeedEmails.length },
          'IMAP code poll',
        );
        for (const email of indeedEmails) {
          const haystack = `${email.subject}\n${email.textBody}`;
          const m = haystack.match(/\b(\d{5,6})\b/);
          if (m) {
            logger.info({ userId, subject: email.subject }, 'Fetched Indeed verification code from mailbox');
            return m[1]!;
          }
        }
      } catch (err) {
        logger.warn({ userId, error: err }, 'IMAP code fetch attempt failed');
      }
      await new Promise((r) => setTimeout(r, 6000)); // wait for the email to arrive
    }
    logger.warn({ userId }, 'Gave up waiting for Indeed code from mailbox');
    return null;
  }

  /**
   * Verify Indeed credentials by attempting a real login in the persistent
   * profile. Returns ok / needs_captcha / invalid so the UI can react.
   */
  async verifyIndeedLogin(
    userId: string,
    credential: PortalCredential,
    headful?: boolean,
  ): Promise<{ ok: boolean; status: 'ok' | 'needs_captcha' | 'invalid' | 'error'; detail: string }> {
    let playwright: typeof import('playwright-core');
    try {
      playwright = await import('playwright-core');
    } catch {
      return { ok: false, status: 'error', detail: 'playwright-core not installed' };
    }

    const profileDir = join(this.profileRoot, userId, 'indeed');
    let context: import('playwright-core').BrowserContext | null = null;
    try {
      context = await playwright.chromium.launchPersistentContext(profileDir, {
        headless: this.resolveHeadless(headful),
        channel: 'chrome',
        userAgent: BROWSER_UA,
        viewport: { width: 1366, height: 900 },
      });
      const page = context.pages()[0] ?? (await context.newPage());
      const visible = !this.resolveHeadless(headful);
      const result = await this.attemptIndeedLogin(page, credential, visible, userId);
      return { ok: result.status === 'ok', status: result.status, detail: result.detail };
    } catch (err) {
      return { ok: false, status: 'error', detail: err instanceof Error ? err.message : 'Login attempt failed' };
    } finally {
      await context?.close().catch(() => {});
    }
  }

  /** Entry point: route a job URL to the right apply strategy. */
  async apply(params: ApplyParams): Promise<ApplyOutcome> {
    const host = this.safeHost(params.jobUrl);

    // Known ATS (Workable/Greenhouse/Lever): drive the real apply form in the
    // browser — fill fields, upload the resume PDF, then submit (or hand off to
    // the human for any anti-bot challenge like Workable's Turnstile).
    const ats = this.atsApplyService.detectAts(params.jobUrl);
    if (ats.type !== 'unknown') {
      return this.applyAtsForm(params);
    }

    if (host.includes('indeed.')) {
      return this.applyIndeed(params);
    }

    if (host.includes('linkedin.')) {
      return this.applyLinkedIn(params);
    }

    // Unknown portal with no API: assisted/manual apply
    return {
      status: 'manual',
      detail: 'No automated adapter for this portal — opening for manual apply.',
      applyUrl: params.jobUrl,
    };
  }

  /**
   * Browser-assisted apply for Workable / Greenhouse / Lever: open the real
   * apply form, fill every field from the prepared answers, upload a resume PDF
   * generated from the profile, then:
   *   - if an anti-bot challenge is present (e.g. Workable Turnstile) → leave the
   *     window open and return 'manual' so the human solves it and clicks Submit;
   *   - else in 'autonomous' mode → click Submit and return 'submitted';
   *   - else → fill only and return 'pending_review'.
   */
  private async applyAtsForm(params: ApplyParams): Promise<ApplyOutcome> {
    let playwright: typeof import('playwright-core');
    try {
      playwright = await import('playwright-core');
    } catch {
      return { status: 'failed', detail: 'playwright-core not installed' };
    }

    // Generate the resume PDF from the profile (best-effort).
    let resumePath: string | null = null;
    try {
      if (this.pdfGenerator) {
        const buf = await this.pdfGenerator.generate(
          buildResumeData(params.profile as Record<string, any>, (params.tailored ?? null) as any),
        );
        const os = await import('node:os');
        const fs = await import('node:fs/promises');
        resumePath = join(os.tmpdir(), `resume_${randomUUID()}.pdf`);
        await fs.writeFile(resumePath, buf);
      }
    } catch (err) {
      logger.warn({ error: err }, 'Resume PDF generation failed — continuing without attachment');
    }

    // Use an ISOLATED (non-persistent) browser. Workable's guest apply needs no
    // saved login, and a persistent profile dir collides with the user's running
    // Chrome ("Opening in existing browser session") and locks across attempts.
    let browser: import('playwright-core').Browser | null = null;
    let context: import('playwright-core').BrowserContext | null = null;
    let leaveOpen = false; // keep the window for the human (anti-bot challenge)

    try {
      const headless = this.resolveHeadless(params.headful);
      browser = await playwright.chromium
        .launch({ headless, channel: 'chrome' })
        .catch(() => playwright.chromium.launch({ headless }));
      context = await browser.newContext({ userAgent: BROWSER_UA, viewport: { width: 1366, height: 900 } });
      const page = context.pages()[0] ?? (await context.newPage());
      const formUrl = this.atsFormUrl(params.jobUrl);
      await page.goto(formUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // BambooHR (and some other careers pages) keep the application form hidden
      // behind an "Apply for This Job" button on the posting page. Reveal it
      // before filling so the fields actually exist in the DOM. Best-effort: if
      // the button isn't there (form already inline), this is a no-op.
      await this.revealApplicationForm(page, formUrl);

      // Fill prepared answers across ONE or MORE steps. Multi-step ATS forms
      // reveal later fields only after earlier steps advance, so we fill what's
      // present, click Next, and fill again. FormMemory records what we've
      // already filled so nothing is re-entered. Single-step forms fill once,
      // find no "Next" button, and fall straight through to the submit logic
      // below — identical behaviour to before.
      const answers = params.answers ?? [];
      const memory = new FormMemory();
      const labelOf = (a: (typeof answers)[number]) => a.label ?? a.fieldId;
      let filled = 0;
      let resumeAttached = false;

      // Attempt to fill ONE prepared answer on the current DOM. Returns true
      // only if a field was actually filled (Workable combobox, native select,
      // or plain input — same strategies as before, just per-field).
      const tryFill = async (a: (typeof answers)[number]): Promise<boolean> => {
        const id = a.fieldId;
        const value = String(a.value);
        // 1) Workable custom dropdown
        try {
          const combo = page
            .locator(`[id="input_${id}_input"], [data-ui="${id}"] input[role="combobox"]`)
            .first();
          if (await combo.count()) {
            await combo.click({ timeout: 3000 });
            await page.waitForTimeout(400);
            const opt = page
              .locator('[role="option"]', { hasText: new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`, 'i') })
              .first();
            const optLoose = page.locator('[role="option"]', { hasText: value }).first();
            const target = (await opt.count()) ? opt : optLoose;
            if (await target.count()) {
              await target.click({ timeout: 3000 });
              return true;
            }
            await page.keyboard.press('Escape').catch(() => {});
          }
        } catch {
          /* fall through to other strategies */
        }
        // 2) Native <select>
        try {
          const native = page.locator(`select[name="${id}"], select[id="${id}"]`).first();
          if (await native.count()) {
            await native.selectOption({ label: value }).catch(() => native.selectOption(value));
            return true;
          }
        } catch {
          /* fall through */
        }
        // 3) Plain text/email/tel input
        try {
          const loc = page
            .locator(`[name="${id}"]:not([role="combobox"]), [id="${id}"]:not([role="combobox"]), [data-ui="${id}"] input:not([role="combobox"])`)
            .first();
          if (await loc.count()) {
            await loc.fill(value, { timeout: 3000 });
            return true;
          }
        } catch {
          /* not fillable — leave for the human */
        }
        return false;
      };

      const attachResume = async () => {
        if (resumeAttached || !resumePath) return;
        try {
          const f = page
            .locator('input[type=file][data-ui=resume], input[type=file][name=resume], input[type=file][accept*="pdf"]')
            .first();
          if (await f.count()) {
            await f.setInputFiles(resumePath);
            resumeAttached = true;
          }
        } catch {
          /* ignore */
        }
      };

      const MAX_STEPS = 8;
      for (let step = 0; step < MAX_STEPS; step++) {
        for (const a of answers) {
          if (a.value == null || a.value === '' || a.type === 'file') continue;
          const fk = { key: a.fieldId, label: labelOf(a) };
          if (memory.getAnswer(fk) !== undefined) continue; // already filled on an earlier step
          if (await tryFill(a)) {
            memory.setAnswer(fk, String(a.value));
            filled++;
          }
        }
        await attachResume();

        // Advance to the next step ONLY when a Next/Continue control exists and
        // there is no final Submit yet. Otherwise this is the last (or only)
        // step → break and run the existing anti-bot + submit logic unchanged.
        const submitVisible = await page
          .locator('[data-ui=apply-button], button[type=submit]:has-text("Submit"), button:has-text("Submit application")')
          .first()
          .count();
        const nextBtn = page
          .locator('button:has-text("Next"), button:has-text("Continue"), [data-ui="next-button"], button[aria-label*="next" i]')
          .first();
        if (submitVisible || !(await nextBtn.count())) break;
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(2000);
      }

      // Anti-bot challenge present? (Workable uses Cloudflare Turnstile.)
      const challenged = await page.evaluate(() => {
        const d = (globalThis as { document?: any }).document;
        return Boolean(
          d?.querySelector(
            '[id*="turnstile" i],[class*="turnstile" i],iframe[src*="challenges.cloudflare"],iframe[src*="recaptcha"],iframe[src*="hcaptcha"]',
          ),
        );
      });

      if (challenged) {
        // Cloudflare Turnstile / reCAPTCHA loops forever in an automated browser
        // (it detects Playwright). Don't leave a looping window open — close it
        // and tell the user to finish in their own browser, where it passes.
        leaveOpen = false;
        return {
          status: 'manual',
          detail:
            'This site uses Cloudflare anti-bot protection, which blocks automated submission. Your tailored resume and answers are ready — open the job in your own browser and submit there (the check passes for a normal browser).',
          applyUrl: formUrl,
        };
      }

      if (params.autonomyMode === 'autonomous') {
        const submit = page
          .locator('[data-ui=apply-button], button[type=submit]:has-text("Submit"), button:has-text("Submit application")')
          .first();
        if (await submit.count()) {
          await submit.click().catch(() => {});
          await page.waitForTimeout(3500);
          return { status: 'submitted', detail: `Submitted via browser (${filled} fields${resumeAttached ? ' + resume' : ''}).` };
        }
      }

      leaveOpen = params.headful === true; // keep window for the human to finish/submit
      return {
        status: 'pending_review',
        detail: `Form filled (${filled} fields${resumeAttached ? ' + resume' : ''}). Review and click Submit in the browser.`,
      };
    } catch (err) {
      logger.error({ error: err, jobUrl: params.jobUrl }, 'ATS browser apply failed');
      return { status: 'failed', detail: err instanceof Error ? err.message : 'Unknown browser error' };
    } finally {
      // When handing off to the human, keep BOTH the window open and the temp
      // resume on disk (Chrome reads it from disk when they click Submit).
      if (!leaveOpen) {
        await context?.close().catch(() => {});
        await browser?.close().catch(() => {});
        if (resumePath) {
          try {
            (await import('node:fs/promises')).unlink(resumePath);
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  /**
   * Some careers pages render the application fields only after the candidate
   * clicks an "Apply" call-to-action (notably BambooHR's "Apply for This Job").
   * Click it so the form exists before we try to fill it. No-op when the form
   * is already inline or the button can't be found.
   */
  private async revealApplicationForm(
    page: import('playwright-core').Page,
    formUrl: string,
  ): Promise<void> {
    const isBamboo = /(^|\.)bamboohr\.com$/i.test(this.safeHost(formUrl));
    if (!isBamboo) return;

    try {
      // If real form inputs are already present, nothing to reveal.
      const alreadyOpen = await page.locator('input#firstName, input[name="firstName"]').first().count();
      if (alreadyOpen) return;

      const applyBtn = page
        .locator(
          'button:has-text("Apply for This Job"), a:has-text("Apply for This Job"), ' +
            'button:has-text("Apply for this Job"), button:has-text("Apply Now"), a:has-text("Apply Now")',
        )
        .first();
      if (!(await applyBtn.count())) return;

      await applyBtn.click({ timeout: 5000 }).catch(() => {});
      // Wait for a known BambooHR field (or any text input) to render.
      await page
        .locator('input#firstName, input[name="firstName"], input[type="text"]')
        .first()
        .waitFor({ state: 'visible', timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      logger.info({ formUrl }, 'Revealed BambooHR application form');
    } catch (err) {
      logger.debug({ error: err, formUrl }, 'revealApplicationForm best-effort failed');
    }
  }

  /** Workable job URLs need the /apply/ path to land on the form. */
  private atsFormUrl(jobUrl: string): string {
    try {
      const u = new URL(jobUrl);
      if (u.hostname.includes('workable.com') && !u.pathname.includes('/apply')) {
        u.pathname = u.pathname.replace(/\/?$/, '/apply/');
      }
      return u.toString();
    } catch {
      return jobUrl;
    }
  }


  /**
   * LinkedIn "Apply on company site" jobs: open the job page in the user's
   * persistent LinkedIn profile, click through the offsite apply button, and
   * capture the company URL it redirects to. If that destination is a known
   * ATS, the form can be auto-filled; otherwise we hand it back for manual
   * apply. (LinkedIn hides the destination from logged-out guests, so this
   * needs the user to have signed into LinkedIn once in the browser profile.)
   */
  private async applyLinkedIn(params: ApplyParams): Promise<ApplyOutcome> {
    let playwright: typeof import('playwright-core');
    try {
      playwright = await import('playwright-core');
    } catch {
      return { status: 'failed', detail: 'playwright-core not installed' };
    }

    const profileDir = join(this.profileRoot, params.userId, 'linkedin');
    let context: import('playwright-core').BrowserContext | null = null;

    try {
      context = await playwright.chromium.launchPersistentContext(profileDir, {
        headless: this.resolveHeadless(params.headful),
        channel: 'chrome',
        userAgent: BROWSER_UA,
        viewport: { width: 1366, height: 900 },
      });
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(params.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // captureExternalUrl clicks "Apply on company site" and reads the popup /
      // redirect target. For LinkedIn it stays on linkedin.com when a sign-in
      // wall blocks the offsite jump.
      const externalUrl = await this.captureExternalUrl(page);
      if (externalUrl && !/linkedin\.com/i.test(externalUrl)) {
        const ats = this.atsApplyService.detectAts(externalUrl);
        if (ats.type !== 'unknown') {
          return {
            status: 'pending_review',
            detail: `LinkedIn redirects to ${ats.type} (${externalUrl}); auto-fill via form API.`,
          };
        }
        return {
          status: 'manual',
          detail: 'LinkedIn redirects to a company site — opening for manual apply.',
          applyUrl: externalUrl,
        };
      }

      return {
        status: 'needs_login',
        detail:
          'Sign into LinkedIn once in the browser profile so "Apply on company site" links resolve.',
      };
    } catch (err) {
      logger.error({ error: err, jobUrl: params.jobUrl }, 'LinkedIn browser apply failed');
      return { status: 'failed', detail: err instanceof Error ? err.message : 'Unknown browser error' };
    } finally {
      await context?.close().catch(() => {});
    }
  }

  private async applyIndeed(params: ApplyParams): Promise<ApplyOutcome> {
    let playwright: typeof import('playwright-core');
    try {
      playwright = await import('playwright-core');
    } catch {
      return { status: 'failed', detail: 'playwright-core not installed' };
    }

    const profileDir = join(this.profileRoot, params.userId, 'indeed');
    let context: import('playwright-core').BrowserContext | null = null;

    try {
      // Persistent context = real Chrome profile; reuses login cookies and
      // clears Cloudflare far more reliably than a throwaway headless browser.
      context = await playwright.chromium.launchPersistentContext(profileDir, {
        headless: this.resolveHeadless(params.headful),
        channel: 'chrome',
        userAgent: BROWSER_UA,
        viewport: { width: 1366, height: 900 },
      });
      const page = context.pages()[0] ?? (await context.newPage());

      await page.goto(params.jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3500);

      if (await this.isChallenged(page)) {
        await this.raiseCaptcha(params, 'Cloudflare/human verification on the job page');
        return { status: 'needs_captcha', detail: 'Bot challenge on Indeed — solve it in the CAPTCHA queue, then retry.' };
      }

      // Detect apply type
      const applyKind = await page.evaluate(() => {
        const doc = (globalThis as { document?: any }).document;
        const text = doc.body?.textContent ?? '';
        if (/indeedApply|Easily apply/i.test(text) || doc.querySelector('[class*=indeedApply i],[id*=indeedApply i]'))
          return 'easy';
        if (/Apply on company site|Apply now/i.test(text)) return 'external';
        return 'unknown';
      });

      if (applyKind === 'external') {
        // Scenario B: capture the outbound company URL
        const externalUrl = await this.captureExternalUrl(page);
        if (externalUrl) {
          const ats = this.atsApplyService.detectAts(externalUrl);
          if (ats.type !== 'unknown') {
            return {
              status: 'pending_review',
              detail: `Indeed redirects to ${ats.type} (${externalUrl}); will auto-fill via form API.`,
            };
          }
          return { status: 'manual', detail: 'Indeed redirects to a custom company site.', applyUrl: externalUrl };
        }
        return { status: 'manual', detail: 'Could not resolve the company apply link.', applyUrl: params.jobUrl };
      }

      if (applyKind !== 'easy') {
        return { status: 'manual', detail: 'No recognizable apply button on this Indeed job.', applyUrl: params.jobUrl };
      }

      // Scenario A: Indeed "Easily apply" — requires a logged-in session
      const loggedIn = await this.ensureLoggedIn(page, params);
      if (loggedIn.status !== 'ok') return loggedIn.outcome;

      return await this.walkIndeedApplyForm(page, params);
    } catch (err) {
      logger.error({ error: err, jobUrl: params.jobUrl }, 'Indeed browser apply failed');
      return { status: 'failed', detail: err instanceof Error ? err.message : 'Unknown browser error' };
    } finally {
      await context?.close().catch(() => {});
    }
  }

  private async ensureLoggedIn(
    page: import('playwright-core').Page,
    params: ApplyParams,
  ): Promise<{ status: 'ok' } | { status: 'blocked'; outcome: ApplyOutcome }> {
    const signedIn = await page.evaluate(() => {
      const doc = (globalThis as { document?: any }).document;
      return !/Sign in/i.test(doc.querySelector('[data-gnav-element-name=SignIn]')?.textContent ?? 'Sign in');
    });
    if (signedIn) return { status: 'ok' };

    if (!params.credential) {
      return {
        status: 'blocked',
        outcome: { status: 'needs_login', detail: 'Add your Indeed username/password in Settings → Credentials.' },
      };
    }

    const login = await this.attemptIndeedLogin(
      page,
      params.credential,
      !this.resolveHeadless(params.headful),
      params.userId,
    );
    if (login.status === 'ok') return { status: 'ok' };
    if (login.status === 'needs_captcha') {
      await this.raiseCaptcha(params, login.detail);
      return { status: 'blocked', outcome: { status: 'needs_captcha', detail: login.detail } };
    }
    return { status: 'blocked', outcome: { status: 'failed', detail: login.detail } };
  }

  /**
   * Shared Indeed login routine used by both the apply flow and the
   * credential-test endpoint. Handles Indeed's passwordless-by-default screen:
   * after the email step it reveals the password field via "Sign in with
   * password", waits for it to be VISIBLE, fills it, and — when running with a
   * visible window — gives the human time to finish any 2FA/CAPTCHA.
   */
  private async attemptIndeedLogin(
    page: import('playwright-core').Page,
    credential: PortalCredential,
    visible: boolean,
    userId?: string,
  ): Promise<{ status: 'ok' | 'needs_captcha' | 'invalid' | 'error'; detail: string }> {
    const step = (msg: string, extra: Record<string, unknown> = {}) =>
      logger.info({ stage: 'indeed-login', url: page.url(), ...extra }, msg);

    try {
      step('navigating to auth page', { visible });
      await page.goto('https://secure.indeed.com/auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      step('auth page loaded', { title: await page.title().catch(() => '?') });

      if (!this.onAuthGate(page)) {
        step('already signed in (not on an auth path)');
        return { status: 'ok', detail: 'Already signed in to Indeed.' };
      }
      if (await this.isChallenged(page)) {
        step('challenge detected on auth page');
        return await this.waitForHumanOrFail(page, visible, 'Indeed showed a verification challenge on the login page.');
      }

      // Step 1: email
      const email = page.locator('input[type=email], #ifl-InputFormField-3').first();
      const emailCount = await email.count();
      step('email field lookup', { found: emailCount });
      if (emailCount) {
        await email.fill(credential.username);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        step('email submitted', { url: page.url() });
      }
      if (await this.isChallenged(page)) {
        step('challenge after email');
        return await this.waitForHumanOrFail(page, visible, 'Verification appeared after entering email.');
      }

      // Step 2: reveal password option if Indeed defaults to passwordless
      const revealPassword = page.locator(
        'button:has-text("password"), a:has-text("password"), [data-tn-element*="password" i]',
      );
      const revealCount = await revealPassword.count();
      step('password-reveal lookup', { found: revealCount });
      if (revealCount) {
        await revealPassword.first().click().catch(() => {});
        await page.waitForTimeout(1500);
      }

      // Step 3: password — wait until it is actually visible
      const pass = page.locator('input[type=password]').first();
      const passPresent = await pass.count();
      step('password field lookup', { present: passPresent });
      let passwordFilled = false;
      try {
        await pass.waitFor({ state: 'visible', timeout: 6000 });
        await pass.fill(credential.password);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3500);
        passwordFilled = true;
        step('password submitted', { url: page.url() });
      } catch {
        step('password never became visible → passwordless path');
      }

      if (await this.isChallenged(page)) {
        step('challenge after password');
        return await this.waitForHumanOrFail(page, visible, 'Indeed asked for a verification code (2FA/CAPTCHA).');
      }

      // Step 4: email verification code
      const codeField = page.locator(
        'input[autocomplete="one-time-code"], input[name*="code" i], input[id*="otp" i], input[inputmode="numeric"]',
      );
      const codeCount = await codeField.count();
      const pageText = await page
        .evaluate(() => ((globalThis as { document?: any }).document.body?.textContent ?? '').slice(0, 300))
        .catch(() => '');
      step('verification-code field lookup', {
        found: codeCount,
        passwordFilled,
        mentionsCode: /enter code|verification code|sent (you )?a code/i.test(pageText),
      });
      if (userId && codeCount) {
        const codeResult = await this.handleVerificationCode(page, codeField.first(), userId, visible);
        if (codeResult) {
          step('verification-code handling result', { result: codeResult.status, detail: codeResult.detail });
          return codeResult;
        }
      } else if (!passwordFilled) {
        // No password AND no code field — fall to human
        step('no password and no code field → human path');
        return await this.waitForHumanOrFail(page, visible, 'Indeed is using a sign-in method we could not automate.');
      }

      const hasError = await page.evaluate(() => {
        const doc = (globalThis as { document?: any }).document;
        return /incorrect|wrong password|couldn.t find|invalid|try again/i.test(doc.body?.textContent ?? '');
      });
      if (hasError) {
        step('error text detected on page');
        return { status: 'invalid', detail: 'Indeed rejected these credentials.' };
      }

      if (this.onAuthGate(page)) {
        step('still on a verification gate after all steps');
        return await this.waitForHumanOrFail(page, visible, 'Login did not complete automatically.');
      }
      step('login success', { url: page.url() });
      return { status: 'ok', detail: 'Signed in to Indeed successfully.' };
    } catch (err) {
      logger.error({ stage: 'indeed-login', error: err, url: page.url() }, 'Indeed login threw');
      return { status: 'error', detail: err instanceof Error ? err.message : 'Login attempt failed' };
    }
  }

  /**
   * Fetch the emailed Indeed verification code from the user's mailbox and
   * type it in. Falls back to the human path if the mailbox isn't connected or
   * the code never arrives.
   */
  private async handleVerificationCode(
    page: import('playwright-core').Page,
    field: import('playwright-core').Locator,
    userId: string,
    visible: boolean,
  ): Promise<{ status: 'ok' | 'needs_captcha' | 'invalid' | 'error'; detail: string } | null> {
    const config = await this.getImapConfig(userId);
    if (!config) {
      return await this.waitForHumanOrFail(
        page,
        visible,
        'Indeed emailed a verification code, but no mailbox is connected (Settings → Email) to read it automatically.',
      );
    }

    logger.info({ userId }, 'Indeed verification code requested — checking mailbox');
    const code = await this.fetchIndeedCode(userId);
    if (!code) {
      return await this.waitForHumanOrFail(
        page,
        visible,
        'Could not read the Indeed code from your mailbox in time — enter it in the window.',
      );
    }

    try {
      // OTP inputs vary: a single box, or 5–6 single-digit boxes. Type the code
      // digit-by-digit after focusing so it distributes across split boxes;
      // for a single field this fills it normally.
      const allBoxes = page.locator(
        'input[autocomplete="one-time-code"], input[name*="code" i], input[id*="otp" i], input[inputmode="numeric"], input[maxlength="1"]',
      );
      const boxCount = await allBoxes.count();
      logger.info({ userId, boxCount, code: code.replace(/\d/g, '•') }, 'Entering verification code');

      if (boxCount > 1) {
        // Split boxes: focus first, type each digit
        await allBoxes.first().click().catch(() => {});
        await page.keyboard.type(code, { delay: 120 });
      } else {
        await field.click().catch(() => {});
        await field.fill('');
        await page.keyboard.type(code, { delay: 120 });
      }
      await page.waitForTimeout(1000);

      // Click the Sign in / Continue / Verify button. Wait for it to become
      // enabled (Indeed disables it until all digits are entered), and log the
      // outcome instead of silently swallowing a failed click.
      const submitBtn = page
        .locator(
          'button:has-text("Sign in"), button:has-text("Continue"), button:has-text("Verify"), button:has-text("Submit"), button[type="submit"]',
        )
        .first();
      const btnCount = await submitBtn.count();
      logger.info({ userId, submitButtonFound: btnCount }, 'Submitting verification code');
      if (btnCount) {
        try {
          await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
          await submitBtn.click({ timeout: 5000 });
          logger.info({ userId }, 'Clicked sign-in button after code');
        } catch (e) {
          logger.warn({ userId, error: e }, 'Sign-in button click failed, falling back to Enter');
          await page.keyboard.press('Enter');
        }
      } else {
        await page.keyboard.press('Enter');
      }

      // Indeed verifies asynchronously — poll a few seconds for it to advance
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(2000);
        if (this.onPhoneVerification(page)) {
          logger.warn({ userId, url: page.url() }, 'Indeed accepted code but now requires phone verification');
          return await this.waitForHumanOrFail(
            page,
            visible,
            'Email code accepted, but Indeed now requires phone/device verification — complete it in the browser window.',
          );
        }
        if (!this.onAuthGate(page)) {
          logger.info({ userId, url: page.url() }, 'Indeed verification code accepted — signed in');
          return { status: 'ok', detail: 'Signed in to Indeed (verification code auto-filled from your mailbox).' };
        }
      }
      logger.warn({ userId, url: page.url() }, 'Code entered but still on a verification gate');
      return await this.waitForHumanOrFail(page, visible, 'Verification code entered but Indeed did not advance.');
    } catch (err) {
      return { status: 'error', detail: `Failed to enter verification code: ${err instanceof Error ? err.message : 'unknown'}` };
    }
  }

  /**
   * When a visible browser is open, poll for the user to finish login manually
   * (up to ~2 min) before giving up; otherwise short-circuit to the human
   * CAPTCHA queue.
   */
  private async waitForHumanOrFail(
    page: import('playwright-core').Page,
    visible: boolean,
    reason: string,
  ): Promise<{ status: 'ok' | 'needs_captcha'; detail: string }> {
    if (!visible) {
      logger.warn({ stage: 'indeed-login', reason, url: page.url() }, 'Headless and blocked — routing to human');
      return { status: 'needs_captcha', detail: `${reason} Run with the visible-browser toggle on to complete it.` };
    }
    logger.info({ stage: 'indeed-login', reason }, 'Waiting up to 2 min for human to finish login in the window');
    // Visible window: give the human up to 2 minutes to finish
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(2000);
      if (!this.onAuthGate(page) && !(await this.isChallenged(page))) {
        logger.info({ stage: 'indeed-login', url: page.url() }, 'Human completed login');
        return { status: 'ok', detail: 'Signed in to Indeed (completed in the browser window).' };
      }
    }
    logger.warn({ stage: 'indeed-login', url: page.url() }, 'Human did not finish login in time');
    return { status: 'needs_captcha', detail: `${reason} Verification was not completed in time — try again.` };
  }

  private async walkIndeedApplyForm(
    page: import('playwright-core').Page,
    params: ApplyParams,
  ): Promise<ApplyOutcome> {
    const contact = (params.profile.contactInfo as Record<string, unknown>) ?? {};
    const filled: Record<string, string> = {};

    // Open the Indeed Apply flow
    const applyBtn = page.locator('button:has-text("Apply now"), [class*=indeedApply i] button, button:has-text("Easily apply")');
    if (await applyBtn.count()) {
      await applyBtn.first().click().catch(() => {});
      await page.waitForTimeout(3000);
    }

    // Indeed Apply is a multi-step wizard. Fill known fields each step and
    // click Continue until we reach the review/submit step.
    for (let step = 0; step < 8; step++) {
      if (await this.isChallenged(page)) {
        await this.raiseCaptcha(params, 'Verification inside Indeed Apply');
        return { status: 'needs_captcha', detail: 'CAPTCHA inside the apply flow — solve it, then retry.' };
      }

      await this.fillVisibleFields(page, params, contact, filled);

      const review = page.locator('text=/review your application/i, button:has-text("Submit your application")');
      const submit = page.locator('button:has-text("Submit application"), button:has-text("Submit your application")');
      const cont = page.locator('button:has-text("Continue"), button:has-text("Save and continue")');

      if (await submit.count()) {
        if (params.autonomyMode === 'autonomous') {
          await submit.first().click().catch(() => {});
          await page.waitForTimeout(3000);
          return { status: 'submitted', detail: 'Submitted via Indeed Apply (autonomous mode).' };
        }
        return {
          status: 'pending_review',
          detail: 'Indeed Apply filled and stopped at the submit step for your review.',
          filledFields: filled,
        };
      }
      if (await cont.count()) {
        await cont.first().click().catch(() => {});
        await page.waitForTimeout(2500);
        continue;
      }
      break; // no continue/submit found — likely a question we could not answer
    }

    return {
      status: 'pending_review',
      detail: 'Indeed Apply partially filled; some questions need your input.',
      filledFields: filled,
    };
  }

  /** Fill visible inputs on the current step from profile + answer bank. */
  private async fillVisibleFields(
    page: import('playwright-core').Page,
    params: ApplyParams,
    contact: Record<string, unknown>,
    filled: Record<string, string>,
  ): Promise<void> {
    const fields = await page.evaluate(() => {
      const doc = (globalThis as { document?: any }).document;
      const els = Array.from(doc.querySelectorAll('input, textarea')) as any[];
      return els
        .filter((el) => el.offsetParent !== null && !el.value && el.type !== 'hidden' && el.type !== 'file')
        .map((el, i) => {
          if (!el.dataset.aiId) el.dataset.aiId = 'ai-' + i;
          const label =
            doc.querySelector(`label[for="${el.id}"]`)?.textContent ||
            el.getAttribute('aria-label') ||
            el.getAttribute('name') ||
            el.getAttribute('placeholder') ||
            '';
          return { aiId: el.dataset.aiId, label: String(label).trim(), type: el.type };
        });
    });

    for (const f of fields) {
      const value = await this.answerForField(f.label, contact, params.userId);
      if (!value) continue;
      const input = page.locator(`[data-ai-id="${f.aiId}"]`);
      await input.fill(value).catch(() => {});
      filled[f.label || f.aiId] = value;
    }
  }

  private async answerForField(
    label: string,
    contact: Record<string, unknown>,
    userId: string,
  ): Promise<string | null> {
    const t = label.toLowerCase();
    if (!t) return null;
    if (/first name/.test(t)) return String(contact.name ?? '').split(' ')[0] || null;
    if (/last name|surname/.test(t)) return String(contact.name ?? '').split(' ').slice(1).join(' ') || null;
    if (/full name|^name/.test(t)) return String(contact.name ?? '') || null;
    if (/email/.test(t)) return String(contact.email ?? '') || null;
    if (/phone|mobile/.test(t)) return String(contact.phone ?? '') || null;
    if (/city|location|address/.test(t)) return String(contact.location ?? '') || null;
    if (/linkedin/.test(t)) return String(contact.linkedin ?? '') || null;
    // Reuse a previously saved answer for custom questions (free)
    const saved = await this.answerBank.findByLabel(userId, label);
    if (saved) {
      await this.answerBank.incrementUsage(saved.id);
      return saved.answerText;
    }
    return null;
  }

  private async captureExternalUrl(page: import('playwright-core').Page): Promise<string | null> {
    try {
      const context = page.context();
      const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
      const applyNow = page.locator('a:has-text("Apply on company site"), a:has-text("Apply now"), button:has-text("Apply on company site")');
      if (await applyNow.count()) await applyNow.first().click().catch(() => {});
      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        return popup.url();
      }
      // Same-tab redirect
      await page.waitForTimeout(3000);
      const url = page.url();
      return url.includes('indeed.') ? null : url;
    } catch {
      return null;
    }
  }

  private async isChallenged(page: import('playwright-core').Page): Promise<boolean> {
    try {
      const title = await page.title();
      if (/just a moment|attention required|verify/i.test(title)) return true;
      return await page.evaluate(() => {
        const doc = (globalThis as { document?: any }).document;
        const t = doc.body?.textContent ?? '';
        return /verify you are human|complete the security check|i'm not a robot|cf-challenge/i.test(t);
      });
    } catch {
      return false;
    }
  }

  private async raiseCaptcha(params: ApplyParams, reason: string): Promise<void> {
    logger.warn({ reason, applicationId: params.context.applicationId }, 'CAPTCHA / verification required');
    await this.eventBus.emit({
      id: randomUUID(),
      timestamp: new Date(),
      userId: params.userId,
      type: 'captcha.needed',
      data: { applicationId: params.context.applicationId ?? randomUUID(), portal: 'indeed' },
    });
  }

  private safeHost(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * True while still on a sign-in / verification gate. Checks the PATH only —
   * Indeed's post-code redirect carries `from=jspcf-auth-...` in the query,
   * which must not be mistaken for the auth page.
   */
  private onAuthGate(page: import('playwright-core').Page): boolean {
    try {
      const path = new URL(page.url()).pathname.toLowerCase();
      return /\/(auth|login|account\/verify)/.test(path);
    } catch {
      return false;
    }
  }

  /** Indeed's mandatory phone/device verification step (human-only). */
  private onPhoneVerification(page: import('playwright-core').Page): boolean {
    try {
      return /verifyphone|verify-phone|account\/verify/i.test(new URL(page.url()).pathname);
    } catch {
      return false;
    }
  }
}
