import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { apiErrorEnvelope, isRecord, type ApiErrorBody } from './api-response';

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const statusCode = this.getStatusCode(exception);
    const requestId = String(
      request.id || request.headers['x-request-id'] || '',
    );
    const path = request.url.split('?')[0];
    const normalized = this.normalize(exception, statusCode);
    const retryAfter = normalized.compatibility.retryAfter;

    if (statusCode >= 500 && !(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled request failure (${requestId || 'no-request-id'})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (
      statusCode === 429 &&
      (typeof retryAfter === 'number' || typeof retryAfter === 'string')
    ) {
      reply.header('Retry-After', String(retryAfter));
    }

    reply
      .status(statusCode)
      .send(
        apiErrorEnvelope(
          path,
          statusCode,
          normalized.error,
          requestId,
          normalized.compatibility,
        ),
      );
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (
      isRecord(exception) &&
      typeof exception.statusCode === 'number' &&
      Number.isInteger(exception.statusCode) &&
      exception.statusCode >= 400 &&
      exception.statusCode <= 599
    ) {
      return exception.statusCode;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private normalize(
    exception: unknown,
    statusCode: number,
  ): { error: ApiErrorBody; compatibility: Record<string, unknown> } {
    if (!(exception instanceof HttpException)) {
      if (statusCode >= 400 && statusCode < 500) {
        return {
          error: {
            code: STATUS_CODES[statusCode] || `HTTP_${statusCode}`,
            message:
              statusCode === 413
                ? 'Uploaded file exceeds the allowed size'
                : statusCode === 415
                  ? 'Uploaded file type is not supported'
                  : 'Request failed',
          },
          compatibility: {},
        };
      }

      return {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
        compatibility: {},
      };
    }

    const response = exception.getResponse();
    const body = isRecord(response) ? response : {};
    const rawMessage = typeof response === 'string' ? response : body.message;
    const validationDetails = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === 'string')
      : undefined;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : validationDetails?.length
          ? 'Validation failed'
          : exception.message || 'Request failed';
    const code =
      typeof body.code === 'string'
        ? body.code
        : validationDetails?.length
          ? 'VALIDATION_ERROR'
          : STATUS_CODES[statusCode] || `HTTP_${statusCode}`;
    const compatibility = Object.fromEntries(
      Object.entries(body).filter(
        ([key]) =>
          !['statusCode', 'error', 'message', 'code', 'details'].includes(key),
      ),
    );
    const details = body.details ?? validationDetails;

    return {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      compatibility,
    };
  }
}
