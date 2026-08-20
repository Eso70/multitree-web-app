import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fastifyCookie, { type FastifyCookieOptions } from '@fastify/cookie';
import fastifyMultipart, {
  type FastifyMultipartOptions,
} from '@fastify/multipart';
import type { FastifyPluginCallback, FastifyPluginOptions } from 'fastify';
import { RequestTrackingService } from './request-tracking/request-tracking.service';
import { RequestBoundaryPipe } from './common/request-boundary.pipe';
import {
  isAuthenticatedMutation,
  isSameOriginBrowserRequest,
} from './common/request-origin';
import { OperationalMetricsService } from './observability/operational-metrics.service';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { apiErrorEnvelope } from './common/api-response';
import { AccessRuleEnforcementService } from './auth/access-rule-enforcement.service';
import { requestIp } from './common/request-context';
import { isRootDomainHost } from './common/root-domain';

/**
 * Both plugins ship a CommonJS and an ESM shape, so the resolved value is
 * either the plugin itself or a module namespace wrapping it under `default`.
 */
function resolvePlugin<TOptions extends FastifyPluginOptions>(
  imported: unknown,
) {
  const namespace = imported as { default?: unknown };
  return (namespace.default ?? imported) as FastifyPluginCallback<TOptions>;
}

const cookiePlugin = resolvePlugin<FastifyCookieOptions>(fastifyCookie);

const multipartPlugin =
  resolvePlugin<FastifyMultipartOptions>(fastifyMultipart);

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const requestTrackingService = app.get(RequestTrackingService);
  const operationalMetrics = app.get(OperationalMetricsService);
  const accessRules = app.get(AccessRuleEnforcementService);
  const requestLogger = new Logger('HttpRequest');
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onRequest', (request, reply, done) => {
    requestTrackingService.markStarted(request);
    (
      request as typeof request & { operationalStartedAt: number }
    ).operationalStartedAt = Date.now();
    reply.header('x-request-id', String(request.id));
    done();
  });
  fastify.addHook('onResponse', async (request, reply) => {
    const startedAt = (
      request as typeof request & { operationalStartedAt?: number }
    ).operationalStartedAt;
    const durationMs = Math.max(0, Date.now() - (startedAt || Date.now()));
    operationalMetrics.recordHttpRequest(reply.statusCode, durationMs);
    const context = request as typeof request & {
      user?: { id?: string; role?: string };
      apiPrincipal?: { businessId?: string; clientId?: string };
    };
    requestLogger.log(
      JSON.stringify({
        event: 'http_request',
        requestId: String(request.id),
        tenantId:
          context.apiPrincipal?.businessId ||
          (context.user?.role === 'business' ? context.user.id : undefined),
        apiClientId: context.apiPrincipal?.clientId,
        method: request.method,
        route: request.routeOptions?.url || request.url.split('?')[0],
        statusCode: reply.statusCode,
        durationMs,
      }),
    );
    await requestTrackingService.recordBackendRequest(request, reply);
  });

  await app.register(cookiePlugin, {
    secret: configService.get<string>('SESSION_SECRET'),
  });
  fastify.addHook('preValidation', async (request, reply) => {
    const path = request.url.split('?')[0];
    const hasMoreSpecificRuleCheck = [
      '/api/platform',
      '/api/auth',
      '/api/linktrees',
      '/api/links',
      '/api/mini-websites',
      '/api/analytics',
      '/api/v1',
      '/api/public/business',
      '/api/public/linktrees',
      '/api/public/linktree/',
      '/api/public/platform/linktree/',
      '/api/public/mini-websites',
      '/api/public/analytics',
    ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (
      !hasMoreSpecificRuleCheck &&
      !(await accessRules.isAllowed(requestIp(request)))
    ) {
      return reply.code(403).send(
        apiErrorEnvelope(
          path,
          403,
          {
            code: 'ACCESS_RULE_DENIED',
            message: 'Request blocked by an access rule',
          },
          String(request.id),
        ),
      );
    }
    if (
      isAuthenticatedMutation(request.method, request.cookies) &&
      !isSameOriginBrowserRequest(
        request.headers.origin,
        request.headers.referer,
        request.headers.host,
        request.headers['x-forwarded-proto'],
        request.protocol,
      )
    ) {
      return reply.code(403).send(
        apiErrorEnvelope(
          request.url.split('?')[0],
          403,
          {
            code: 'INVALID_REQUEST_ORIGIN',
            message: 'Invalid request origin',
          },
          String(request.id),
        ),
      );
    }
  });

  const maxFileSizeMb = configService.get<number>('MAX_FILE_SIZE_MB', 10);
  await app.register(multipartPlugin, {
    limits: {
      fileSize: maxFileSizeMb * 1024 * 1024,
    },
  });

  app.useGlobalPipes(
    new RequestBoundaryPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  const corsOriginRaw = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3011',
  );
  // CORS_ORIGIN accepts a comma-separated list. Each entry may be an exact
  // origin (e.g. "https://sponsor.krd") or a wildcard subdomain
  // pattern (e.g. "https://*.sponsor.krd"). We compile the list once
  // at boot so the per-request callback is cheap.
  const allowedOrigins = corsOriginRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const rootDomain = process.env.ROOT_DOMAIN || 'localhost';
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  function isOriginAllowed(origin: string): boolean {
    // Exact match against any entry in CORS_ORIGIN
    if (allowedOrigins.includes(origin)) return true;
    // Wildcard subdomain match: "https://*.example.com" matches "https://x.example.com"
    for (const allowed of allowedOrigins) {
      if (!allowed.includes('*')) continue;
      // Build a regex from the wildcard pattern. Only `*` is special; everything
      // else is escaped. This covers the common case of a single `*` subdomain
      // wildcard in the hostname.
      const escaped = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[a-zA-Z0-9-]+');
      if (new RegExp(`^${escaped}$`).test(origin)) return true;
    }
    // Fallbacks: localhost (dev-only) and the configured root domain / subdomains (http in dev, https in prod)
    try {
      const url = new URL(origin);
      if (nodeEnv !== 'production') {
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return true;
        }
      }
      // ROOT_DOMAIN may carry a development port (lvh.me:3011); `url.hostname`
      // never does, so the comparison is made on the hostname alone.
      if (isRootDomainHost(url.hostname, rootDomain)) {
        if (nodeEnv === 'production' && url.protocol !== 'https:') {
          return false;
        }
        return true;
      }
    } catch {
      // origin wasn't a valid URL; fall through
    }
    return false;
  }
  app.enableCors({
    origin: (origin, callback) => {
      // No origin = non-browser request (curl, server-to-server) — allow
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      // Surface the rejected origin in the error so production debugging
      // is straightforward. Nest's default exception filter still returns
      // 500 to the browser, but the log will show the offending origin.
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Idempotency-Key',
      'x-subdomain',
      'x-middleware-check',
    ],
    exposedHeaders: [
      'Idempotency-Replayed',
      'X-RateLimit-Limit',
      'Retry-After',
      'Content-Disposition',
      'X-Request-ID',
    ],
    credentials: true,
  });

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NestJS Backend running on http://localhost:${port}`);
}
void bootstrap();
