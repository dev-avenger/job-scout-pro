import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Inject, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { FineTuningService } from './fine-tuning.service.js';
import type { Response } from 'express';

const CollectExampleSchema = z.object({
  agentName: z.string(),
  taskType: z.string(),
  systemPrompt: z.string(),
  userPrompt: z.string(),
  assistantResponse: z.string(),
});

const ProvideFeedbackSchema = z.object({
  feedback: z.enum(['approved', 'rejected', 'edited']),
  editedResponse: z.string().optional(),
});

const CreateJobSchema = z.object({
  provider: z.string(),
  baseModel: z.string(),
  epochs: z.number().int().min(1).max(10).optional(),
  learningRateMultiplier: z.number().min(0.1).max(5).optional(),
  batchSize: z.number().int().min(1).max(256).optional(),
});

@Controller('api/v1/fine-tuning')
@UseGuards(JwtAuthGuard)
export class FineTuningController {
  constructor(private readonly fineTuningService: FineTuningService) {}

  // ---- Training Examples ----

  @Get('examples')
  async listExamples(
    @CurrentUser() user: JwtPayload,
    @Query('agentName') agentName?: string,
    @Query('taskType') taskType?: string,
    @Query('feedback') feedback?: string,
  ) {
    return this.fineTuningService.listExamples(user.sub, { agentName, taskType, feedback });
  }

  @Post('examples')
  async collectExample(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CollectExampleSchema)) body: z.infer<typeof CollectExampleSchema>,
  ) {
    return this.fineTuningService.collectExample({
      userId: user.sub,
      ...body,
    });
  }

  @Put('examples/:id/feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  async provideFeedback(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProvideFeedbackSchema)) body: z.infer<typeof ProvideFeedbackSchema>,
  ) {
    await this.fineTuningService.provideFeedback(id, body.feedback, body.editedResponse);
  }

  @Delete('examples/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExample(@Param('id') id: string) {
    await this.fineTuningService.deleteExample(id);
  }

  // ---- Export ----

  @Get('export')
  async exportData(
    @CurrentUser() user: JwtPayload,
    @Query('format') format: string = 'openai_jsonl',
    @Res() res: Response,
  ) {
    const validFormat = format === 'anthropic_jsonl' ? 'anthropic_jsonl' : 'openai_jsonl';
    const result = await this.fineTuningService.exportTrainingData(user.sub, validFormat);

    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="training-data-${validFormat}.jsonl"`);
    res.send(result.data);
  }

  // ---- Fine-Tuning Jobs ----

  @Get('jobs')
  async listJobs(@CurrentUser() user: JwtPayload) {
    return this.fineTuningService.listJobs(user.sub);
  }

  @Post('jobs')
  async createJob(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateJobSchema)) body: z.infer<typeof CreateJobSchema>,
  ) {
    return this.fineTuningService.createJob(user.sub, body);
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    const job = await this.fineTuningService.getJob(id);
    if (!job) throw new Error('Job not found');
    return job;
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJob(@Param('id') id: string) {
    await this.fineTuningService.cancelJob(id);
  }

  // ---- Stats ----

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.fineTuningService.getStats(user.sub);
  }
}
