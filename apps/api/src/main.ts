import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { createLogger } from '@auto-job-apply/shared-utils';
import { AppModule } from './app.module.js';

const logger = createLogger({ name: 'api' });

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { logger: false },
  );

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
  logger.info(`API server listening on ${host}:${port}`);
}

bootstrap().catch((err) => {
  logger.error({ error: err }, 'Failed to start API server');
  process.exit(1);
});
