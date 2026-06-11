import { Injectable, Inject } from '@nestjs/common';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../../core/database/database.constants.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'fine-tuning-service' });

export interface TrainingExample {
  id: string;
  userId: string;
  agentName: string;
  taskType: string;
  systemPrompt: string;
  userPrompt: string;
  assistantResponse: string;
  humanFeedback?: 'approved' | 'rejected' | 'edited';
  editedResponse?: string;
  createdAt: Date;
}

export interface FineTuningJob {
  id: string;
  userId: string;
  status: 'pending' | 'preparing' | 'training' | 'completed' | 'failed';
  provider: string;
  baseModel: string;
  fineTunedModelId?: string;
  trainingExampleCount: number;
  hyperparameters: {
    epochs?: number;
    learningRateMultiplier?: number;
    batchSize?: number;
  };
  metrics?: {
    trainingLoss?: number;
    validationLoss?: number;
  };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TrainingDataExport {
  format: 'openai_jsonl' | 'anthropic_jsonl';
  data: string;
  exampleCount: number;
}

@Injectable()
export class FineTuningService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
  ) {}

  // ---- Training Data Management ----

  async collectExample(example: Omit<TrainingExample, 'id' | 'createdAt'>): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    // Store in a training_examples table or JSON store
    logger.info({ id, agentName: example.agentName, taskType: example.taskType }, 'Training example collected');

    // In production, this would insert into a training_examples table
    // For now, store in user preferences as JSONB
    return { id };
  }

  async listExamples(userId: string, filters?: { agentName?: string; taskType?: string; feedback?: string }): Promise<TrainingExample[]> {
    logger.info({ userId, filters }, 'Listing training examples');
    // Would query training_examples table with filters
    return [];
  }

  async provideFeedback(exampleId: string, feedback: 'approved' | 'rejected' | 'edited', editedResponse?: string): Promise<void> {
    logger.info({ exampleId, feedback }, 'Training feedback recorded');
    // Would update the training_examples record
  }

  async deleteExample(exampleId: string): Promise<void> {
    logger.info({ exampleId }, 'Training example deleted');
  }

  // ---- Training Data Export ----

  async exportTrainingData(userId: string, format: 'openai_jsonl' | 'anthropic_jsonl'): Promise<TrainingDataExport> {
    const examples = await this.listExamples(userId, { feedback: 'approved' });

    let data: string;
    if (format === 'openai_jsonl') {
      data = examples.map(ex => JSON.stringify({
        messages: [
          { role: 'system', content: ex.systemPrompt },
          { role: 'user', content: ex.userPrompt },
          { role: 'assistant', content: ex.editedResponse || ex.assistantResponse },
        ],
      })).join('\n');
    } else {
      data = examples.map(ex => JSON.stringify({
        system: ex.systemPrompt,
        messages: [
          { role: 'user', content: ex.userPrompt },
          { role: 'assistant', content: ex.editedResponse || ex.assistantResponse },
        ],
      })).join('\n');
    }

    return { format, data, exampleCount: examples.length };
  }

  // ---- Fine-Tuning Job Management ----

  async createJob(userId: string, params: {
    provider: string;
    baseModel: string;
    epochs?: number;
    learningRateMultiplier?: number;
    batchSize?: number;
  }): Promise<FineTuningJob> {
    const examples = await this.listExamples(userId, { feedback: 'approved' });

    if (examples.length < 10) {
      throw new Error('At least 10 approved training examples required to start fine-tuning');
    }

    const job: FineTuningJob = {
      id: crypto.randomUUID(),
      userId,
      status: 'pending',
      provider: params.provider,
      baseModel: params.baseModel,
      trainingExampleCount: examples.length,
      hyperparameters: {
        epochs: params.epochs || 3,
        learningRateMultiplier: params.learningRateMultiplier || 1.8,
        batchSize: params.batchSize,
      },
      createdAt: new Date(),
    };

    logger.info({ jobId: job.id, provider: params.provider, model: params.baseModel, exampleCount: examples.length }, 'Fine-tuning job created');

    // In production: submit to OpenAI/Anthropic fine-tuning API
    // For now, just return the job record
    return job;
  }

  async getJob(jobId: string): Promise<FineTuningJob | null> {
    logger.info({ jobId }, 'Getting fine-tuning job');
    return null;
  }

  async listJobs(userId: string): Promise<FineTuningJob[]> {
    logger.info({ userId }, 'Listing fine-tuning jobs');
    return [];
  }

  async cancelJob(jobId: string): Promise<void> {
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
    return {
      totalExamples: 0,
      approvedExamples: 0,
      rejectedExamples: 0,
      pendingExamples: 0,
      totalJobs: 0,
      completedJobs: 0,
      activeModel: null,
    };
  }
}
