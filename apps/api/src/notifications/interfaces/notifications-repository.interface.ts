export interface INotificationsRepository {
  list(userId: string, limit?: number): Promise<unknown[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  listAlertRules(userId: string): Promise<unknown[]>;
  createAlertRule(data: Record<string, unknown>): Promise<void>;
  deleteAlertRule(ruleId: string): Promise<void>;
}
