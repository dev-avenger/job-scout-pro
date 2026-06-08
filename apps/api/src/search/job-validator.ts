import { Injectable } from '@nestjs/common';

@Injectable()
export class JobValidator {
  async validate(rawJob: { title: string; companyName: string; sourceUrl?: string }): Promise<{ isValid: boolean; reason?: string }> {
    if (!rawJob.title || !rawJob.companyName) {
      return { isValid: false, reason: 'Missing title or company name' };
    }
    return { isValid: true };
  }
}
