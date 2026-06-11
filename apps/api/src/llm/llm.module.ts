import { Module } from '@nestjs/common';
import { LlmService } from './llm.service.js';
import { ModelRouter } from './model-router.js';
import { CostTracker } from './cost-tracker.js';
import { RequestLogger } from './request-logger.js';
import { PromptRegistry } from './prompt-registry.js';
import { FineTuningService } from './fine-tuning/fine-tuning.service.js';
import { FineTuningController } from './fine-tuning/fine-tuning.controller.js';
import { LLM_SERVICE } from './llm.constants.js';

@Module({
  controllers: [FineTuningController],
  providers: [
    ModelRouter,
    CostTracker,
    RequestLogger,
    PromptRegistry,
    FineTuningService,
    { provide: LLM_SERVICE, useClass: LlmService },
  ],
  exports: [LLM_SERVICE, ModelRouter, CostTracker, PromptRegistry, FineTuningService],
})
export class LlmModule {}
