export interface INotificationsService {
  list(userId: string): Promise<unknown[]>;
  notify(
    userId: string,
    payload: { type: string; title: string; body?: string; priority?: 'low' | 'normal' | 'high' | 'urgent'; actionUrl?: string; metadata?: Record<string, unknown> },
  ): Promise<{ id: string }>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  listAlertRules(userId: string): Promise<unknown[]>;
  createAlertRule(userId: string, data: { conditionType: string; threshold?: number; channel: string; webhookUrl?: string }): Promise<{ id: string }>;
  deleteAlertRule(ruleId: string): Promise<void>;
  evaluateAlertRules(userId: string): Promise<number>;
  sendTestNotification(userId: string, channel: string, webhookUrl?: string): Promise<{ success: true }>;
  getUnreadCount?(userId: string): Promise<number>;
  delete?(notificationId: string): Promise<void>;
}
