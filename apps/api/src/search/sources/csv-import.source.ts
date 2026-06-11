import { Injectable, Inject, Optional } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { IJobSource } from '../interfaces/job-source.interface.js';
import type { RawJobListing, SearchCriteria, JobValidationResult } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'csv-import-source' });

interface CsvRow {
  title?: string;
  company?: string;
  company_name?: string;
  location?: string;
  url?: string;
  source_url?: string;
  salary_min?: string;
  salary_max?: string;
  description?: string;
  skills?: string;
  posted_at?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class CsvImportSource implements IJobSource {
  readonly name = 'csv_import';
  readonly channel = 'csv_import';

  private pendingCsvData: string | null = null;

  setCsvData(csvString: string) {
    this.pendingCsvData = csvString;
  }

  async *search(criteria: SearchCriteria): AsyncGenerator<RawJobListing> {
    if (!this.pendingCsvData) {
      logger.debug('No CSV data to process');
      return;
    }

    const csvData = this.pendingCsvData;
    this.pendingCsvData = null;

    try {
      const records: CsvRow[] = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      logger.info({ rowCount: records.length }, 'Parsing CSV import');

      for (const row of records) {
        const title = row.title || '';
        const companyName = row.company || row.company_name || '';
        const sourceUrl = row.url || row.source_url || '';

        if (!title || !companyName) {
          logger.debug({ row }, 'Skipping CSV row - missing title or company');
          continue;
        }

        if (criteria.excludeCompanies?.some(c =>
          companyName.toLowerCase().includes(c.toLowerCase())
        )) continue;

        const skills = row.skills?.split(',').map(s => s.trim()).filter(Boolean);

        yield {
          sourceChannel: 'csv_import',
          sourceUrl: sourceUrl || `csv-import://${encodeURIComponent(title)}`,
          title,
          companyName,
          location: row.location || undefined,
          salaryMin: row.salary_min ? Number(row.salary_min) : undefined,
          salaryMax: row.salary_max ? Number(row.salary_max) : undefined,
          description: row.description || undefined,
          requiredSkills: skills?.length ? skills : undefined,
          postedAt: row.posted_at ? new Date(row.posted_at) : new Date(),
          applyUrl: sourceUrl || undefined,
        } as RawJobListing;
      }
    } catch (err) {
      logger.error({ error: err }, 'CSV parse error');
    }
  }

  async validate(job: RawJobListing): Promise<JobValidationResult> {
    if (job.sourceUrl.startsWith('csv-import://')) {
      return { isValid: true, status: 'valid' };
    }
    try {
      const response = await fetch(job.sourceUrl, { method: 'HEAD' });
      return { isValid: response.ok, status: response.ok ? 'valid' : 'expired' };
    } catch {
      return { isValid: true, status: 'valid' }; // CSV imports are always valid
    }
  }
}
