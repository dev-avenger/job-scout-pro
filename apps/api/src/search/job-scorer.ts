import { Injectable, Inject } from '@nestjs/common';
import { LLM_SERVICE } from '../llm/llm.constants.js';
import type { ILLMService } from '../llm/interfaces/llm-service.interface.js';

@Injectable()
export class JobScorer {
  constructor(@Inject(LLM_SERVICE) private readonly llmService: ILLMService) {}

  async score(job: Record<string, unknown>, userPreferences: Record<string, unknown>): Promise<number> {
    return 0.5;
  }
}
