export interface INotificationsService {
  list(userId: string): Promise<unknown[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  listAlertRules(userId: string): Promise<unknown[]>;
  createAlertRule(userId: string, data: { conditionType: string; threshold?: number; channel: string; webhookUrl?: string }): Promise<{ id: string }>;
  deleteAlertRule(ruleId: string): Promise<void>;
  getUnreadCount?(userId: string): Promise<number>;
  delete?(notificationId: string): Promise<void>;
}
