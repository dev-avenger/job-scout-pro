import { Injectable } from '@nestjs/common';
import { simpleParser, type ParsedMail, type Attachment } from 'mailparser';
import * as ical from 'node-ical';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'email-parser' });

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  date: Date;
  textBody: string;
  htmlBody: string;
  bodyPreview: string;
  headers: Record<string, string>;
  attachments: ParsedAttachment[];
  calendarEvents: CalendarEvent[];
  isAutoReply: boolean;
  threadId: string | null;
}

export interface ParsedAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  location: string;
  organizer: string;
  method: string;
}

@Injectable()
export class EmailParser {
  async parse(rawSource: string | Buffer): Promise<ParsedEmail> {
    const parsed: ParsedMail = await simpleParser(rawSource);

    const fromAddr = parsed.from?.value?.[0]?.address || '';
    const toAddrs = (parsed.to && !Array.isArray(parsed.to) ? [parsed.to] : (parsed.to as any) || [])
      .flatMap((addr: any) => addr.value?.map((v: any) => v.address) || []);
    const ccAddrs = (parsed.cc && !Array.isArray(parsed.cc) ? [parsed.cc] : (parsed.cc as any) || [])
      .flatMap((addr: any) => addr.value?.map((v: any) => v.address) || []);

    const textBody = parsed.text || '';
    const htmlBody = parsed.html || '';
    const bodyPreview = textBody.substring(0, 500).replace(/\s+/g, ' ').trim();

    // Extract headers
    const headers: Record<string, string> = {};
    if (parsed.headers) {
      for (const [key, value] of parsed.headers) {
        headers[key] = typeof value === 'string' ? value : String(value);
      }
    }

    // Check if auto-reply
    const isAutoReply =
      headers['auto-submitted'] === 'auto-replied' ||
      headers['x-auto-response-suppress'] != null ||
      (parsed.subject || '').toLowerCase().includes('out of office') ||
      (parsed.subject || '').toLowerCase().includes('automatic reply');

    // Parse attachments
    const attachments: ParsedAttachment[] = (parsed.attachments || []).map((att: Attachment) => ({
      filename: att.filename || 'unnamed',
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || 0,
      content: att.content,
    }));

    // Parse calendar events from .ics attachments
    const calendarEvents: CalendarEvent[] = [];
    for (const att of parsed.attachments || []) {
      if (att.contentType?.includes('calendar') || att.filename?.endsWith('.ics')) {
        try {
          const icsData = att.content.toString('utf-8');
          const events = ical.sync.parseICS(icsData);
          for (const [, event] of Object.entries(events)) {
            if (event && event.type === 'VEVENT') {
              const vevent = event as ical.VEvent;
              calendarEvents.push({
                uid: vevent.uid || '',
                summary: vevent.summary || '',
                description: vevent.description || '',
                start: vevent.start ? new Date(vevent.start as any) : new Date(),
                end: vevent.end ? new Date(vevent.end as any) : new Date(),
                location: vevent.location || '',
                organizer: typeof vevent.organizer === 'string' ? vevent.organizer : (vevent.organizer as any)?.val || '',
                method: (events as any).method || 'REQUEST',
              });
            }
          }
        } catch (icsErr) {
          logger.warn({ error: icsErr, filename: att.filename }, 'Failed to parse calendar attachment');
        }
      }
    }

    // Extract thread ID from References or In-Reply-To
    const threadId = headers['in-reply-to'] || headers['references']?.split(/\s+/)[0] || null;

    return {
      messageId: parsed.messageId || '',
      from: fromAddr,
      to: toAddrs,
      cc: ccAddrs,
      subject: parsed.subject || '',
      date: parsed.date || new Date(),
      textBody,
      htmlBody,
      bodyPreview,
      headers,
      attachments,
      calendarEvents,
      isAutoReply,
      threadId,
    };
  }
}
