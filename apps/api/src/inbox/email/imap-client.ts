import { Injectable, Inject, Optional } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'imap-client' });

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
}

export interface FetchedEmail {
  uid: number;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  textBody: string;
  htmlBody: string;
  headers: Record<string, string>;
  attachments: Array<{ filename: string; contentType: string; size: number }>;
}

@Injectable()
export class ImapClient {
  async fetchNewEmails(config: ImapConfig, sinceDate: Date): Promise<FetchedEmail[]> {
    // Connect using ImapFlow
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      logger: false,
    });
    // ImapFlow can emit late async socket errors (e.g. ETIMEOUT) after the
    // awaited call already rejected; without a listener they crash the process.
    client.on('error', (err) => logger.warn({ error: err }, 'IMAP socket error'));

    const emails: FetchedEmail[] = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Search for emails since the given date
        const messages = client.fetch(
          { since: sinceDate },
          { source: true, envelope: true, uid: true },
        );

        for await (const msg of messages) {
          try {
            const envelope = msg.envelope;
            // Parse source buffer into parts using the EmailParser (called separately)
            emails.push({
              uid: msg.uid,
              messageId: envelope?.messageId || '',
              from: envelope?.from?.[0]?.address || '',
              to: envelope?.to?.[0]?.address || '',
              subject: envelope?.subject || '',
              date: envelope?.date || new Date(),
              textBody: msg.source?.toString('utf-8') || '',
              htmlBody: '',
              headers: {},
              attachments: [],
            });
          } catch (parseErr) {
            logger.error({ error: parseErr, uid: msg.uid }, 'Failed to parse email');
          }
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      logger.error({ error: err }, 'IMAP connection failed');
      throw err;
    } finally {
      await client.logout().catch(() => {});
    }

    logger.info({ count: emails.length, since: sinceDate.toISOString() }, 'Fetched emails via IMAP');
    return emails;
  }

  async testConnection(config: ImapConfig): Promise<boolean> {
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      logger: false,
    });
    // Swallow late async socket errors (e.g. ETIMEOUT after connect() already
    // rejected) — without a listener they crash the whole process.
    client.on('error', () => {});

    try {
      await client.connect();
      await client.logout();
      return true;
    } catch {
      return false;
    }
  }
}
