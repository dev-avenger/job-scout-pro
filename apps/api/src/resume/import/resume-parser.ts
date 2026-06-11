import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'resume-parser' });

export interface ParsedResume {
  name?: string;
  contactInfo: { email?: string; phone?: string; linkedin?: string; github?: string };
  summary?: string;
  skills: string[];
  rawText: string;
}

/** Extract plain text from an uploaded PDF or DOCX buffer. */
export async function extractResumeText(filename: string, buffer: Buffer): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) {
    // import lib path directly: pdf-parse's index.js has debug code that breaks under ESM
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js' as 'pdf-parse');
    const result = await pdfParse(buffer);
    return result.text ?? '';
  }
  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? '';
  }
  throw new Error('Unsupported file type — expected .pdf or .docx');
}

const SECTION_HEADINGS = [
  'summary', 'objective', 'profile', 'about',
  'skills', 'technical skills', 'core competencies',
  'experience', 'work experience', 'employment',
  'education', 'projects', 'certifications', 'languages',
];

function isHeading(line: string): string | null {
  const clean = line.trim().toLowerCase().replace(/[:\s]+$/, '');
  return SECTION_HEADINGS.find((h) => clean === h) ?? null;
}

/**
 * Heuristic extraction of structured fields from resume text.
 * Conservative: only fills fields it is confident about; the full text is
 * stored as rawImport so nothing is lost.
 */
export function parseResumeText(text: string): ParsedResume {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0];
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim();
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+/i)?.[0];
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)]+/i)?.[0];

  // Name: first non-empty line that isn't contact info or a heading
  const name = nonEmpty.find(
    (l) => !l.includes('@') && !/\d{4}/.test(l) && !isHeading(l) && l.length <= 60 && /[a-zA-Z]/.test(l),
  );

  // Section-based extraction for summary and skills
  let summary: string | undefined;
  const skills: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = isHeading(lines[i] ?? '');
    if (!heading) continue;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length && body.length < 10; j++) {
      const line = lines[j];
      if (line === undefined) break;
      if (line && isHeading(line)) break;
      if (line) body.push(line);
    }
    if (['summary', 'objective', 'profile', 'about'].includes(heading) && !summary) {
      summary = body.join(' ').slice(0, 1000) || undefined;
    }
    if (['skills', 'technical skills', 'core competencies'].includes(heading) && skills.length === 0) {
      for (const line of body) {
        skills.push(
          ...line
            .split(/[,•|;·]+/)
            .map((s) => s.replace(/^[-–*\s]+/, '').trim())
            .filter((s) => s && s.length <= 40),
        );
      }
    }
  }

  logger.info(
    { email: Boolean(email), skills: skills.length, summary: Boolean(summary) },
    'Parsed resume text',
  );

  return {
    name,
    contactInfo: { email, phone, linkedin, github },
    summary,
    skills: skills.slice(0, 50),
    rawText: text,
  };
}
