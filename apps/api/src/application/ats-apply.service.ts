import { Injectable, Inject, Optional } from '@nestjs/common';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { AgentContext } from '@auto-job-apply/shared-types';
import { AnswerBank } from './answer-bank.js';
import { FormFillerAgent } from './agents/form-filler.agent.js';
import type { FormField } from './agents/dom-analyzer.agent.js';
import { bestOptionMatch } from './field-match.js';

const logger = createLogger({ name: 'ats-apply' });

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/**
 * `greenhouse|workable|lever|smartrecruiters` have a known form schema we can
 * prepare against. `workday|successfactors` are detected (so the pipeline can
 * route them to the browser path and analytics can see them) but have no public
 * form API — `fetchFormSchema` returns null for them.
 */
export type AtsType =
  | 'greenhouse'
  | 'workable'
  | 'lever'
  | 'smartrecruiters'
  | 'bamboohr'
  | 'workday'
  | 'successfactors'
  | 'unknown';

export interface PreparedAnswer {
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  value: string | null;
  source: 'profile' | 'saved_answer' | 'generated' | 'unanswered';
}

export interface PreparedApplication {
  atsType: AtsType;
  applyUrl: string;
  answers: PreparedAnswer[];
  unanswered: string[];
  llmCostCents: number;
}

interface NormalizedField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

/** ATS type strings vary per platform — coerce to the DOM analyzer's enum. */
function coerceFieldType(type: string): FormField['type'] {
  const t = type.toLowerCase();
  if (t.includes('select') || t.includes('dropdown') || t.includes('multiple_choice')) return 'select';
  if (t.includes('textarea') || t.includes('paragraph') || t.includes('free_text')) return 'textarea';
  if (t.includes('file')) return 'file';
  if (t.includes('email')) return 'email';
  if (t.includes('phone') || t.includes('tel')) return 'tel';
  if (t.includes('check') || t.includes('boolean')) return 'checkbox';
  if (t.includes('radio')) return 'radio';
  if (t.includes('date')) return 'date';
  if (t.includes('number') || t.includes('numeric')) return 'number';
  if (t.includes('url')) return 'url';
  return 'text';
}

/**
 * Prepares job applications for ATS-hosted forms.
 *
 * Cost strategy (cheapest first):
 *  1. The form STRUCTURE comes from the ATS public JSON APIs — free, exact,
 *     no DOM scraping or LLM involved.
 *  2. Standard fields (name/email/phone/links/summary) map deterministically
 *     from the profile — free.
 *  3. Previously answered questions come from the answer bank — free.
 *  4. Only genuinely new custom questions go to the LLM (economy tier), and
 *     every generated answer is saved back to the answer bank so each unique
 *     question costs once, ever.
 */
@Injectable()
export class AtsApplyService {
  constructor(
    private readonly answerBank: AnswerBank,
    @Optional() private readonly formFiller?: FormFillerAgent,
  ) {}

  detectAts(applyUrl: string): { type: AtsType; ref?: { board?: string; jobId?: string; shortcode?: string; company?: string } } {
    try {
      const url = new URL(applyUrl);
      const host = url.hostname;
      const parts = url.pathname.split('/').filter(Boolean);

      if (host.includes('greenhouse.io')) {
        // boards.greenhouse.io/{board}/jobs/{id} or job-boards.greenhouse.io/{board}/jobs/{id}
        const jobsIdx = parts.indexOf('jobs');
        if (jobsIdx > 0 && parts[jobsIdx + 1]) {
          return { type: 'greenhouse', ref: { board: parts[0], jobId: parts[jobsIdx + 1] } };
        }
        return { type: 'greenhouse' };
      }
      if (host === 'apply.workable.com') {
        // apply.workable.com/{account}/j/{SHORTCODE}
        const jIdx = parts.indexOf('j');
        if (jIdx >= 0 && parts[jIdx + 1]) {
          return { type: 'workable', ref: { company: parts[0], shortcode: parts[jIdx + 1] } };
        }
        return { type: 'workable' };
      }
      if (host === 'jobs.lever.co' && parts.length >= 2) {
        return { type: 'lever', ref: { company: parts[0], jobId: parts[1] } };
      }
      if (host.includes('smartrecruiters.com')) {
        // jobs.smartrecruiters.com/{Company}/{postingId}-{slug}
        return { type: 'smartrecruiters', ref: { company: parts[0], jobId: parts[1] } };
      }
      if (host.endsWith('.bamboohr.com') || host === 'bamboohr.com') {
        // {company}.bamboohr.com/careers/{id}
        const company = host.split('.')[0];
        const careersIdx = parts.indexOf('careers');
        const jobId = careersIdx >= 0 ? parts[careersIdx + 1] : undefined;
        return { type: 'bamboohr', ref: { company, jobId } };
      }
      if (host.includes('myworkdayjobs.com') || host.includes('myworkday.com')) {
        return { type: 'workday', ref: { company: host.split('.')[0] } };
      }
      if (host.includes('successfactors') || host.includes('sapsf')) {
        return { type: 'successfactors', ref: { company: host.split('.')[0] } };
      }
      return { type: 'unknown' };
    } catch {
      return { type: 'unknown' };
    }
  }

