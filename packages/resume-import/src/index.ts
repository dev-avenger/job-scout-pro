export { mapJsonResume, isJsonResume } from './json-resume.js';
export { mapReactiveResume, isReactiveResume } from './reactive-resume.js';
export { emptyImportedProfile } from './types.js';
export type { ImportedProfile } from './types.js';

import { isJsonResume, mapJsonResume } from './json-resume.js';
import { isReactiveResume, mapReactiveResume } from './reactive-resume.js';
import type { ImportedProfile } from './types.js';

export type DetectedFormat = 'reactive-resume' | 'json-resume' | 'unknown';

export function detectResumeJsonFormat(json: unknown): DetectedFormat {
  if (isReactiveResume(json)) return 'reactive-resume';
  if (isJsonResume(json)) return 'json-resume';
  return 'unknown';
}

/** Parse any supported resume JSON text. Throws on unknown formats. */
export function importResumeJson(text: string): { format: DetectedFormat; profile: ImportedProfile } {
  const json: unknown = JSON.parse(text);
  const format = detectResumeJsonFormat(json);
  if (format === 'reactive-resume') return { format, profile: mapReactiveResume(json) };
  if (format === 'json-resume') return { format, profile: mapJsonResume(json) };
  throw new Error('Unrecognised resume JSON — expected JSON Resume or Reactive Resume format');
}
