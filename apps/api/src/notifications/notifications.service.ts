import { Injectable, Inject } from '@nestjs/common';
import { generateId, createLogger } from '@auto-job-apply/shared-utils';
import { NOTIFICATIONS_REPOSITORY } from './notifications.constants.js';
import { SmtpClient } from '../inbox/email/smtp-client.js';
import type { INotificationsRepository } from './interfaces/notifications-repository.interface.js';
import type { INotificationsService } from './interfaces/notifications-service.interface.js';

const logger = createLogger({ name: 'notifications-service' });

export interface NotifyPayload {
  type: string;
  title: string;
  body?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService implements INotificationsService {
  private readonly smtp = new SmtpClient();

  constructor(@Inject(NOTIFICATIONS_REPOSITORY) private readonly repo: INotificationsRepository) {}

  async list(userId: string) {
    return this.repo.list(userId);
  }

  /** Create an in-app notification. Used by other modules as the single entry point. */
  async notify(userId: string, payload: NotifyPayload): Promise<{ id: string }> {
    const id = generateId();
    await this.repo.create({
      id,
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      priority: payload.priority ?? 'normal',
      actionUrl: payload.actionUrl ?? null,
      metadata: payload.metadata ?? null,
    });
    return { id };
  }

  async markAsRead(notificationId: string) {
    await this.repo.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string) {
    await this.repo.markAllAsRead(userId);
  }

  async listAlertRules(userId: string) {
    return this.repo.listAlertRules(userId);
  }

  async createAlertRule(userId: string, data: { conditionType: string; threshold?: number; channel: string; webhookUrl?: string }) {
    const id = generateId();
    await this.repo.createAlertRule({ id, userId, ...data });
    return { id };
  }

  async deleteAlertRule(ruleId: string) {
    await this.repo.deleteAlertRule(ruleId);
  }

  /**
   * Evaluate a user's active alert rules against current metrics. For each
   * breached rule, create an in-app notification and dispatch to the rule's
   * channel (webhook / email), then stamp lastTriggeredAt to debounce.
   * Returns the number of rules that fired.
   */
  async evaluateAlertRules(userId: string): Promise<number> {
    const rules = (await this.repo.listActiveAlertRules(userId)) as any[];
    if (rules.length === 0) return 0;

    let fired = 0;
    for (const rule of rules) {
      // Debounce: don't re-fire within 6h.
      if (rule.lastTriggeredAt && Date.now() - new Date(rule.lastTriggeredAt).getTime() < 6 * 60 * 60 * 1000) {
        continue;
      }

      const breach = await this.checkCondition(userId, rule);
      if (!breach) continue;

      fired++;
      await this.notify(userId, {
        type: 'alert',
        title: breach.title,
        body: breach.body,
        priority: 'high',
        metadata: { ruleId: rule.id, conditionType: rule.conditionType },
      });
      await this.dispatch(userId, rule, breach);
      await this.repo.markRuleTriggered(rule.id);
    }
    return fired;
  }

  private async checkCondition(
    userId: string,
    rule: any,
  ): Promise<{ title: string; body: string } | null> {
    switch (rule.conditionType) {
      case 'failure_rate': {
        const rate = await this.repo.getFailureRate(userId, 24);
        const threshold = (rule.threshold ?? 0.2); // fraction, default 20%
        if (rate >= threshold) {
          return {
            title: 'High application failure rate',
            body: `${Math.round(rate * 100)}% of applications failed in the last 24h (threshold ${Math.round(threshold * 100)}%).`,
          };
        }
        return null;
      }
      case 'budget_threshold': {
        const spent = await this.repo.getTodaySpendCents(userId);
        const threshold = rule.threshold ?? 0; // cents
        if (threshold > 0 && spent >= threshold) {
          return {
            title: 'LLM budget threshold reached',
            body: `Today's LLM spend is ${(spent / 100).toFixed(2)} (threshold ${(threshold / 100).toFixed(2)}).`,
          };
        }
        return null;
      }
      // portal_down / ban_detected require signals not yet tracked; skip for now.
      default:
        return null;
    }
  }

  private async dispatch(userId: string, rule: any, breach: { title: string; body: string }): Promise<void> {
    try {
      await this.sendToChannel(userId, rule.channel, rule.webhookUrl, breach.title, breach.body, {
        conditionType: rule.conditionType,
      });
      logger.info({ ruleId: rule.id, channel: rule.channel }, 'Alert dispatched');
    } catch (err) {
      logger.error({ error: err, ruleId: rule.id, channel: rule.channel }, 'Alert dispatch failed');
    }
  }

  /**
   * Deliver a message to a single notification channel. Slack uses an incoming
   * webhook URL; Telegram uses a bot token + chat id stored in the user's
   * `notificationChannels` config; both are user-supplied at runtime — no
   * build-time credentials. Throws on misconfiguration so callers (e.g. the
   * test endpoint) can surface the reason.
   */
  private async sendToChannel(
    userId: string,
    channel: string,
    webhookUrl: string | null | undefined,
    title: string,
    body: string,
    extra?: { conditionType?: string },
  ): Promise<void> {
    switch (channel) {
      case 'webhook': {
        if (!webhookUrl) throw new Error('No webhook URL configured');
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'alert',
            conditionType: extra?.conditionType,
            title,
            body,
            firedAt: new Date().toISOString(),
          }),
        });
        return;
      }
      case 'slack': {
        const url = webhookUrl ?? (await this.repo.getNotificationChannels(userId))?.slackWebhookUrl;
        if (!url) throw new Error('No Slack incoming-webhook URL configured');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `*${title}*\n${body}` }),
        });
        if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`);
        return;
      }
      case 'telegram': {
        const tg = (await this.repo.getNotificationChannels(userId))?.telegram as
          | { botToken?: string; chatId?: string }
          | undefined;
        if (!tg?.botToken || !tg?.chatId) {
          throw new Error('Telegram bot token / chat id not configured');
        }
        const res = await fetch(`https://api.telegram.org/bot${tg.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tg.chatId, text: `*${title}*\n${body}`, parse_mode: 'Markdown' }),
        });
        if (!res.ok) throw new Error(`Telegram API returned ${res.status}`);
        return;
      }
      case 'email': {
        const { email, smtpConfig } = await this.repo.getDispatchInfo(userId);
        if (!email || !smtpConfig) throw new Error('No email recipient / SMTP config');
        await this.smtp.sendEmail(smtpConfig, {
          to: email,
          subject: `[Job Agent] ${title}`,
          text: body,
          html: `<p>${body}</p>`,
        });
        return;
      }
      case 'in_app':
        return; // the in-app notification row is the delivery; nothing else to do.
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /** Send a sample message to a channel so the user can verify their config. */
  async sendTestNotification(
    userId: string,
    channel: string,
    webhookUrl?: string,
  ): Promise<{ success: true }> {
    await this.sendToChannel(
      userId,
      channel,
      webhookUrl,
      'Test notification',
      'This is a test from your job agent — this channel is configured correctly.',
    );
    return { success: true };
  }
}
