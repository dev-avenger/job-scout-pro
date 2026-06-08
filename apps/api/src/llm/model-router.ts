import { Injectable } from '@nestjs/common';
import type { ModelTier, TaskType } from '@auto-job-apply/shared-types';
import type { ILLMProvider } from './interfaces/llm-provider.interface.js';

const TASK_TIER_MAP: Record<string, ModelTier> = {
  resume_tailor: 'premium',
  cover_letter: 'premium',
  form_fill: 'standard',
  dom_analysis: 'economy',
  email_classify: 'economy',
  scam_detect: 'standard',
  company_research: 'standard',
  interview_prep: 'premium',
};

@Injectable()
export class ModelRouter {
  private providers: ILLMProvider[] = [];

  registerProvider(provider: ILLMProvider): void {
    this.providers.push(provider);
  }

  resolveModel(taskType: TaskType, forceTier?: ModelTier): { provider: ILLMProvider; modelId: string } {
    const tier = forceTier || TASK_TIER_MAP[taskType] || 'standard';

    for (const provider of this.providers) {
      const model = provider.models.find((m) => m.tier === tier);
      if (model) {
        return { provider, modelId: model.id };
      }
    }

    // Fallback: use any available model
    for (const provider of this.providers) {
      if (provider.models.length > 0) {
        return { provider, modelId: provider.models[0].id };
      }
    }

    throw new Error(`No model available for task ${taskType} at tier ${tier}`);
  }

  getAvailableModels() {
    return this.providers.flatMap((p) => p.models);
  }
}
