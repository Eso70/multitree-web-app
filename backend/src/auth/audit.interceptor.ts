import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { catchError, from, map, mergeMap, Observable, throwError } from 'rxjs';
import type { SessionUser } from './session.service';
import { SecurityAuditService } from './security-audit.service';
import {
  AUDIT_EVENT_METADATA,
  type AuditEventDefinition,
} from './audit-event.decorator';

type AuditedRequest = FastifyRequest & {
  user?: SessionUser;
  params?: Record<string, unknown>;
  body?: unknown;
  id?: string;
};

const SENSITIVE_FIELDS = new Set([
  'password',
  'password_hash',
  'current_password',
  'new_password',
  'events_token',
  'token',
  'session_token',
]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const definition = this.reflector.getAllAndOverride<AuditEventDefinition>(
      AUDIT_EVENT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!definition) return next.handle();

    const request = context.switchToHttp().getRequest<AuditedRequest>();

    return next.handle().pipe(
      mergeMap((response: unknown) =>
        from(this.record(request, definition, 'success', response)).pipe(
          map(() => response),
        ),
      ),
      catchError((error: unknown) =>
        from(
          this.record(request, definition, 'failure', undefined, error),
        ).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }

  private async record(
    request: AuditedRequest,
    definition: AuditEventDefinition,
    outcome: 'success' | 'failure',
    response?: unknown,
    error?: unknown,
  ): Promise<void> {
    const user = request.user;
    const responseData = this.asRecord(this.asRecord(response)?.data);
    const body = this.asRecord(request.body);
    const params = request.params || {};
    const resourceIdValue = definition.resourceIdParam
      ? params[definition.resourceIdParam]
      : responseData?.id;
    const resourceLabelField = definition.resourceLabelField || 'name';
    const resourceLabelValue =
      responseData?.[resourceLabelField] ??
      body?.[resourceLabelField] ??
      responseData?.username ??
      body?.username;

    await this.securityAuditService.record({
      actorType: user?.role || 'anonymous',
      actorId: user?.id || null,
      actorLabel: user?.name || user?.username || null,
      businessId: user?.role === 'business' ? user.id : null,
      eventType: definition.eventType,
      outcome,
      resourceType: definition.resourceType || null,
      resourceId: this.toString(resourceIdValue),
      resourceLabel: this.toString(resourceLabelValue),
      requestId: this.toString(request.id),
      ipAddress: this.clientIp(request),
      userAgent: this.firstHeader(request.headers['user-agent']),
      metadata: {
        method: request.method,
        path: request.url.split('?')[0],
        changedFields: this.safeFieldNames(body),
        ...(error
          ? {
              error: {
                name: error instanceof Error ? error.name : 'UnknownError',
                statusCode: this.errorStatus(error),
              },
            }
          : {}),
      },
    });
  }

  private safeFieldNames(body: Record<string, unknown> | null): string[] {
    if (!body) return [];
    return Object.keys(body)
      .filter((field) => !SENSITIVE_FIELDS.has(field.toLowerCase()))
      .sort()
      .slice(0, 50);
  }

  private clientIp(request: AuditedRequest): string | null {
    return (
      this.firstHeader(request.headers['x-forwarded-for']) ||
      this.firstHeader(request.headers['x-real-ip']) ||
      request.ip ||
      null
    );
  }

  private firstHeader(value: string | string[] | undefined): string {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === 'string' ? first.split(',')[0].trim() : '';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private toString(value: unknown): string | null {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : null;
  }

  private errorStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;
    const candidate = error as { status?: unknown; statusCode?: unknown };
    const status = candidate.statusCode ?? candidate.status;
    return typeof status === 'number' ? status : null;
  }
}
