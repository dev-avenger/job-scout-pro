import { Injectable, Inject, Optional } from '@nestjs/common';
import type { AgentContext } from '@auto-job-apply/shared-types';
import { ScamDetectorAgent } from '../research/agents/scam-detector.agent.js';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'job-validator' });

export interface ValidationResult {
  isValid: boolean;
  status: 'valid' | 'expired' | 'duplicate' | 'scam' | 'pending';
  reason?: string;
  scamScore?: number;
}

@Injectable()
export class JobValidator {
  constructor(
    @Optional() @Inject(ScamDetectorAgent) private readonly scamDetector?: ScamDetectorAgent,
  ) {}

  async validate(
    rawJob: { title: string; companyName: string; sourceUrl?: string; description?: string; expiresAt?: Date; salaryMin?: number; salaryMax?: number },
    context?: AgentContext,
  ): Promise<ValidationResult> {
    // Basic field validation
    if (!rawJob.title || !rawJob.companyName) {
      return { isValid: false, status: 'valid', reason: 'Missing title or company name' };
    }

    // Check expiration
    if (rawJob.expiresAt && new Date(rawJob.expiresAt) < new Date()) {
      return { isValid: false, status: 'expired', reason: 'Job posting has expired' };
    }

    // Quality gate: title too short or generic
    if (rawJob.title.length < 3) {
      return { isValid: false, status: 'valid', reason: 'Job title too short' };
    }

    // Liveness gate: ATS APIs sometimes keep serving postings whose public
    // page is already closed (404/410). Only definitive "gone" statuses fail —
    // bot-blocks (403) and transient errors get the benefit of the doubt.
    if (rawJob.sourceUrl) {
      const accessible = await this.isUrlAccessible(rawJob.sourceUrl);
      if (!accessible) {
        return {
          isValid: false,
          status: 'expired',
          reason: 'Job posting page is no longer accessible (closed or removed)',
        };
      }
    }

    // Scam detection via LLM (only if context provided and description available)
    if (context && rawJob.description && this.scamDetector) {
      try {
        const { result } = await this.scamDetector.detectScam(rawJob as Record<string, unknown>, context);
        if (result.scamScore > 0.7) {
          logger.warn({ title: rawJob.title, scamScore: result.scamScore, flags: result.redFlags }, 'Job flagged as scam');
          return {
            isValid: false,
            status: 'scam',
            reason: `Scam detected (score: ${result.scamScore}): ${result.redFlags.join(', ')}`,
            scamScore: result.scamScore,
          };
        }
        return { isValid: true, status: 'valid', scamScore: result.scamScore };
      } catch (err) {
        logger.warn({ error: err }, 'Scam detection failed, allowing job');
        return { isValid: true, status: 'valid' };
      }
    }

    return { isValid: true, status: 'valid' };
  }

  private async isUrlAccessible(url: string): Promise<boolean> {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let response = await fetch(url, { method: 'HEAD', headers, signal: controller.signal });
      // Some servers reject HEAD — retry once with GET
      if (response.status === 405 || response.status === 501) {
        response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
      }
      clearTimeout(timer);
      if (response.status === 404 || response.status === 410) {
        logger.info({ url, status: response.status }, 'Job URL no longer accessible');
        return false;
      }
      return true;
    } catch {
      // Network hiccups should not drop otherwise-valid jobs
      return true;
    }
  }
}
