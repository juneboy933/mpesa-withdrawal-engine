import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Generate or propagate a correlation ID for request tracing
    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv4();
    request.correlationId = correlationId;

    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`[${correlationId}] ${method} ${url} — ${duration}ms`);
      }),
    );
  }
}
