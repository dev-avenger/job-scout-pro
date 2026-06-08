import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';

@Injectable()
export class EmailClassifierAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'email_classify');
  }
}
