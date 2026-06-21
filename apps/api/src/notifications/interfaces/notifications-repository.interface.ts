export interface INotificationsRepository {
  list(userId: string, limit?: number): Promise<unknown[]>;
  create(data: Record<string, unknown>): Promise<void>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  listAlertRules(userId: string): Promise<unknown[]>;
  listActiveAlertRules(userId: string): Promise<unknown[]>;
  createAlertRule(data: Record<string, unknown>): Promise<void>;
  deleteAlertRule(ruleId: string): Promise<void>;
  markRuleTriggered(ruleId: string): Promise<void>;
  getFailureRate(userId: string, hours?: number): Promise<number>;
  getTodaySpendCents(userId: string): Promise<number>;
  getDispatchInfo(userId: string): Promise<{ email: string | null; smtpConfig: any | null }>;
  getNotificationChannels(userId: string): Promise<Record<string, any> | null>;
}
