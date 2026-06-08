import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'exception-filter' });

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let error = 'Internal Server Error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const resp = exResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        error = (resp.error as string) || 'Error';
        details = resp.details;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      logger.error({ err: exception, url: request.url, method: request.method }, 'Unhandled error');
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    const body: Record<string, unknown> = { statusCode: status, error, message };
    if (details) {
      body.details = details;
    }

    response.status(status).send(body);
  }
}
