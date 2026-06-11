import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { BUILTIN_TEMPLATES, TemplateConfigSchema } from '@auto-job-apply/shared-types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { TemplatesRepository } from './templates.repository.js';

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  region: z.string().max(30).default('general'),
  description: z.string().max(500).optional(),
  config: TemplateConfigSchema,
  previewImageUrl: z.string().max(500).optional(),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial();

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'template'
  );
}

@Controller('api/v1/templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly repo: TemplatesRepository) {}

  /** Built-in templates (code-defined) + user templates (DB) */
  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const userTemplates = await this.repo.list(user.sub);
    return [
      ...BUILTIN_TEMPLATES.map((t, i) => ({
        ...t,
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        userId: null,
      })),
      ...userTemplates,
    ];
  }

  @Get(':id')
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const template = await this.repo.get(user.sub, id);
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateTemplateSchema)) body: z.infer<typeof CreateTemplateSchema>,
  ) {
    return this.repo.create(user.sub, {
      slug: slugify(body.name),
      name: body.name,
      region: body.region ?? 'general',
      description: body.description,
      config: body.config as Record<string, unknown>,
      previewImageUrl: body.previewImageUrl,
    });
  }

  @Put(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTemplateSchema)) body: z.infer<typeof UpdateTemplateSchema>,
  ) {
    const existing = await this.repo.get(user.sub, id);
    if (!existing) throw new NotFoundException('Template not found');
    if (existing.isBuiltIn || !existing.userId) {
      throw new BadRequestException('Built-in templates are read-only');
    }
    await this.repo.update(user.sub, id, {
      ...body,
      config: body.config as Record<string, unknown> | undefined,
    });
    return { id };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const existing = await this.repo.get(user.sub, id);
    if (!existing) throw new NotFoundException('Template not found');
    if (existing.isBuiltIn || !existing.userId) {
      throw new BadRequestException('Built-in templates are read-only');
    }
    await this.repo.delete(user.sub, id);
  }
}
