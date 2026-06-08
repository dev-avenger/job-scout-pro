import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase } from '@auto-job-apply/db';
import { DRIZZLE_CLIENT } from './database.constants.js';

@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        return createDatabase(databaseUrl);
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
