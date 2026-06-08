import { Injectable } from '@nestjs/common';
import type { IJobSource } from '../interfaces/job-source.interface.js';

@Injectable()
export class RssFeedSource implements IJobSource {
  readonly name = 'rss_feed';
  readonly channel = 'rss_feed';

  async *search(): AsyncGenerator<any> {
    // RSS feed parsing implementation
  }

  async validate(job: any) {
    return { isValid: true };
  }
}
