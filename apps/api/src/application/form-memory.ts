/**
 * Multi-step / conditional form memory.
 *
 * Multi-step ATS forms reveal new fields only after earlier steps are filled
 * (e.g. "If experience > 5 years, describe your management style"). A single
 * up-front schema fetch can't see them. This tracks which fields have already
 * been seen/answered across steps so each re-scan only surfaces the NEW fields
 * that still need answering — and accumulates answers across the whole walk.
 *
 * Pure and dependency-free: the live browser loop calls recordStep() after each
 * DOM re-scan and answers only the returned fields. Unit-tested independently of
 * Playwright.
 */

export interface MemoryField {
  /** Stable identifier within the form (name/id/selector). */
  key: string;
  label: string;
  type?: string;
  required?: boolean;
}

/** Normalize a field to a comparison key so re-scans don't re-answer it. */
export function fieldKey(f: MemoryField): string {
  const base = (f.key || f.label || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return base;
}

export class FormMemory {
  private readonly seen = new Set<string>();
  private readonly answers = new Map<string, string>();
  /** Number of distinct steps recorded. */
  private steps = 0;

  /**
   * Record the fields visible on the current step and return only those not
   * seen on a previous step (the new work for this step).
   */
  recordStep(fields: MemoryField[]): MemoryField[] {
    this.steps += 1;
    const fresh: MemoryField[] = [];
    for (const f of fields) {
      const k = fieldKey(f);
      if (!k || this.seen.has(k)) continue;
      this.seen.add(k);
      fresh.push(f);
    }
    return fresh;
  }

  setAnswer(field: MemoryField, value: string): void {
    this.answers.set(fieldKey(field), value);
  }

  getAnswer(field: MemoryField): string | undefined {
    return this.answers.get(fieldKey(field));
  }

  hasSeen(field: MemoryField): boolean {
    return this.seen.has(fieldKey(field));
  }

  get stepCount(): number {
    return this.steps;
  }

  get answeredCount(): number {
    return this.answers.size;
  }

  /** All accumulated answers as a plain object keyed by normalized field key. */
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.answers);
  }
}
