import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ANALYTICS_SERVICE } from './analytics.constants.js';
import type { IAnalyticsService } from './interfaces/analytics-service.interface.js';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(@Inject(ANALYTICS_SERVICE) private readonly analyticsService: IAnalyticsService) {}

  @Get('analytics/overview')
  async getOverview(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getOverview(user.sub);
  }

  @Get('analytics/funnel')
  async getFunnel(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getFunnel(user.sub);
  }

  @Get('monitoring/llm/spend')
  async getLlmSpend(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getLlmSpend(user.sub);
  }

  @Get('monitoring/llm/requests')
  async getLlmRequests(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getLlmRequests(user.sub);
  }

  @Get('monitoring/agent-log')
  async getAgentLogs(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getAgentLogs(user.sub);
  }
}
