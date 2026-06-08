import { Injectable, Inject } from '@nestjs/common';
import type { Database } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';

@Injectable()
export class AnswerBank {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}
}
