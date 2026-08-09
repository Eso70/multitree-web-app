import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { internalSuccessEnvelope } from './api-response';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    return next.handle().pipe(
      map((value: unknown) => {
        if (
          reply.sent ||
          value instanceof StreamableFile ||
          Buffer.isBuffer(value)
        ) {
          return value;
        }
        return internalSuccessEnvelope(value);
      }),
    );
  }
}
