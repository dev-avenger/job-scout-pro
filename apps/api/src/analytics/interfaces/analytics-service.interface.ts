export interface IAnalyticsService {
  getOverview(userId: string): Promise<unknown>;
  getFunnel(userId: string): Promise<unknown>;
  getLlmSpend(userId: string): Promise<unknown>;
  getLlmRequests(userId: string): Promise<unknown[]>;
  getAgentLogs(userId: string): Promise<unknown[]>;
}
