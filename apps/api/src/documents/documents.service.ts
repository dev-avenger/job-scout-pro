import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { applications, jobs, resumeVersions, profiles } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';

export interface DocItem {
  id: string;
  kind: 'resume' | 'cover_letter';
  title: string;
  subtitle?: string;
  createdAt: string;
  format?: 'pdf';
  /** API path to download the file (used with the authenticated blob fetch). */
  downloadPath?: string;
  /** Inline text for cover letters. */
  text?: string;
}

/**
 * Read-only aggregation of the documents the agent has produced: tailored
 * resumes (downloadable as PDF via the existing per-application export) and
 * cover letters (stored as text), drawn from both applications and saved
 * resume versions. No new storage layer — this just surfaces what already exists.
 */
@Injectable()
export class DocumentsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async list(userId: string): Promise<{ resumes: DocItem[]; coverLetters: DocItem[] }> {
    const resumes: DocItem[] = [];
    const coverLetters: DocItem[] = [];

    const apps = (await this.db
      .select({
        id: applications.id,
        createdAt: applications.createdAt,
        tailoredResume: applications.tailoredResume,
        coverLetter: applications.coverLetter,
        jobTitle: jobs.title,
        companyName: jobs.companyName,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt))) as any[];

    for (const a of apps) {
      const title = a.jobTitle ?? 'Application';
      const createdAt = a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt);
      if (a.tailoredResume) {
        resumes.push({
          id: a.id,
          kind: 'resume',
          title,
          subtitle: a.companyName ?? undefined,
          createdAt,
          format: 'pdf',
          downloadPath: `/applications/${a.id}/resume.pdf`,
        });
      }
      if (a.coverLetter) {
        coverLetters.push({
          id: a.id,
          kind: 'cover_letter',
          title,
          subtitle: a.companyName ?? undefined,
          createdAt,
          text: a.coverLetter,
        });
      }
    }

    const versions = (await this.db
      .select({
        id: resumeVersions.id,
        createdAt: resumeVersions.createdAt,
        pdfUrl: resumeVersions.pdfUrl,
        coverLetter: resumeVersions.coverLetter,
        templateLayout: resumeVersions.templateLayout,
      })
      .from(resumeVersions)
      .innerJoin(profiles, eq(resumeVersions.profileId, profiles.id))
      .where(eq(profiles.userId, userId))
      .orderBy(desc(resumeVersions.createdAt))) as any[];

    for (const v of versions) {
      const createdAt = v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt);
      if (v.pdfUrl) {
        resumes.push({
          id: v.id,
          kind: 'resume',
          title: `Saved resume (${v.templateLayout ?? 'version'})`,
          createdAt,
          format: 'pdf',
          downloadPath: v.pdfUrl,
        });
      }
      if (v.coverLetter) {
        coverLetters.push({ id: v.id, kind: 'cover_letter', title: 'Saved cover letter', createdAt, text: v.coverLetter });
      }
    }

    return { resumes, coverLetters };
  }
}
