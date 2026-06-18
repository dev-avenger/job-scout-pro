import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { generateId } from '@auto-job-apply/shared-utils';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { ApplicationStatus } from '@auto-job-apply/shared-types';
import { APPLICATION_REPOSITORY } from './application.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IApplicationRepository } from './interfaces/application-repository.interface.js';
import type { IApplicationService } from './interfaces/application-service.interface.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';
import { buildResumeData } from '../resume/export/resume-data.js';
import type { ResumeData } from '../resume/export/pdf-generator.js';

const logger = createLogger({ name: 'application-service' });

@Injectable()
export class ApplicationService implements IApplicationService {
  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly repo: IApplicationRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async list(userId: string, params: { page: number; limit: number; status?: string }) {
    const { items, total } = await this.repo.list(userId, params);
    return {
      items,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async getById(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  /** Assemble the rich shape the Application Detail page expects. */
  async getDetail(userId: string, applicationId: string) {
    const a = (await this.repo.getById(userId, applicationId)) as Record<string, any> | undefined;
    if (!a) throw new NotFoundException('Application not found');
    // Resume that will be attached: a job-tailored PDF generated for this
    // application (falls back to the base profile when not tailored).
    const profileId = await this.repo.getDefaultProfileId(userId);
    const resumeFilename = `${String(a.companyName ?? 'Company').replace(/[^a-zA-Z0-9]+/g, '_')}_Resume.pdf`;
    return {
      id: a.id,
      jobId: a.jobId,
      status: a.status,
      autonomyMode: a.autonomyMode,
      retryCount: a.retryCount ?? 0,
      failureReason: a.failureReason ?? null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      submittedAt: a.submittedAt ?? null,
      job: {
        title: a.jobTitle ?? 'Job',
        company: a.companyName ?? '',
        location: a.jobLocation ?? '',
        // Original posting URL (preferred) and the apply URL. getById aliases
        // jobs.applyUrl → jobUrl, so read that, not a.applyUrl.
        url: a.jobSourceUrl ?? a.jobUrl ?? undefined,
        applyUrl: a.jobUrl ?? undefined,
      },
      scores:
        a.relevanceScore != null || a.atsScore != null || a.scamScore != null
          ? { relevance: a.relevanceScore ?? 0, ats: a.atsScore ?? 0, scam: a.scamScore ?? 0 }
          : null,
      documents: {
        resumeText: a.tailoredResume ?? null,
        coverLetterText: a.coverLetter ?? null,
        // Downloadable resume PDF — job-tailored when available. null when the
        // user has no profile yet.
        resumeUrl: profileId ? `/applications/${applicationId}/resume.pdf` : null,
        resumeTailored: Boolean(a.tailoredResume),
        resumeFilename,
      },
      formAnswers: a.formAnswers ?? null,
      emails: (await this.repo.getEmailsForApplication(applicationId)).map((e: any) => ({
        id: e.id,
        from: e.fromAddress ?? '',
        subject: e.subject ?? '',
        date: e.createdAt,
        classification: e.classification ?? 'unknown',
      })),
      companyBrief: await this.buildCompanyBrief(a.companyName),
      llmRequests: await this.repo.getLlmRequestsForApplication(applicationId),
    };
  }

  /**
   * Find the application matching the apply page the user is on (by shared URL
   * token, e.g. the Workable shortcode) and return its prepared answers — used
   * by the browser extension to auto-fill the form in the user's own browser.
   */
  async getAutofill(userId: string, pageUrl: string): Promise<{
    applicationId: string;
    answers: Array<{ fieldId: string; label?: string; value: unknown; type?: string }>;
    education: Array<Record<string, string>>;
    experience: Array<Record<string, string | boolean>>;
    resumeUrl: string;
    resumeFilename: string;
  } | null> {
    const tokens = (url: string): string[] => {
      try {
        return new URL(url).pathname.split('/').filter((s) => s.length >= 6 && /[a-z0-9]/i.test(s));
      } catch {
        return [];
      }
    };
    const pageTokens = new Set(tokens(pageUrl));
    if (pageTokens.size === 0) return null;

    const apps = await this.repo.getApplicationsForAutofill(userId);
    const match = apps.find(
      (a) => a.applyUrl && tokens(a.applyUrl).some((t) => pageTokens.has(t)),
    );
    if (!match) return null;

    const fa = (match.formAnswers as { answers?: any[] } | null) ?? {};

    // Structured education/experience for ATS forms that have repeatable
    // "group" sections (e.g. Workable). Keys match the sub-field input names.
    const profile = (await this.repo.getDefaultProfile(userId)) as Record<string, any> | null;
    const edu = (profile?.education as any[]) ?? [];
    const exp = (profile?.experience as any[]) ?? [];

    return {
      applicationId: match.id,
      answers: (fa.answers ?? []).map((a: any) => ({ fieldId: a.fieldId, label: a.label, value: a.value, type: a.type })),
      education: edu.map((e) => ({
        school: String(e.institution ?? e.school ?? ''),
        field_of_study: String(e.field ?? e.fieldOfStudy ?? e.field_of_study ?? ''),
        degree: String(e.degree ?? ''),
        start_date: this.toMMYYYY(e.startDate ?? e.start_date),
        end_date: this.toMMYYYY(e.endDate ?? e.end_date),
      })),
      experience: exp.map((e) => ({
        title: String(e.title ?? ''),
        company: String(e.company ?? ''),
        industry: String(e.industry ?? ''),
        summary: String(e.description ?? (Array.isArray(e.bullets) ? e.bullets.join('\n') : '') ?? ''),
        start_date: this.toMMYYYY(e.startDate ?? e.start_date),
        end_date: this.toMMYYYY(e.endDate ?? e.end_date),
        current: Boolean(e.current ?? (!e.endDate && !e.end_date)),
      })),
      resumeUrl: `/applications/${match.id}/resume.pdf`,
      resumeFilename: 'Resume.pdf',
    };
  }

  /** Best-effort convert a resume date into Workable's MM/YYYY text format. */
  private toMMYYYY(value: unknown): string {
    if (!value) return '';
    const v = String(value).trim();
    if (/^(present|current|now|ongoing)$/i.test(v)) return '';
    let m = v.match(/^(\d{4})[-/.](\d{1,2})/); // 2021-03
    if (m) return `${String(Number(m[2])).padStart(2, '0')}/${m[1]}`;
    m = v.match(/^(\d{1,2})[-/.](\d{4})$/); // 03/2021
    if (m) return `${String(Number(m[1])).padStart(2, '0')}/${m[2]}`;
    const months: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    m = v.match(/^([a-z]{3,})\.?\s+(\d{4})/i); // Mar 2021
    if (m) {
      const mo = months[m[1]!.slice(0, 3).toLowerCase()];
      if (mo) return `${String(mo).padStart(2, '0')}/${m[2]}`;
    }
    m = v.match(/^(\d{4})$/); // bare year
    if (m) return `01/${m[1]}`;
    return '';
  }

  /** ResumeData for this application's PDF — tailored when available. */
  async getResumeData(
    userId: string,
    applicationId: string,
  ): Promise<{ data: ResumeData; filename: string } | null> {
    const a = (await this.repo.getById(userId, applicationId)) as Record<string, any> | undefined;
    if (!a) throw new NotFoundException('Application not found');
    const profile = await this.repo.getDefaultProfile(userId);
    if (!profile) return null;
    const data = buildResumeData(profile as Record<string, any>, a.tailoredResume ?? null);
    const filename = `${String(a.companyName ?? 'Company').replace(/[^a-zA-Z0-9]+/g, '_')}_Resume.pdf`;
    return { data, filename };
  }

  private async buildCompanyBrief(companyName?: string) {
    if (!companyName) return null;
    const c = (await this.repo.getCompanyByName(companyName)) as Record<string, any> | null;
    if (!c) return null;
    const brief = (c.researchData as Record<string, unknown> | null)?.brief as string | undefined;
    // Only return a brief if we actually have research or enrichment data
    if (!brief && !c.industry && c.glassdoorRating == null) return null;
    return {
      description: brief ?? '',
      size: c.sizeRange ?? '',
      industry: c.industry ?? '',
      glassdoorScore: c.glassdoorRating ?? null,
      cultureScore: c.culturalFitScore ?? null,
      growthScore: c.stabilityScore ?? null,
    };
  }

  async getEvents(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) return [];
    const events = await this.repo.getEventsForApplication(applicationId);
    return (events as any[]).map((e) => ({
      id: e.id,
      type: e.eventType,
      description:
        e.oldValue && e.newValue
          ? `${e.eventType.replace(/_/g, ' ')}: ${e.oldValue} → ${e.newValue}`
          : e.eventType.replace(/_/g, ' '),
      createdAt: e.createdAt,
    }));
  }

  async updateFormAnswers(userId: string, applicationId: string, answers: unknown) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');
    await this.repo.updateFormAnswers(applicationId, answers);
  }

  async queue(userId: string, jobId: string, autonomyMode: string) {
    const idempotencyKey = `${userId}:${jobId}`;
    const existing = await this.repo.findByIdempotencyKey(idempotencyKey);

    if (existing) {
      return { id: existing.id, alreadyExists: true };
    }

    const id = generateId();
    await this.repo.create({
      id,
      userId,
      jobId,
      status: 'queued',
      idempotencyKey,
      autonomyMode,
    });

    await this.repo.recordEvent({
      id: generateId(),
      applicationId: id,
      eventType: 'status_changed',
      oldValue: undefined,
      newValue: 'queued',
    });

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'application.queued',
      data: { applicationId: id, jobId },
    });

