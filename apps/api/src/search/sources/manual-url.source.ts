import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';

@Injectable()
export class ManualUrlSource implements IJobSource {
  readonly name = 'manual_url';
  readonly channel = 'manual_url';

  async *search(): AsyncGenerator<any> {
    // Manual URL source doesn't search - jobs are added directly
  }

  async validate(job: any) {
    return { isValid: true };
  }
}
