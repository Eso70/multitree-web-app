import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import type { ApiRequest } from './api-platform.types';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly database: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const principal = context
      .switchToHttp()
      .getRequest<ApiRequest>().apiPrincipal;
    if (!principal) return next.handle();
    const record = (success: boolean) => {
      void this.database.query(
        `INSERT INTO api_usage_daily(usage_date,business_id,client_id,request_count,success_count,error_count)
         VALUES(CURRENT_DATE,$1,$2,1,$3,$4)
         ON CONFLICT(usage_date,client_id) DO UPDATE SET
           request_count=api_usage_daily.request_count+1,
           success_count=api_usage_daily.success_count+EXCLUDED.success_count,
           error_count=api_usage_daily.error_count+EXCLUDED.error_count`,
        [
          principal.businessId,
          principal.clientId,
          success ? 1 : 0,
          success ? 0 : 1,
        ],
      );
    };
    return next.handle().pipe(
      tap(() => record(true)),
      catchError((error: unknown) => {
        record(false);
        return throwError(() => error);
      }),
    );
  }
}
