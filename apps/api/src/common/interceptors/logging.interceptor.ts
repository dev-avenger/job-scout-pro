import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { createLogger } from '@auto-job-apply/shared-utils';

const logger = createLogger({ name: 'http' });

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;
        logger.info({ method, url, statusCode: response.statusCode, duration }, 'Request completed');
      }),
    );
  }
}
