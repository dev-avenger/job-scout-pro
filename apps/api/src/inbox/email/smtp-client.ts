import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'smtp-client' });

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  fromAddress?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}

export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

@Injectable()
export class SmtpClient {
  async sendEmail(config: SmtpConfig, message: EmailMessage): Promise<SendResult> {
    const transporter: Transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    try {
      const info = await transporter.sendMail({
        from: config.fromAddress || config.auth.user,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
        inReplyTo: message.inReplyTo,
        references: message.references,
      });

      logger.info({ messageId: info.messageId, to: message.to }, 'Email sent via SMTP');

      return {
        messageId: info.messageId,
        accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
        rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
      };
    } catch (err) {
      logger.error({ error: err, to: message.to }, 'Failed to send email');
      throw err;
    }
  }

  async testConnection(config: SmtpConfig): Promise<boolean> {
    const transporter: Transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    try {
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
