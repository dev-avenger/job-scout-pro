import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { companies } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { IResearchRepository } from './interfaces/research-repository.interface.js';

@Injectable()
export class ResearchRepository implements IResearchRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async getCompany(companyId: string) {
    return this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
  }

  async createCompany(data: Record<string, unknown>) {
    await this.db.insert(companies).values(data as any);
  }

  async updateCompanyResearch(companyId: string, data: Record<string, unknown>) {
    await this.db.update(companies)
      .set(data as any)
      .where(eq(companies.id, companyId));
  }
}
