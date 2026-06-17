import { Injectable, Inject } from '@nestjs/common';
import { llmRequests } from '@auto-job-apply/db';
import { generateId } from '@auto-job-apply/shared-utils';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { Database } from '@auto-job-apply/db';

export interface RequestLogEntry {
  userId: string;
  agentName: string;
  taskType: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  status?: string;
  errorMessage?: string;
  applicationId?: string;
  jobId?: string;
}

@Injectable()
export class RequestLogger {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async log(entry: RequestLogEntry): Promise<void> {
    await this.db.insert(llmRequests).values({
      id: generateId(),
      userId: entry.userId,
      agentName: entry.agentName,
      taskType: entry.taskType,
      model: entry.model,
      provider: entry.provider,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      // Stored as double precision — keep sub-cent costs (e.g. Gemini Flash).
      costCents: entry.costCents,
      latencyMs: entry.latencyMs,
      status: entry.status || 'success',
      errorMessage: entry.errorMessage,
      applicationId: entry.applicationId,
      jobId: entry.jobId,
    });
  }
}
