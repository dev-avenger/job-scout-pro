import { Injectable, Inject } from '@nestjs/common';
import { ANALYTICS_REPOSITORY } from './analytics.constants.js';
import type { IAnalyticsRepository } from './interfaces/analytics-repository.interface.js';
import type { IAnalyticsService } from './interfaces/analytics-service.interface.js';

@Injectable()
export class AnalyticsService implements IAnalyticsService {
  constructor(@Inject(ANALYTICS_REPOSITORY) private readonly repo: IAnalyticsRepository) {}

  async getOverview(userId: string) {
    return this.repo.getOverview(userId);
  }

  async getFunnel(userId: string) {
    return this.repo.getFunnel(userId);
  }

  async getVolume(userId: string, days: number) {
    return this.repo.getVolume(userId, days);
  }

  async getLlmSpend(userId: string) {
    const [dailySpendCents, monthlySpendCents, totalSpendCents] = await Promise.all([
      this.repo.getDailySpend(userId),
      this.repo.getMonthlySpend(userId),
      this.repo.getTotalSpend(userId),
    ]);

    return { dailySpendCents, monthlySpendCents, totalSpendCents };
  }

  async getLlmRequests(userId: string) {
    return this.repo.getRecentLlmRequests(userId);
  }

  async getAgentLogs(userId: string) {
    return this.repo.getRecentAgentLogs(userId);
  }

  async getResponseRate(userId: string, days: number) {
    return this.repo.getResponseRate(userId, days);
  }

  async getSourceEffectiveness(userId: string) {
    return this.repo.getSourceEffectiveness(userId);
  }

  async getCostTrends(userId: string, days: number) {
    return this.repo.getCostTrends(userId, days);
  }

  async getAbResults(userId: string) {
    return this.repo.getAbResults(userId);
  }
}
