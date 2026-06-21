import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '@auto-job-apply/db';
import { fineTuningData, fineTuningJobs } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { createLogger, generateId } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'fine-tuning-service' });

type Feedback = 'pending' | 'approved' | 'rejected' | 'edited';

export interface TrainingExample {
  id: string;
  userId: string;
  agentName: string;
  taskType: string;
  systemPrompt: string;
  userPrompt: string;
  assistantResponse: string;
  feedback: Feedback;
  editedResponse?: string;
  createdAt: Date;
}

export interface FineTuningJob {
  id: string;
  userId: string;
  status: string;
  provider: string;
  baseModel: string;
  resultModelId?: string | null;
  trainingExampleCount: number;
  metrics?: unknown;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
}

export interface TrainingDataExport {
  format: 'openai_jsonl' | 'anthropic_jsonl';
  data: string;
  exampleCount: number;
}

/**
 * Persisted training-data / fine-tuning store.
 *
 * Examples and jobs are stored in the `fine_tuning_data` / `fine_tuning_jobs`
 * tables. The actual submission of a job to a provider's fine-tuning API
 * (OpenAI/Anthropic) or a local LoRA run is intentionally left as a follow-up:
 * a created job is persisted in the `pending` state and surfaced in the UI, but
 * no external training call is made here. Everything up to and including JSONL
 * export is fully functional.
 */
