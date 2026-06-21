export interface IAnalyticsService {
  getOverview(userId: string): Promise<unknown>;
  getFunnel(userId: string): Promise<unknown>;
  getVolume(userId: string, days: number): Promise<{ date: string; count: number }[]>;
  getLlmSpend(userId: string): Promise<unknown>;
  getLlmRequests(userId: string): Promise<unknown[]>;
  getAgentLogs(userId: string): Promise<unknown[]>;
  getResponseRate(userId: string, days: number): Promise<{ date: string; rate: number }[]>;
  getSourceEffectiveness(
    userId: string,
  ): Promise<{ source: string; applications: number; interviews: number; offers: number }[]>;
  getCostTrends(userId: string, days: number): Promise<{ date: string; costCents: number }[]>;
  getAbResults(
    userId: string,
  ): Promise<
    { variant: string; applications: number; interviews: number; offers: number; callbacks: number; callbackRate: number }[]
  >;
}
