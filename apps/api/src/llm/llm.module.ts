import { Module } from '@nestjs/common';
import { LlmService } from './llm.service.js';
import { ModelRouter } from './model-router.js';
import { CostTracker } from './cost-tracker.js';
import { RequestLogger } from './request-logger.js';
import { PromptRegistry } from './prompt-registry.js';
import { LLM_SERVICE } from './llm.constants.js';

@Module({
  providers: [
    ModelRouter,
    CostTracker,
    RequestLogger,
    PromptRegistry,
    { provide: LLM_SERVICE, useClass: LlmService },
  ],
  exports: [LLM_SERVICE, ModelRouter, CostTracker, PromptRegistry],
})
export class LlmModule {}
