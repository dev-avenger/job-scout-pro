import pino from 'pino';

export interface LoggerOptions {
  name: string;
  level?: string;
  pretty?: boolean;
}

export function createLogger(options: LoggerOptions): pino.Logger {
  const { name, level = 'info', pretty = process.env.NODE_ENV !== 'production' } = options;

  const transport = pretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  return pino({
    name,
    level,
    transport,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    base: {
      service: name,
      env: process.env.NODE_ENV || 'development',
    },
  });
}

export const logger = createLogger({ name: 'auto-job-apply' });