  async fetchFormSchema(applyUrl: string): Promise<{ atsType: AtsType; fields: NormalizedField[] } | null> {
    const detection = this.detectAts(applyUrl);
    try {
      switch (detection.type) {
        case 'greenhouse': {
          const { board, jobId } = detection.ref ?? {};
          if (!board || !jobId) return null;
          const res = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}?questions=true`,
            { headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA } },
          );
          if (!res.ok) return null;
          const data = (await res.json()) as {
            questions?: Array<{
              label?: string;
              required?: boolean;
              fields?: Array<{ name?: string; type?: string; values?: Array<{ label?: string }> }>;
            }>;
          };
          const fields: NormalizedField[] = (data.questions ?? [])
            .filter((q) => q.label && q.fields?.[0])
            .map((q) => ({
              id: q.fields![0]!.name ?? q.label!,
              label: q.label!,
              type: q.fields![0]!.type ?? 'input_text',
              required: q.required ?? false,
              options: q.fields![0]!.values?.map((v) => v.label ?? '').filter(Boolean),
            }));
          return { atsType: 'greenhouse', fields };
        }
        case 'workable': {
          const { shortcode } = detection.ref ?? {};
          if (!shortcode) return null;
          const res = await fetch(`https://apply.workable.com/api/v1/jobs/${shortcode}/form`, {
            headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
          });
          if (!res.ok) return null;
          const sections = (await res.json()) as Array<{
            fields?: Array<{
              id?: string;
              label?: string;
              type?: string;
              required?: boolean;
              options?: Array<{ name?: string; value?: string }>;
            }>;
          }>;
          if (!Array.isArray(sections)) return null;
          const fields: NormalizedField[] = sections
            .flatMap((s) => s.fields ?? [])
            .filter((f) => f.id && f.label)
            .map((f) => ({
              id: f.id!,
              label: f.label!,
              type: f.type ?? 'text',
              required: f.required ?? false,
              options: f.options?.map((o) => o.name ?? o.value ?? '').filter(Boolean),
            }));
          return { atsType: 'workable', fields };
        }
        case 'lever': {
          // Lever hosted applications use a fixed standard form
          const fields: NormalizedField[] = [
            { id: 'name', label: 'Full name', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'email', required: true },
            { id: 'phone', label: 'Phone', type: 'phone', required: false },
            { id: 'org', label: 'Current company', type: 'text', required: false },
            { id: 'urls[LinkedIn]', label: 'LinkedIn URL', type: 'text', required: false },
            { id: 'urls[GitHub]', label: 'GitHub URL', type: 'text', required: false },
            { id: 'urls[Portfolio]', label: 'Portfolio URL', type: 'text', required: false },
            { id: 'comments', label: 'Additional information / cover letter', type: 'textarea', required: false },
            { id: 'resume', label: 'Resume', type: 'file', required: true },
          ];
          return { atsType: 'lever', fields };
        }
        case 'smartrecruiters': {
          // SmartRecruiters screening questions are not reliably public, but the
          // universal fields always exist — prepare those deterministically so
          // the browser fill has names/contact/resume ready.
          const fields: NormalizedField[] = [
            { id: 'firstName', label: 'First name', type: 'text', required: true },
            { id: 'lastName', label: 'Last name', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'email', required: true },
            { id: 'phoneNumber', label: 'Phone', type: 'phone', required: false },
            { id: 'location', label: 'Location', type: 'text', required: false },
            { id: 'linkedinProfileUrl', label: 'LinkedIn URL', type: 'text', required: false },
            { id: 'resume', label: 'Resume', type: 'file', required: true },
          ];
          return { atsType: 'smartrecruiters', fields };
        }
        case 'bamboohr': {
          // BambooHR's hosted application form uses a stable universal field set.
          // Per-posting custom/screening questions are not reliably exposed by a
          // public API, so (like SmartRecruiters) we prepare the universal fields
          // deterministically and leave any extra questions to the browser/DOM
          // fill at submit time.
          const fields: NormalizedField[] = [
            { id: 'firstName', label: 'First name', type: 'text', required: true },
            { id: 'lastName', label: 'Last name', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'email', required: true },
            { id: 'phone', label: 'Phone', type: 'phone', required: false },
            { id: 'address', label: 'Address', type: 'text', required: false },
            { id: 'city', label: 'City', type: 'text', required: false },
            { id: 'linkedinUrl', label: 'LinkedIn URL', type: 'text', required: false },
            { id: 'websiteUrl', label: 'Website / Portfolio URL', type: 'text', required: false },
            { id: 'resume', label: 'Resume', type: 'file', required: true },
            { id: 'coverLetter', label: 'Cover letter', type: 'textarea', required: false },
          ];
          return { atsType: 'bamboohr', fields };
        }
        default:
          // workday / successfactors / unknown: no public form schema.
          return null;
      }
    } catch (err) {
      logger.error({ error: err, applyUrl }, 'Failed to fetch ATS form schema');
      return null;
    }
  }

  /** Deterministic profile mapping for the universal fields — zero cost. */
  private mapFromProfile(field: NormalizedField, profile: Record<string, unknown>): string | null {
    const contact = (profile.contactInfo as Record<string, unknown>) ?? {};
    const text = `${field.id} ${field.label}`.toLowerCase();
    const name = String(contact.name ?? profile.name ?? '');
    const [firstName, ...rest] = name.split(/\s+/);

    const has = (...words: string[]) => words.some((w) => text.includes(w));

    if (has('first name', 'firstname')) return firstName || null;
    if (has('last name', 'lastname', 'surname')) return rest.join(' ') || null;
    if (has('full name') || field.id === 'name') return name || null;
    if (has('email')) return String(contact.email ?? '') || null;
    if (has('phone')) return String(contact.phone ?? '') || null;
    if (has('address', 'location', 'city')) return String(contact.location ?? '') || null;
    if (has('linkedin')) return String(contact.linkedin ?? '') || null;
    if (has('github')) return String(contact.github ?? '') || null;
    if (has('website', 'portfolio', 'other url')) return String(contact.website ?? '') || null;
    if (has('current company', 'current employer')) {
      const experience = profile.experience as Array<Record<string, unknown>> | undefined;
      return String(experience?.[0]?.company ?? '') || null;
    }
    // Education / Experience sections — build from the structured profile arrays
    // (was previously ignored, so these fell back to flat answer-bank text).
    if (field.id === 'education' || (text.includes('education') && !has('email'))) {
      const edu = profile.education as Array<Record<string, unknown>> | undefined;
      const out = (edu ?? [])
        .map((e) => this.formatEntry([e.degree, e.institution], [e.startDate, e.endDate]))
        .filter(Boolean)
        .join('\n');
      return out || null;
    }
    if (field.id === 'experience' || text.includes('experience')) {
      const exp = profile.experience as Array<Record<string, unknown>> | undefined;
      const out = (exp ?? [])
        .map((e) => this.formatEntry([e.title, e.company], [e.startDate, e.endDate], e.description))
        .filter(Boolean)
        .join('\n');
      return out || null;
    }
    if (has('summary', 'about you', 'headline')) return String(profile.summary ?? '') || null;
    if (field.type === 'file') return null; // handled separately (resume upload)
    return null;
  }

  /** "Title at Company (Jan 2021 - Present)\n- bullet" from structured parts. */
  private formatEntry(
    parts: unknown[],
    dates: unknown[],
    description?: unknown,
  ): string {
    const head = parts.map((p) => (p ? String(p).trim() : '')).filter(Boolean).join(', ');
    if (!head) return '';
    const range = dates.map((d) => (d ? String(d).trim() : '')).filter(Boolean).join(' - ');
    const desc = description ? `\n${String(description).trim()}` : '';
    return range ? `${head} (${range})${desc}` : `${head}${desc}`;
  }

  async prepare(
    applyUrl: string,
    profile: Record<string, unknown>,
    userId: string,
    context: AgentContext,
  ): Promise<PreparedApplication | null> {
    const schema = await this.fetchFormSchema(applyUrl);
    if (!schema || schema.fields.length === 0) return null;

    const answers: PreparedAnswer[] = [];
    const needsLlm: NormalizedField[] = [];

    for (const field of schema.fields) {
      // 1. profile mapping (free)
      const fromProfile = this.mapFromProfile(field, profile);
      if (fromProfile) {
        answers.push({ ...this.base(field), value: fromProfile, source: 'profile' });
        continue;
      }
      if (field.type === 'file') {
        // Resume/CV file fields: resolve the resume that will be attached at
        // submit (the imported CV, or a PDF generated from the profile).
        // Other file fields (e.g. Photo) stay optional/unanswered.
        const isResume = /resume|cv/i.test(`${field.id} ${field.label}`);
        if (isResume) {
          const raw = profile.rawImport as { filename?: string } | undefined;
          const candidate = String(
            (profile.contactInfo as Record<string, unknown> | undefined)?.name ?? profile.name ?? 'Resume',
          )
            .trim()
            .replace(/\s+/g, '_');
          const ref = raw?.filename || `${candidate}_Resume.pdf`;
          answers.push({ ...this.base(field), value: ref, source: 'profile' });
        } else {
          answers.push({ ...this.base(field), value: null, source: 'unanswered' });
        }
        continue;
      }
      // 2. answer bank — exact label (free)
      const saved = await this.answerBank.findByLabel(userId, field.label);
      if (saved) {
        await this.answerBank.incrementUsage(saved.id);
        answers.push({
          ...this.base(field),
          value: this.snapToOption(field, saved.answerText),
          source: 'saved_answer',
        });
        continue;
      }
      // 2b. answer bank — semantic match of a similar past question (free reuse;
      // only an embedding call, far cheaper than generating a fresh answer)
      const similar = await this.answerBank.findSemantic(userId, field.label);
      if (similar) {
        await this.answerBank.incrementUsage(similar.id);
        answers.push({
          ...this.base(field),
          value: this.snapToOption(field, similar.answerText),
          source: 'saved_answer',
        });
        continue;
      }
      needsLlm.push(field);
    }

    // 3. LLM only for the leftovers, answers cached for next time
    let llmCostCents = 0;
    if (needsLlm.length > 0 && this.formFiller) {
      try {
        const formFields: FormField[] = needsLlm.map((f) => ({
          label: f.label,
          selector: f.id,
          type: coerceFieldType(f.type),
          required: f.required,
          options: f.options,
        }));
        const { result, costCents } = await this.formFiller.mapFieldsToAnswers(
          formFields,
          profile,
          [],
          context,
        );
        llmCostCents = costCents;
        for (const field of needsLlm) {
          const generated = result.answers.find((a) => a.selector === field.id || a.label === field.label);
          if (generated && generated.value && generated.confidence >= 0.5) {
            answers.push({ ...this.base(field), value: this.snapToOption(field, generated.value), source: 'generated' });
            await this.answerBank.save(userId, field.label, generated.value, field.type, 'generated');
          } else {
            answers.push({ ...this.base(field), value: null, source: 'unanswered' });
          }
        }
      } catch (err) {
        logger.warn({ error: err }, 'LLM form filling failed — leaving custom questions unanswered');
        for (const field of needsLlm) {
          answers.push({ ...this.base(field), value: null, source: 'unanswered' });
        }
      }
    } else {
      for (const field of needsLlm) {
        answers.push({ ...this.base(field), value: null, source: 'unanswered' });
      }
    }

    const unanswered = answers.filter((a) => a.source === 'unanswered' && a.type !== 'file').map((a) => a.label);

    logger.info(
      {
        applyUrl,
        atsType: schema.atsType,
        total: answers.length,
        fromProfile: answers.filter((a) => a.source === 'profile').length,
        fromBank: answers.filter((a) => a.source === 'saved_answer').length,
        generated: answers.filter((a) => a.source === 'generated').length,
        unanswered: unanswered.length,
        llmCostCents,
      },
      'Application prepared',
    );

    return { atsType: schema.atsType, applyUrl, answers, unanswered, llmCostCents };
  }

  private base(field: NormalizedField): Omit<PreparedAnswer, 'value' | 'source'> {
    return { fieldId: field.id, label: field.label, type: field.type, required: field.required };
  }

  /**
   * For fields with a fixed option set (selects/radios), coerce a free-text
   * answer onto the closest allowed option so the value is actually submittable.
   * Falls back to the original value when no option is close enough.
   */
  private snapToOption(field: NormalizedField, value: string): string {
    if (!value || !field.options || field.options.length === 0) return value;
    return bestOptionMatch(value, field.options) ?? value;
  }
}
