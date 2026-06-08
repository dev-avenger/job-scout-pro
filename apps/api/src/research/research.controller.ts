import { Controller, Get, Post, Param, UseGuards, Inject, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { RESEARCH_SERVICE } from './research.constants.js';
import type { IResearchService } from './interfaces/research-service.interface.js';

@Controller('api/v1/companies')
@UseGuards(JwtAuthGuard)
export class ResearchController {
  constructor(@Inject(RESEARCH_SERVICE) private readonly researchService: IResearchService) {}

  @Get(':id/research')
  async getResearch(@Param('id') id: string) {
    const company = await this.researchService.getCompanyResearch(id);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  @Post(':id/research')
  async triggerResearch(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const company = await this.researchService.getCompanyResearch(id);
    if (!company) throw new NotFoundException('Company not found');
    return this.researchService.triggerResearch(id, (company as any).name, user.sub);
  }
}
