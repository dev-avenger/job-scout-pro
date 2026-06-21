import { Controller, Get, UseGuards, Inject, Query } from '@nestjs/common';
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

  @Get('analytics/volume')
  async getVolume(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    const numDays = Math.min(Math.max(parseInt(days || '30', 10) || 30, 1), 365);
    return this.analyticsService.getVolume(user.sub, numDays);
  }

  @Get('analytics/response-rate')
  async getResponseRate(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    const numDays = Math.min(Math.max(parseInt(days || '30', 10) || 30, 1), 365);
    return this.analyticsService.getResponseRate(user.sub, numDays);
  }

  @Get('analytics/source-effectiveness')
  async getSourceEffectiveness(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getSourceEffectiveness(user.sub);
  }

  @Get('analytics/cost-trends')
  async getCostTrends(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    const numDays = Math.min(Math.max(parseInt(days || '30', 10) || 30, 1), 365);
    return this.analyticsService.getCostTrends(user.sub, numDays);
  }

  @Get('analytics/ab-results')
  async getAbResults(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getAbResults(user.sub);
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
