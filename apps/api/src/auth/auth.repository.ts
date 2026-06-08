import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { users, userPreferences } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from '../core/database/database.constants.js';
import type { Database } from '@auto-job-apply/db';

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findUserByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findUserById(userId: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  async createUser(data: { id: string; email: string; passwordHash: string }) {
    await this.db.insert(users).values(data);
  }

  async createDefaultPreferences(data: { id: string; userId: string }) {
    await this.db.insert(userPreferences).values({
      ...data,
      targetRoles: [],
      locations: [],
    });
  }
}
