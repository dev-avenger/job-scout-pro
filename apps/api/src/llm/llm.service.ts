import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ZodSchema } from 'zod';
import type { Redis } from 'ioredis';
import type { AgentContext, ModelTier, TaskType } from '@auto-job-apply/shared-types';
import { createLogger } from '@auto-job-apply/shared-utils';
import { userPreferences } from '@auto-job-apply/db';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';
import { EVENT_BUS } from '../core/event-bus/event-bus.constants.js';
import type { IEventBus } from '../core/event-bus/interfaces/event-bus.interface.js';
import type { ILLMService } from './interfaces/llm-service.interface.js';
import type { LLMGenerateParams, LLMResponse, LLMStructuredResponse } from './interfaces/llm-provider.interface.js';
import { ModelRouter } from './model-router.js';
import { CostTracker } from './cost-tracker.js';
import { PromptRegistry } from './prompt-registry.js';
import { RequestLogger } from './request-logger.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';

const logger = createLogger({ name: 'llm-service' });

@Injectable()
export class LlmService implements ILLMService, OnModuleInit {
  readonly promptRegistry: PromptRegistry;

  constructor(
    private readonly modelRouter: ModelRouter,
    private readonly costTracker: CostTracker,
    private readonly requestLogger: RequestLogger,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
  ) {
    this.promptRegistry = new PromptRegistry();
  }

  async onModuleInit() {
    // Register providers based on available API keys
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiModel = this.configService.get<string>('GEMINI_MODEL');
    const ollamaUrl = this.configService.get<string>('OLLAMA_BASE_URL');

    if (openaiKey) {
      this.modelRouter.registerProvider(new OpenAIProvider(openaiKey));
    }
    if (anthropicKey) {
      this.modelRouter.registerProvider(new AnthropicProvider(anthropicKey));
    }
    if (geminiKey) {
      this.modelRouter.registerProvider(new GeminiProvider(geminiKey, geminiModel));
    }
    this.modelRouter.registerProvider(new OllamaProvider(ollamaUrl));

    await this.registerSavedProviders();

    this.registerDefaultPrompts();
    logger.info('LLM service initialized');
  }

  /** Restore providers users configured through the Settings page. */
  private async registerSavedProviders() {
    try {
      const rows = await this.db.select().from(userPreferences);
      for (const row of rows) {
        const ui = (row as { uiSettings?: Record<string, unknown> | null }).uiSettings;
        if (!ui) continue;
        const provider = ui.llmProvider as string | undefined;
        const apiKey = ui.llmApiKey as string | undefined;
        const model = ui.llmModel as string | undefined;
        const baseUrl = ui.ollamaUrl as string | undefined;

        switch (provider) {
          case 'openai':
            if (apiKey) this.modelRouter.registerProvider(new OpenAIProvider(apiKey));
            break;
          case 'anthropic':
            if (apiKey) this.modelRouter.registerProvider(new AnthropicProvider(apiKey));
            break;
          case 'gemini':
            if (apiKey) this.modelRouter.registerProvider(new GeminiProvider(apiKey, model));
            break;
          case 'ollama':
            this.modelRouter.registerProvider(new OllamaProvider(baseUrl));
            break;
          default:
            continue;
        }
        this.modelRouter.preferProvider(provider!);
        logger.info({ provider, model }, 'Registered user-configured LLM provider');
      }
    } catch (err) {
      logger.warn({ error: err }, 'Could not load saved LLM provider settings');
    }
  }

  async generateText(
    taskType: TaskType,
    params: Omit<LLMGenerateParams, 'model'>,
    context: AgentContext,
    forceTier?: ModelTier,
  ): Promise<LLMResponse & { model: string; provider: string; costCents: number }> {
    const { provider, modelId } = this.modelRouter.resolveModel(taskType, forceTier);

    try {
      const response = await provider.generateText({ ...params, model: modelId });
      const costCents = provider.estimateCost(modelId, response.usage.inputTokens, response.usage.outputTokens);

      await Promise.all([
        this.costTracker.recordCost(context.userId, costCents),
        this.requestLogger.log({
          userId: context.userId,
          agentName: taskType,
          taskType,
          model: modelId,
          provider: provider.name,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          costCents,
          latencyMs: response.latencyMs,
          applicationId: context.applicationId,
          jobId: context.jobId,
        }),
      ]);

      return { ...response, model: modelId, provider: provider.name, costCents };
    } catch (err) {
      logger.error({ error: err, taskType, model: modelId }, 'LLM request failed');

      await this.requestLogger.log({
        userId: context.userId,
        agentName: taskType,
        taskType,
        model: modelId,
        provider: provider.name,
        inputTokens: 0,
        outputTokens: 0,
        costCents: 0,
        latencyMs: 0,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        applicationId: context.applicationId,
        jobId: context.jobId,
      });

      throw err;
    }
  }

