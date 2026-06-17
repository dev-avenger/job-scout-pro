import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql, inArray, ilike } from 'drizzle-orm';
import { applications, applicationEvents, jobs, llmRequests, inboxEmails, companies, profiles } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IApplicationRepository } from './interfaces/application-repository.interface.js';

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /** The user's default profile id (or first), for resume PDF generation. */
  async getDefaultProfileId(userId: string): Promise<string | null> {
    const row =
      (await this.db.query.profiles.findFirst({
        where: and(eq(profiles.userId, userId), eq(profiles.isDefault, true)),
        columns: { id: true },
      })) ??
      (await this.db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: { id: true },
      }));
    return (row as { id?: string } | undefined)?.id ?? null;
  }

  /** Recent applications with their job applyUrl + prepared answers (for the
   *  browser-extension autofill to match against the page the user is on). */
  async getApplicationsForAutofill(userId: string): Promise<Array<{ id: string; applyUrl: string | null; formAnswers: unknown }>> {
    const rows = await this.db
      .select({ id: applications.id, applyUrl: jobs.applyUrl, formAnswers: applications.formAnswers })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt))
      .limit(50);
    return rows as Array<{ id: string; applyUrl: string | null; formAnswers: unknown }>;
  }

  /** The user's full default profile (or first) — for building a resume PDF. */
  async getDefaultProfile(userId: string): Promise<any | null> {
    return (
      (await this.db.query.profiles.findFirst({
        where: and(eq(profiles.userId, userId), eq(profiles.isDefault, true)),
      })) ??
      (await this.db.query.profiles.findFirst({ where: eq(profiles.userId, userId) })) ??
      null
    );
  }

  async list(userId: string, params: { page: number; limit: number; status?: string }) {
    const conditions = [eq(applications.userId, userId)];
    if (params.status) {
      conditions.push(eq(applications.status, params.status));
    }

    const offset = (params.page - 1) * params.limit;

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          application: applications,
          jobTitle: jobs.title,
          companyName: jobs.companyName,
          jobLocation: jobs.location,
        })
        .from(applications)
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .where(and(...conditions))
        .orderBy(desc(applications.createdAt))
        .limit(params.limit)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(and(...conditions)),
    ]);

    const items = rows.map((r) => ({
      ...r.application,
      jobTitle: r.jobTitle,
      companyName: r.companyName,
      jobLocation: r.jobLocation,
    }));

    const total = Number(countResult[0]?.count || 0);
    return { items, total };
  }

  async getById(userId: string, applicationId: string) {
    const rows = await this.db
      .select({
        application: applications,
        jobTitle: jobs.title,
        companyName: jobs.companyName,
        jobLocation: jobs.location,
        jobUrl: jobs.applyUrl,
        jobSourceUrl: jobs.sourceUrl,
        jobDescription: jobs.description,
        relevanceScore: jobs.relevanceScore,
        atsScore: jobs.atsScore,
        scamScore: jobs.scamScore,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) return undefined;
    return {
      ...row.application,
      jobTitle: row.jobTitle,
      companyName: row.companyName,
      jobLocation: row.jobLocation,
      jobUrl: row.jobUrl,
      jobSourceUrl: row.jobSourceUrl,
      jobDescription: row.jobDescription,
      relevanceScore: row.relevanceScore,
      atsScore: row.atsScore,
      scamScore: row.scamScore,
    };
  }

  async getEventsForApplication(applicationId: string) {
    return this.db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, applicationId))
      .orderBy(desc(applicationEvents.createdAt));
  }

  async getEmailsForApplication(applicationId: string) {
    return this.db
      .select()
      .from(inboxEmails)
      .where(eq(inboxEmails.applicationId, applicationId))
      .orderBy(desc(inboxEmails.createdAt));
  }

  async getCompanyByName(name: string) {
    if (!name) return null;
    const rows = await this.db
      .select()
      .from(companies)
      .where(ilike(companies.name, name))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdempotencyKey(key: string) {
    return this.db.query.applications.findFirst({
      where: eq(applications.idempotencyKey, key),
    });
  }

  async create(data: Record<string, unknown>) {
    await this.db.insert(applications).values(data as any);
  }

  async updateStatus(applicationId: string, data: Record<string, unknown>) {
    await this.db.update(applications)
      .set(data as any)
      .where(eq(applications.id, applicationId));
  }

  async recordEvent(data: Record<string, unknown>) {
    await this.db.insert(applicationEvents).values(data as any);
  }

  async getLlmRequestsForApplication(applicationId: string) {
    return this.db
      .select()
      .from(llmRequests)
      .where(eq(llmRequests.applicationId, applicationId))
      .orderBy(desc(llmRequests.createdAt));
  }

  async updateFormAnswers(applicationId: string, formAnswers: unknown) {
    await this.db
      .update(applications)
      .set({ formAnswers: formAnswers as any, updatedAt: new Date() })
      .where(eq(applications.id, applicationId));
  }

  async getReviewQueue(userId: string) {
    // Applications waiting for the user: freshly queued, prepared-and-filled
    // (pending_review), or stopped on a CAPTCHA.
    return this.db.query.applications.findMany({
      where: and(
        eq(applications.userId, userId),
        inArray(applications.status, ['queued', 'pending_review', 'needs_captcha']),
      ),
      orderBy: [desc(applications.createdAt)],
    });
  }

  async getDeadLetter(userId: string) {
    return this.db.query.applications.findMany({
      where: and(eq(applications.userId, userId), eq(applications.status, 'failed')),
      orderBy: [desc(applications.updatedAt)],
    });
  }
}
