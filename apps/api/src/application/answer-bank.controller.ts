import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { AnswerBank } from './answer-bank.js';

@Controller('api/v1/answers')
@UseGuards(JwtAuthGuard)
export class AnswerBankController {
  constructor(private readonly answerBank: AnswerBank) {}

  @Get()
  async listAll(@CurrentUser() user: JwtPayload) {
    return this.answerBank.listAll(user.sub);
  }

  @Post()
  async save(
    @CurrentUser() user: JwtPayload,
    @Body() body: { fieldLabel: string; answerText: string; fieldType?: string },
  ) {
    const id = await this.answerBank.save(user.sub, body.fieldLabel, body.answerText, body.fieldType, 'profile');
    return { id };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.answerBank.delete(id);
    return { deleted: true };
  }
}
