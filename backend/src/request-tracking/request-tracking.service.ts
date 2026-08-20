import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import type { SessionUser } from '../auth/session.service';
import type { FrontendRequestEventDto } from './dto/frontend-request-event.dto';
import { isIP } from 'net';
import { randomUUID } from 'crypto';

type TrackedRequest = {
  id: string | number;
  method: string;
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  routeOptions?: { url?: string };
  user?: SessionUser;
  trackingStartedAt?: number;
};

type TrackedReply = { statusCode: number };

interface RequestEventInput {
  ingestionKey?: string;
  requestId?: string | null;
  source: 'frontend' | 'backend';
  method: string;
  requestPath: string;
  routePattern?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  actorType?:
    'anonymous' | 'business' | 'creator' | 'platform-admin' | 'multitree';
  actorId?: string | null;
  actorLabel?: string | null;
  businessId?: string | null;
  subdomain?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class RequestTrackingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestTrackingService.name);
  private readonly retentionDays: number;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxQueueSize: number;
  private readonly cleanupBatchSize: number;
  private readonly cleanupMaxBatches: number;
  private readonly queue: RequestEventInput[] = [];
  private flushPromise?: Promise<void>;
  private flushTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private lastWarningAt = 0;
  private droppedEvents = 0;
  private consecutiveFlushFailures = 0;
  private nextFlushAt = 0;

  constructor(
    private readonly databaseService: DatabaseService,
    configService: ConfigService,
  ) {
    this.retentionDays = configService.get<number>(
      'REQUEST_LOG_RETENTION_DAYS',
      30,
    );
    this.batchSize = configService.get<number>('REQUEST_LOG_BATCH_SIZE', 250);
    this.flushIntervalMs = configService.get<number>(
      'REQUEST_LOG_FLUSH_INTERVAL_MS',
      250,
    );
    this.maxQueueSize = configService.get<number>(
      'REQUEST_LOG_MAX_QUEUE_SIZE',
      50_000,
    );
    this.cleanupBatchSize = configService.get<number>(
      'REQUEST_LOG_CLEANUP_BATCH_SIZE',
      10_000,
    );
    this.cleanupMaxBatches = configService.get<number>(
      'REQUEST_LOG_CLEANUP_MAX_BATCHES',
      100,
    );
  }

  onModuleInit(): void {
    this.flushTimer = setInterval(
      () => void this.flushQueue(),
      this.flushIntervalMs,
    );
    this.flushTimer.unref();
    void this.cleanupExpired();
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpired(),
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    while (this.queue.length > 0 || this.flushPromise) {
      const queuedBefore = this.queue.length;
      await this.flushQueue();
      if (this.queue.length >= queuedBefore && !this.flushPromise) break;
    }
  }

  markStarted(request: TrackedRequest): void {
    request.trackingStartedAt = Date.now();
  }

  recordBackendRequest(
    request: TrackedRequest,
    reply: TrackedReply,
  ): Promise<void> {
    const path = this.cleanPath(request.url);
    if (path === '/api/internal/request-events') return Promise.resolve();
    const user = request.user;
    return this.record({
      requestId: String(request.id || ''),
      source: 'backend',
      method: request.method,
      requestPath: path,
      routePattern: this.cleanPath(request.routeOptions?.url || path),
      statusCode: reply.statusCode,
      durationMs: Math.max(
        0,
        Date.now() - (request.trackingStartedAt || Date.now()),
      ),
      actorType: user?.role || 'anonymous',
      actorId: user?.id || null,
      actorLabel: user?.name || user?.username || null,
      businessId: user?.role === 'business' ? user.id : null,
      subdomain: this.firstHeader(request.headers['x-subdomain']),
      ipAddress: this.clientIp(request),
      userAgent: this.firstHeader(request.headers['user-agent']),
    });
  }

  recordFrontendRequest(event: FrontendRequestEventDto): Promise<void> {
    return this.record({
      requestId: event.requestId,
      source: 'frontend',
      method: event.method,
      requestPath: this.cleanPath(event.path),
      routePattern: this.cleanPath(event.path),
      statusCode: null,
      durationMs: null,
      actorType: 'anonymous',
      subdomain: event.subdomain,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });
  }

  private record(event: RequestEventInput): Promise<void> {
    const normalized: RequestEventInput = {
      ingestionKey: event.ingestionKey || randomUUID(),
      requestId: this.cleanText(event.requestId, 100),
      source: event.source,
      method: event.method.toUpperCase().slice(0, 10),
      requestPath: this.cleanPath(event.requestPath),
      routePattern: this.cleanText(event.routePattern, 500),
      statusCode: event.statusCode ?? null,
      durationMs: event.durationMs ?? null,
      actorType: event.actorType || 'anonymous',
      actorId: event.actorId || null,
      actorLabel: this.cleanText(event.actorLabel, 200),
      businessId: event.businessId || null,
      subdomain: this.cleanText(event.subdomain, 100),
      ipAddress: normalizeIp(event.ipAddress),
      userAgent: this.cleanText(event.userAgent, 1000),
    };

    if (this.queue.length >= this.maxQueueSize) {
      this.droppedEvents += 1;
      this.warnThrottled(
        `Request tracking queue is full; ${this.droppedEvents} telemetry event(s) dropped to protect website availability`,
      );
      return Promise.resolve();
    }

    this.queue.push(normalized);
    if (this.queue.length >= this.batchSize) void this.flushQueue();
    return Promise.resolve();
  }

  private async flushQueue(): Promise<void> {
    if (this.flushPromise) return this.flushPromise;
    if (this.queue.length === 0) return;
    if (Date.now() < this.nextFlushAt) return;

    const batch = this.queue.splice(0, this.batchSize);
    let succeeded = false;
    this.flushPromise = this.writeBatch(batch)
      .then(() => {
        succeeded = true;
        this.consecutiveFlushFailures = 0;
        this.nextFlushAt = 0;
      })
      .catch((error: Error) => {
        const available = Math.max(0, this.maxQueueSize - this.queue.length);
        if (available > 0) this.queue.unshift(...batch.slice(0, available));
        const lost = Math.max(0, batch.length - available);
        if (lost > 0) this.droppedEvents += lost;
        this.consecutiveFlushFailures += 1;
        const retryDelay = Math.min(
          30_000,
          this.flushIntervalMs *
            2 ** Math.min(this.consecutiveFlushFailures - 1, 10),
        );
        this.nextFlushAt = Date.now() + retryDelay;
        this.warnThrottled(`Request tracking is unavailable: ${error.message}`);
      })
      .finally(() => {
        this.flushPromise = undefined;
        if (succeeded && this.queue.length >= this.batchSize) {
          void this.flushQueue();
        }
      });
    return this.flushPromise;
  }

  private async writeBatch(batch: RequestEventInput[]): Promise<void> {
    if (batch.length === 0) return;
    await this.databaseService.query(
      `WITH incoming AS (
         SELECT *
         FROM jsonb_to_recordset($1::jsonb) AS event(
           "ingestionKey" uuid,
           "requestId" text,
           source text,
           method text,
           "requestPath" text,
           "routePattern" text,
           "statusCode" smallint,
           "durationMs" integer,
           "actorType" text,
           "actorId" uuid,
           "actorLabel" text,
           "businessId" uuid,
           subdomain text,
           "ipAddress" inet,
           "userAgent" text
         )
       )
       , inserted AS (
         INSERT INTO http_request_events (
           ingestion_key, request_id, source, method, request_path, route_pattern,
           status_code, duration_ms, actor_type, actor_id, actor_label,
           business_id, subdomain, ip_address, user_agent
         )
         SELECT
           "ingestionKey", "requestId", source, method, "requestPath", "routePattern",
           "statusCode", "durationMs", "actorType", "actorId", "actorLabel",
           "businessId", subdomain, "ipAddress", "userAgent"
         FROM incoming
         ON CONFLICT (ingestion_key) WHERE ingestion_key IS NOT NULL DO NOTHING
         RETURNING created_at::date AS event_day, source, method, actor_type,
           CASE
             WHEN status_code IN (401, 403) THEN 'denied'
             WHEN status_code >= 400 THEN 'failure'
             ELSE 'success'
           END AS outcome
       ), aggregated AS (
         SELECT event_day, source, method, actor_type, outcome, COUNT(*)::bigint AS total
         FROM inserted
         GROUP BY event_day, source, method, actor_type, outcome
       ), updated_stats AS (
         INSERT INTO http_request_event_daily_stats (
           event_day, source, method, actor_type, outcome, total
         )
         SELECT event_day, source, method, actor_type, outcome, total
         FROM aggregated
         ON CONFLICT (event_day, source, method, actor_type, outcome)
         DO UPDATE SET total = http_request_event_daily_stats.total + EXCLUDED.total
         RETURNING 1
       )
       SELECT COUNT(*)::int AS inserted FROM inserted`,
      [JSON.stringify(batch)],
    );
  }

  private warnThrottled(message: string): void {
    const now = Date.now();
    if (now - this.lastWarningAt >= 60_000) {
      this.lastWarningAt = now;
      this.logger.warn(message);
    }
  }

  private async cleanupExpired(): Promise<void> {
    try {
      const policy = await this.databaseService
        .query<{ request_log_days: number }>(
          'SELECT request_log_days FROM platform_data_retention_settings WHERE id=1',
        )
        .catch(() => ({ rows: [] as { request_log_days: number }[] }));
      const retentionDays = Number(
        policy.rows[0]?.request_log_days || this.retentionDays,
      );
      for (let index = 0; index < this.cleanupMaxBatches; index += 1) {
        const result = await this.databaseService.query<{ deleted: number }>(
          `WITH expired AS (
             SELECT id
             FROM http_request_events
             WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
             ORDER BY created_at, id
             LIMIT $2
             FOR UPDATE SKIP LOCKED
           ), deleted AS (
             DELETE FROM http_request_events target
             USING expired
             WHERE target.id = expired.id
             RETURNING
               target.id,
               target.created_at::date AS event_day,
               target.source,
               target.method,
               target.actor_type,
               CASE
                 WHEN target.status_code IN (401, 403) THEN 'denied'
                 WHEN target.status_code >= 400 THEN 'failure'
                 ELSE 'success'
               END AS outcome
           ), decrements AS (
             SELECT event_day, source, method, actor_type, outcome, COUNT(*)::bigint AS total
             FROM deleted
             GROUP BY event_day, source, method, actor_type, outcome
           ), updated_stats AS (
             UPDATE http_request_event_daily_stats stats
             SET total = GREATEST(0, stats.total - decrements.total)
             FROM decrements
             WHERE stats.event_day = decrements.event_day
               AND stats.source = decrements.source
               AND stats.method = decrements.method
               AND stats.actor_type = decrements.actor_type
               AND stats.outcome = decrements.outcome
             RETURNING stats.total
           )
           SELECT COUNT(*)::int AS deleted FROM deleted`,
          [retentionDays, this.cleanupBatchSize],
        );
        const deleted = Number(result.rows[0]?.deleted || 0);
        if (deleted < this.cleanupBatchSize) break;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      await this.databaseService.query(
        'DELETE FROM http_request_event_daily_stats WHERE total = 0',
      );
    } catch {
      // The table may not exist until the explicit deployment migration runs.
    }
  }

  private cleanPath(value: string): string {
    const path = String(value || '/')
      .split('?')[0]
      .trim();
    return (path.startsWith('/') ? path : `/${path}`).slice(0, 500);
  }

  private cleanText(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    const normalized = String(value || '').trim();
    return normalized ? normalized.slice(0, maxLength) : null;
  }

  private clientIp(request: TrackedRequest): string | null {
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
}

function normalizeIp(value?: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim().replace(/%.*$/, '');
  if (!first || first === 'unknown' || first === 'localhost') return null;
  return isIP(first) ? first : null;
}
