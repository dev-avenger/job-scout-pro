import { Injectable, Inject } from '@nestjs/common';
import { z } from 'zod';
import { BaseAgent } from '../../llm/agents/base-agent.js';
import { LLM_SERVICE } from '../../llm/llm.constants.js';
import type { ILLMService } from '../../llm/interfaces/llm-service.interface.js';
import type { AgentContext } from '@auto-job-apply/shared-types';

const FormFieldSchema = z.object({
  label: z.string(),
  selector: z.string(),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'radio', 'checkbox', 'file', 'date', 'number', 'url', 'hidden']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

const FormAnalysisSchema = z.object({
  fields: z.array(FormFieldSchema),
  submitSelector: z.string().optional(),
  formAction: z.string().optional(),
  pageType: z.enum(['single_page', 'multi_step', 'external_redirect']),
});

export type FormField = z.infer<typeof FormFieldSchema>;
export type FormAnalysis = z.infer<typeof FormAnalysisSchema>;

@Injectable()
export class DomAnalyzerAgent extends BaseAgent {
  constructor(@Inject(LLM_SERVICE) llmService: ILLMService) {
    super(llmService, 'dom_analysis');
  }

  async analyzePageStructure(
    html: string,
    url: string,
    context: AgentContext,
  ): Promise<{ analysis: FormAnalysis; costCents: number }> {
    const systemPrompt = this.llmService.promptRegistry.getSystem('dom_analysis');
    const truncatedHtml = html.length > 15000 ? html.slice(0, 15000) + '\n<!-- truncated -->' : html;

    const userPrompt = `## Page URL
${url}

## HTML Content
${truncatedHtml}

Analyze this job application page and identify all form fields. Return a JSON object with:
- fields: Array of form fields with label, CSS selector, type, required flag, and options if applicable
- submitSelector: CSS selector for the submit button
- formAction: The form's action URL if present
- pageType: Whether this is a single_page form, multi_step wizard, or external_redirect`;

    const result = await this.generateStructured(userPrompt, context, FormAnalysisSchema, systemPrompt);
    return { analysis: result.data, costCents: result.costCents };
  }
}