@Injectable()
export class FineTuningService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  // ---- Training Data Management ----

  private rowToExample(row: any): TrainingExample {
    const ctx = (row.context ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      userId: row.userId,
      agentName: row.agentName,
      taskType: String(ctx.taskType ?? ''),
      systemPrompt: String(ctx.systemPrompt ?? ''),
      userPrompt: String(ctx.userPrompt ?? ''),
      assistantResponse: row.originalOutput,
      feedback: (ctx.feedback as Feedback) ?? 'pending',
      editedResponse: row.correctedOutput || undefined,
      createdAt: row.createdAt,
    };
  }

  async collectExample(example: {
    userId: string;
    agentName: string;
    taskType: string;
    systemPrompt: string;
    userPrompt: string;
    assistantResponse: string;
  }): Promise<{ id: string }> {
    const id = generateId();
    await this.db.insert(fineTuningData).values({
      id,
      userId: example.userId,
      agentName: example.agentName,
      originalOutput: example.assistantResponse,
      correctedOutput: '',
      context: {
        taskType: example.taskType,
        systemPrompt: example.systemPrompt,
        userPrompt: example.userPrompt,
        feedback: 'pending' as Feedback,
      },
    } as any);

    logger.info({ id, agentName: example.agentName, taskType: example.taskType }, 'Training example collected');
    return { id };
  }

  async listExamples(
    userId: string,
    filters?: { agentName?: string; taskType?: string; feedback?: string },
  ): Promise<TrainingExample[]> {
    const rows = (await this.db.query.fineTuningData.findMany({
      where: eq(fineTuningData.userId, userId),
      orderBy: [desc(fineTuningData.createdAt)],
    })) as any[];

    return rows.map((r) => this.rowToExample(r)).filter((ex) => {
      if (filters?.agentName && ex.agentName !== filters.agentName) return false;
      if (filters?.taskType && ex.taskType !== filters.taskType) return false;
      if (filters?.feedback && ex.feedback !== filters.feedback) return false;
      return true;
    });
  }

  async provideFeedback(
    exampleId: string,
    feedback: 'approved' | 'rejected' | 'edited',
    editedResponse?: string,
  ): Promise<void> {
    const existing = (await this.db
      .select()
      .from(fineTuningData)
      .where(eq(fineTuningData.id, exampleId))
      .limit(1)) as any[];
    const row = existing[0];
    if (!row) return;

    const ctx = { ...(row.context ?? {}), feedback };
    await this.db
      .update(fineTuningData)
      .set({
        context: ctx,
        ...(feedback === 'edited' && editedResponse ? { correctedOutput: editedResponse } : {}),
      } as any)
      .where(eq(fineTuningData.id, exampleId));

    logger.info({ exampleId, feedback }, 'Training feedback recorded');
  }

  async deleteExample(exampleId: string): Promise<void> {
    await this.db.delete(fineTuningData).where(eq(fineTuningData.id, exampleId));
    logger.info({ exampleId }, 'Training example deleted');
  }

  // ---- Training Data Export ----

  async exportTrainingData(
    userId: string,
    format: 'openai_jsonl' | 'anthropic_jsonl',
  ): Promise<TrainingDataExport> {
    const all = await this.listExamples(userId);
    // Approved (or human-edited) examples are the ground truth for training.
    const examples = all.filter((ex) => ex.feedback === 'approved' || ex.feedback === 'edited');

    let data: string;
    if (format === 'openai_jsonl') {
      data = examples
        .map((ex) =>
          JSON.stringify({
            messages: [
              { role: 'system', content: ex.systemPrompt },
              { role: 'user', content: ex.userPrompt },
              { role: 'assistant', content: ex.editedResponse || ex.assistantResponse },
            ],
          }),
        )
        .join('\n');
    } else {
      data = examples
        .map((ex) =>
          JSON.stringify({
            system: ex.systemPrompt,
            messages: [
              { role: 'user', content: ex.userPrompt },
              { role: 'assistant', content: ex.editedResponse || ex.assistantResponse },
            ],
          }),
        )
        .join('\n');
    }

    return { format, data, exampleCount: examples.length };
  }

  // ---- Fine-Tuning Job Management ----

  private rowToJob(row: any): FineTuningJob {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      provider: row.provider,
      baseModel: row.baseModel,
      resultModelId: row.resultModelId,
      trainingExampleCount: row.trainingDataCount ?? 0,
      metrics: row.validationMetrics,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
    };
  }

  async createJob(
    userId: string,
    params: { provider: string; baseModel: string; epochs?: number; learningRateMultiplier?: number; batchSize?: number },
  ): Promise<FineTuningJob> {
    const examples = await this.listExamples(userId);
    const approved = examples.filter((ex) => ex.feedback === 'approved' || ex.feedback === 'edited');

    if (approved.length < 10) {
      throw new Error('At least 10 approved training examples required to start fine-tuning');
    }

    const id = generateId();
    const row = {
      id,
      userId,
      provider: params.provider,
      baseModel: params.baseModel,
      status: 'pending',
      trainingDataCount: approved.length,
      validationMetrics: {
        hyperparameters: {
          epochs: params.epochs ?? 3,
          learningRateMultiplier: params.learningRateMultiplier ?? 1.8,
          batchSize: params.batchSize ?? null,
        },
      },
    };
    await this.db.insert(fineTuningJobs).values(row as any);

    logger.info(
      { jobId: id, provider: params.provider, model: params.baseModel, exampleCount: approved.length },
      'Fine-tuning job created (pending provider submission)',
    );

    return this.rowToJob({ ...row, createdAt: new Date(), startedAt: null, completedAt: null, resultModelId: null });
  }

  async getJob(jobId: string): Promise<FineTuningJob | null> {
    const rows = (await this.db
      .select()
      .from(fineTuningJobs)
      .where(eq(fineTuningJobs.id, jobId))
      .limit(1)) as any[];
    return rows[0] ? this.rowToJob(rows[0]) : null;
  }

  async listJobs(userId: string): Promise<FineTuningJob[]> {
    const rows = (await this.db.query.fineTuningJobs.findMany({
      where: eq(fineTuningJobs.userId, userId),
      orderBy: [desc(fineTuningJobs.createdAt)],
    })) as any[];
    return rows.map((r) => this.rowToJob(r));
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.db
      .update(fineTuningJobs)
      .set({ status: 'failed', completedAt: new Date() } as any)
      .where(eq(fineTuningJobs.id, jobId));
    logger.info({ jobId }, 'Fine-tuning job cancelled');
  }

  // ---- Stats ----

  async getStats(userId: string): Promise<{
    totalExamples: number;
    approvedExamples: number;
    rejectedExamples: number;
    pendingExamples: number;
    totalJobs: number;
    completedJobs: number;
    activeModel: string | null;
  }> {
    const examples = await this.listExamples(userId);
    const jobs = await this.listJobs(userId);
    const completed = jobs.filter((j) => j.status === 'completed');
    const activeModel = completed.find((j) => j.resultModelId)?.resultModelId ?? null;

    return {
      totalExamples: examples.length,
      approvedExamples: examples.filter((e) => e.feedback === 'approved' || e.feedback === 'edited').length,
      rejectedExamples: examples.filter((e) => e.feedback === 'rejected').length,
      pendingExamples: examples.filter((e) => e.feedback === 'pending').length,
      totalJobs: jobs.length,
      completedJobs: completed.length,
      activeModel,
    };
  }
}
