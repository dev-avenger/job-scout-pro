import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const EmailClassificationSchema = z.object({
  classification: z.enum(['interview', 'rejection', 'acknowledgement', 'recruiter', 'spam', 'unknown']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  extractedDate: z.string().optional(),
  extractedCompany: z.string().optional(),
  extractedRole: z.string().optional(),
  actionRequired: z.boolean(),
});

export type EmailClassificationResult = z.infer<typeof EmailClassificationSchema>;

@Injectable()
export class EmailClassifierAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'email_classify');
  }

  async classifyEmail(
    subject: string,
    body: string,
    from: string,
    context: AgentContext,
  ): Promise<{ classification: EmailClassificationResult; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('email_classify');
    const truncatedBody = body.length > 3000 ? body.slice(0, 3000) + '\n[truncated]' : body;

    const userPrompt = `## Email Details
From: ${from}
Subject: ${subject}

## Body
${truncatedBody}

Classify this email and return a JSON object with:
- classification: one of interview, rejection, acknowledgement, recruiter, spam, unknown
- confidence: 0-1 confidence score
- reasoning: brief explanation of the classification
- extractedDate: any interview/meeting date found (ISO format)
- extractedCompany: company name if identified
- extractedRole: role/position if identified  
- actionRequired: whether the user needs to take action`;

    const result = await this.generateStructured(
      userPrompt,
      context,
      EmailClassificationSchema,
      systemPrompt,
      'economy',
    );
    return { classification: result.data, costCents: result.costCents };
  }
}