  async generateStructured<T>(
    taskType: TaskType,
    params: Omit<LLMGenerateParams, 'model'> & { schema: ZodSchema<T> },
    context: AgentContext,
    forceTier?: ModelTier,
  ): Promise<LLMStructuredResponse<T> & { model: string; provider: string; costCents: number }> {
    const { provider, modelId } = this.modelRouter.resolveModel(taskType, forceTier);

    try {
      const response = await provider.generateStructured({ ...params, model: modelId });
      const costCents = provider.estimateCost(modelId, response.usage.inputTokens, response.usage.outputTokens);

      await Promise.all([
        this.costTracker.recordCost(context.userId, costCents),
        this.requestLogger.log({
          userId: context.userId,
          agentName: taskType,
          taskType,
          model: modelId,
          provider: provider.name,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          costCents,
          latencyMs: response.latencyMs,
          applicationId: context.applicationId,
          jobId: context.jobId,
        }),
      ]);

      return { ...response, model: modelId, provider: provider.name, costCents };
    } catch (err) {
      logger.error(
        { err, message: err instanceof Error ? err.message : String(err), taskType, model: modelId },
        'LLM structured request failed',
      );
      throw err;
    }
  }

  async getEmbedding(text: string, context: AgentContext): Promise<number[]> {
    const { provider } = this.modelRouter.resolveModel('dom_analysis', 'economy');
    try {
      return await provider.getEmbedding(text);
    } catch {
      const ollama = new OllamaProvider();
      return ollama.getEmbedding(text);
    }
  }

  async getBudgetStatus(userId: string, dailyCapCents: number, monthlyCapCents: number) {
    return this.costTracker.getBudgetStatus(userId, dailyCapCents, monthlyCapCents);
  }

  getAvailableModels() {
    return this.modelRouter.getAvailableModels();
  }

  private registerDefaultPrompts(): void {
    this.promptRegistry.register('resume_tailor', {
      version: 'v1',
      system: `You are an expert resume writer and career coach. Your task is to tailor a resume for a specific job posting.

Given the candidate's profile and the job description, rewrite the resume to:
1. Highlight relevant experience and skills that match the job requirements
2. Use keywords from the job description naturally
3. Quantify achievements where possible
4. Maintain honesty - never fabricate experience
5. Optimize for ATS (Applicant Tracking Systems)
6. Keep it concise (1-2 pages worth of content)`,
      variables: [],
    });

    this.promptRegistry.register('cover_letter', {
      version: 'v1',
      system: `You are an expert cover letter writer. Generate a personalized, compelling cover letter.

Guidelines:
1. Address the hiring manager by name if available
2. Open with a hook that shows genuine interest in the company
3. Connect 2-3 specific experiences to the job requirements
4. Show knowledge of the company's mission/products
5. Keep it under 400 words
6. Close with enthusiasm and a call to action
7. Sound human and authentic, not generic`,
      variables: [],
    });

    this.promptRegistry.register('form_fill', {
      version: 'v1',
      system: `You are an assistant that maps job application form fields to saved answers from a candidate's profile.

Given a form field (label, type, options) and the candidate's saved information, determine the best answer.
If no exact match exists, generate an appropriate answer based on available profile data.
Return the answer as a simple string value.`,
      variables: [],
    });

    this.promptRegistry.register('dom_analysis', {
      version: 'v1',
      system: `You are a web form analysis expert. Given HTML content of a job application page, identify all form fields.

For each field, extract:
- label: The visible label text
- selector: A CSS selector that uniquely identifies the field
- type: The input type (text, email, tel, textarea, select, radio, checkbox, file, date)
- required: Whether the field is required
- options: For select/radio fields, the available options

Return a structured JSON array of fields.`,
      variables: [],
    });

    this.promptRegistry.register('email_classify', {
      version: 'v1',
      system: `You are an email classifier for a job search tool. Classify incoming emails into one of these categories:
- interview: Contains interview invitation or scheduling
- rejection: Contains application rejection
- acknowledgement: Confirms receipt of application
- recruiter: Outreach from a recruiter
- spam: Irrelevant or spam
- unknown: Cannot determine

Return the classification and a confidence score (0-1).`,
      variables: [],
    });

    this.promptRegistry.register('scam_detect', {
      version: 'v1',
      system: `You are a job posting legitimacy analyzer. Evaluate whether a job posting is legitimate or potentially a scam.

Red flags to check:
1. Unrealistic salary for the role/location
2. Vague job description with no specific requirements
3. Request for personal info upfront (SSN, bank details)
4. No company website or fake-looking website
5. Free email address used for business
6. Pressure to act immediately
7. Fee required to apply or start
8. Too-good-to-be-true benefits

Return a scam score (0-1) where 1 = definitely a scam, and a list of red flags found.`,
      variables: [],
    });

    this.promptRegistry.register('company_research', {
      version: 'v1',
      system: `You are a company research analyst. Given a company name and available data, generate a comprehensive research brief covering:

1. Company overview (industry, size, founded)
2. Financial health indicators
3. Culture and work-life balance
4. Technology stack
5. Recent news and developments
6. Employee reviews summary
7. Growth trajectory
8. Potential interview topics

Be factual and cite sources when possible.`,
      variables: [],
    });

    this.promptRegistry.register('interview_prep', {
      version: 'v1',
      system: `You are an interview preparation coach. Given a job description, company research, and candidate profile, generate:

1. Likely technical questions (with suggested answers)
2. Behavioral questions (with STAR-method answer frameworks)
3. Questions the candidate should ask the interviewer
4. Key talking points to emphasize
5. Potential concerns to address proactively

Tailor everything to the specific role and company.`,
      variables: [],
    });
  }
}