    return { id, alreadyExists: false };
  }

  async updateStatus(userId: string, applicationId: string, newStatus: ApplicationStatus) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');

    const oldStatus = app.status;
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'submitted') updateData.submittedAt = new Date();
    if (newStatus === 'confirmed') updateData.confirmedAt = new Date();

    await this.repo.updateStatus(applicationId, updateData);

    await this.repo.recordEvent({
      id: generateId(),
      applicationId,
      eventType: 'status_changed',
      oldValue: oldStatus,
      newValue: newStatus,
    });

    await this.eventBus.emit({
      id: generateId(),
      timestamp: new Date(),
      userId,
      type: 'application.status_changed',
      data: { applicationId, from: oldStatus, to: newStatus },
    });
  }

  async approve(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');

    if (app.status === 'queued') {
      await this.updateStatus(userId, applicationId, 'in_progress');
      return;
    }

    if (app.status === 'pending_review') {
      // Immutable audit record of exactly what was submitted to this job —
      // the application row's formAnswers can be edited later, this cannot.
      await this.repo.recordEvent({
        id: generateId(),
        applicationId,
        eventType: 'submission_record',
        oldValue: 'pending_review',
        newValue: 'submitted',
        metadata: {
          submittedAt: new Date().toISOString(),
          formAnswers: (app as Record<string, unknown>).formAnswers ?? null,
          coverLetter: (app as Record<string, unknown>).coverLetter ?? null,
        },
      });
      await this.updateStatus(userId, applicationId, 'submitted');
      return;
    }

    throw new BadRequestException('Can only approve queued or reviewed applications');
  }

  async reject(userId: string, applicationId: string) {
    await this.updateStatus(userId, applicationId, 'withdrawn');
  }

  async retry(userId: string, applicationId: string) {
    const app = await this.repo.getById(userId, applicationId);
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'failed') throw new BadRequestException('Can only retry failed applications');

    await this.repo.updateStatus(applicationId, {
      status: 'queued',
      retryCount: (app.retryCount || 0) + 1,
      failureReason: null,
      failureType: null,
      updatedAt: new Date(),
    });

    await this.repo.recordEvent({
      id: generateId(),
      applicationId,
      eventType: 'status_changed',
      oldValue: 'failed',
      newValue: 'queued',
    });
  }

  async getReviewQueue(userId: string) {
    return this.repo.getReviewQueue(userId);
  }

  async getDeadLetter(userId: string) {
    return this.repo.getDeadLetter(userId);
  }
}
