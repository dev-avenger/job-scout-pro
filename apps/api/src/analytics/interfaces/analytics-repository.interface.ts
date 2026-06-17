export interface IAnalyticsRepository {
  getOverview(userId: string): Promise<{ totalJobs: number; totalApplications: number; pendingApplications: number; interviews: number; offers: number }>;
  getFunnel(userId: string): Promise<Record<string, number>>;
  getVolume(userId: string, days: number): Promise<{ date: string; count: number }[]>;
  getDailySpend(userId: string): Promise<number>;
  getMonthlySpend(userId: string): Promise<number>;
  getTotalSpend(userId: string): Promise<number>;
  getRecentLlmRequests(userId: string, limit?: number): Promise<unknown[]>;
  getRecentAgentLogs(userId: string, limit?: number): Promise<unknown[]>;
  getResponseRate(userId: string, days: number): Promise<{ date: string; rate: number }[]>;
  getSourceEffectiveness(
    userId: string,
  ): Promise<{ source: string; applications: number; interviews: number; offers: number }[]>;
  getCostTrends(userId: string, days: number): Promise<{ date: string; costCents: number }[]>;
}
