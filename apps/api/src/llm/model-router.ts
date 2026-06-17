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
    // Re-registering a provider (e.g. after the user saves a new API key)
    // replaces the old instance instead of duplicating it.
    const idx = this.providers.findIndex((p) => p.name === provider.name);
    if (idx >= 0) {
      this.providers[idx] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  /** Move the named provider to the front so it wins tier resolution. */
  preferProvider(name: string): void {
    const idx = this.providers.findIndex((p) => p.name === name);
    if (idx > 0) {
      const [provider] = this.providers.splice(idx, 1);
      this.providers.unshift(provider!);
    }
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
      const first = provider.models[0];
      if (first) {
        return { provider, modelId: first.id };
      }
    }

    throw new Error(`No model available for task ${taskType} at tier ${tier}`);
  }

  getAvailableModels() {
    return this.providers.flatMap((p) => p.models);
  }
}
