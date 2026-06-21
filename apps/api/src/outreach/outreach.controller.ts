import { Controller, Get, Post, Param, Body, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { OUTREACH_SERVICE } from './outreach.constants.js';
import type { IOutreachService } from './interfaces/outreach-service.interface.js';

const CreateContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  relationshipType: z.string().optional(),
});

const SuggestOutreachSchema = z.object({
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  candidateName: z.string().optional(),
  candidateSummary: z.string().optional(),
});

const CreateMessageSchema = z.object({
  applicationId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  type: z.string().default('outreach'),
  subject: z.string().min(1),
  body: z.string().min(1),
});

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(@Inject(OUTREACH_SERVICE) private readonly outreachService: IOutreachService) {}

  @Get('outreach')
  async listMessages(@CurrentUser() user: JwtPayload) {
    return this.outreachService.listMessages(user.sub);
  }

  @Post('outreach/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async approveAndSend(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.outreachService.approveAndSend(user.sub, id);
  }

  @Get('contacts')
  async listContacts(@CurrentUser() user: JwtPayload) {
    return this.outreachService.listContacts(user.sub);
  }

  @Post('contacts')
  async createContact(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateContactSchema)) body: any,
  ) {
    return this.outreachService.createContact(user.sub, body);
  }

  @Post('outreach/suggest')
  async suggestOutreach(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(SuggestOutreachSchema)) body: z.infer<typeof SuggestOutreachSchema>,
  ) {
    return this.outreachService.suggestOutreach(user.sub, body);
  }

  @Post('outreach')
  async createMessage(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateMessageSchema)) body: z.infer<typeof CreateMessageSchema>,
  ) {
    return this.outreachService.createMessage(user.sub, body);
  }
}
