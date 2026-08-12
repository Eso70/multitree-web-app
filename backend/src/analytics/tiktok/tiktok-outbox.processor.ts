import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationService } from '../../communications/communication.service';
import { SecretCryptoService } from '../../auth/secret-crypto.service';
import { DatabaseService } from '../../database/database.service';
import { OperationalMetricsService } from '../../observability/operational-metrics.service';

interface OutboxRow {
  id: string;
  attempt_count: number;
  business_id: string;
  destination_id: string;
  pixel_id: string;
  encrypted_events_token: Buffer;
  payload: Record<string, unknown>;
}

interface DeliveryResult {
  success: boolean;
  retryable: boolean;
  statusCode?: number;
  requestId?: string;
  summary?: string;
  /** From a `Retry-After` header, when the provider sent one. */
  retryAfterSeconds?: number;
  durationMs: number;
}

const EVENTS_API_URL =
  'https://business-api.tiktok.com/open_api/v1.3/event/track/';
const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 50;

/**
 * How long a claimed row may sit in `processing` before another pass may take
 * it back — the queue's visibility timeout.
 *
 * Interpolated rather than bound because it is a module-level constant that
 * never touches a request: there is no input here to validate, unlike the
 * composed fragments in `billing/entitlement-sql.ts`, which guard their
 * arguments precisely because those arguments are arguments.
 *
 * Well above the 10s delivery timeout, so a slow but live request is never
 * stolen from the worker that owns it.
 */
const STALE_LOCK_CUTOFF = `now() - interval '10 minutes'`;

@Injectable()
export class TikTokOutboxProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TikTokOutboxProcessor.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly secrets: SecretCryptoService,
    private readonly config: ConfigService,
    private readonly metrics: OperationalMetricsService,
    private readonly communications: CommunicationService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('NODE_ENV') === 'test') return;
    this.metrics.registerWorker('tiktok-outbox', 15_000);
    this.timer = setInterval(() => void this.process(), 2000);
    this.timer.unref();
    void this.process();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async process(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const startedAt = Date.now();
    let succeeded = false;
    try {
      const jobs = await this.claim();
      // Grouped by destination because the request body carries one
      // `event_source_id` and one access token: two pixels cannot share a
      // call, and two events for the same pixel have no reason not to.
      const byDestination = new Map<string, OutboxRow[]>();
      for (const job of jobs) {
        const group = byDestination.get(job.destination_id);
        if (group) group.push(job);
        else byDestination.set(job.destination_id, [job]);
      }
      for (const group of byDestination.values()) {
        await this.deliver(group);
      }
      succeeded = true;
    } catch (error) {
      this.logger.error(
        `TikTok outbox processing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.metrics.recordWorkerRun('tiktok-outbox', startedAt, succeeded);
      this.running = false;
    }
  }

  private async claim(): Promise<OutboxRow[]> {
    return this.database.transaction(async (client) => {
      await client.query(
        `UPDATE marketing_event_outbox outbox
         SET status='cancelled',
             locked_at=NULL,
             last_error='TikTok destination is inactive, missing Events API token, or no longer exists',
             updated_at=now()
         WHERE (
                 outbox.status IN ('pending','retry_scheduled')
                 OR (outbox.status = 'processing' AND outbox.locked_at < ${STALE_LOCK_CUTOFF})
               )
           AND NOT EXISTS (
             SELECT 1 FROM business_tiktok_pixels destination
             WHERE destination.id=outbox.destination_id
               AND destination.status='active'
               AND destination.encrypted_events_token IS NOT NULL
           )`,
      );
      const result = await client.query<OutboxRow>(
        `WITH ready AS (
           SELECT outbox.id
           FROM marketing_event_outbox outbox
           WHERE (
                   outbox.status IN ('pending','retry_scheduled')
                   AND outbox.next_attempt_at <= now()
                 )
              -- A row left 'processing' by a process that died mid-delivery.
              -- Reclaimed here rather than only at startup: a healthy instance
              -- would otherwise never recover a crashed sibling's rows, and
              -- those events simply stopped being delivered.
              OR (
                   outbox.status = 'processing'
                   AND outbox.locked_at < ${STALE_LOCK_CUTOFF}
                 )
           ORDER BY outbox.next_attempt_at, outbox.created_at
           FOR UPDATE SKIP LOCKED
           LIMIT $1
         )
         UPDATE marketing_event_outbox outbox
         SET status = 'processing',
             locked_at = now(),
             attempt_count = outbox.attempt_count + 1,
             updated_at = now()
         FROM ready, business_tiktok_pixels destination
         WHERE outbox.id = ready.id
           AND destination.id = outbox.destination_id
           AND destination.status = 'active'
           AND destination.encrypted_events_token IS NOT NULL
         RETURNING outbox.id, outbox.attempt_count, outbox.business_id,
                   outbox.destination_id,
                   destination.pixel_id, destination.encrypted_events_token,
                   outbox.payload`,
        [BATCH_SIZE],
      );
      return result.rows;
    });
  }

  private token(payload: Buffer): string {
    const decrypted = this.secrets.decryptJson(payload);
    const token = decrypted.events_token ?? decrypted.legacyValue;
    return typeof token === 'string' ? token.trim() : '';
  }

  /** One entry of the `data` array. */
  private eventEntry(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const user = this.compact({
      ttclid: payload.ttclid,
      ttp: payload.ttp,
      external_id: payload.external_id,
      email: payload.email,
      phone: payload.phone,
      ip: payload.ip,
      user_agent: payload.user_agent,
    });
    return this.compact({
      event: payload.event,
      event_time: payload.event_time,
      event_id: payload.event_id,
      user,
      page: this.compact({
        url: payload.url,
        referrer: payload.referrer,
      }),
      properties: this.compact({
        value: payload.value,
        currency: payload.currency,
        // `contents` is the documented array form and the one that carries a
        // price and a quantity per item. The flat `content_id` beside it stays
        // because reporting still reads it for single-item events.
        contents: [
          this.compact({
            content_id: payload.content_id,
            content_type: payload.content_type,
            content_name: payload.content_name,
          }),
        ].filter((entry) => Object.keys(entry).length > 0),
        content_id: payload.content_id,
        content_ids: payload.content_ids,
        content_type: payload.content_type,
        content_name: payload.content_name,
        description: payload.description,
      }),
    });
  }

  /**
   * The Events API 2.0 request body for one destination.
   *
   * This endpoint is v1.3, which replaced the older `pixel_code` + `context`
   * shape with `event_source` / `event_source_id` and a `user` object. Sending
   * the previous shape here is rejected outright as a parameter error, so the
   * distinction is not cosmetic: it is the difference between every server
   * event landing and none of them.
   *
   * `data` carries every event claimed for the same pixel in this pass. It was
   * one request per event, which multiplied both the round trips and the rate
   * limit pressure by the batch size for no gain — the endpoint has always
   * taken an array.
   *
   * Identity fields arrive already SHA-256 hashed and are passed through
   * untouched — hashing them twice produces a digest that matches nothing.
   */
  private requestBody(jobs: OutboxRow[]): Record<string, unknown> {
    return {
      event_source: 'web',
      event_source_id: jobs[0].pixel_id,
      data: jobs.map((job) => this.eventEntry(job.payload)),
    };
  }

  /**
   * Drops empty keys.
   *
   * TikTok validates the fields it is given rather than ignoring blank ones, so
   * an absent cookie sent as `null` is rejected where omitting it is accepted.
   */
  private compact(source: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(source).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === 'object' && Object.keys(value).length === 0),
      ),
    );
  }

  private async send(jobs: OutboxRow[]): Promise<DeliveryResult> {
    const startedAt = Date.now();
    try {
      const token = this.token(jobs[0].encrypted_events_token);
      if (!token) {
        return {
          success: false,
          retryable: false,
          summary: 'Events API token could not be decrypted',
          durationMs: Date.now() - startedAt,
        };
      }
      const response = await fetch(EVENTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': token,
        },
        body: JSON.stringify(this.requestBody(jobs)),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();
      let requestId: string | undefined;
      let providerCode: number | undefined;
      let providerMessage: string | undefined;
      try {
        const parsed = JSON.parse(text) as {
          code?: number;
          message?: string;
          request_id?: string;
          requestId?: string;
        };
        providerCode = parsed.code;
        providerMessage = parsed.message;
        requestId = parsed.request_id || parsed.requestId;
      } catch {
        requestId = undefined;
      }
      const providerAccepted = providerCode === undefined || providerCode === 0;
      const success = response.ok && providerAccepted;
      const summary = success
        ? undefined
        : (
            providerMessage ||
            text.replace(/\s+/g, ' ').trim() ||
            `HTTP ${response.status}`
          ).slice(0, 500);
      return {
        success,
        retryable:
          response.status === 429 ||
          response.status >= 500 ||
          (response.ok && providerCode !== undefined && providerCode >= 50000),
        statusCode: response.status,
        requestId,
        summary,
        // Honoured over our own backoff when TikTok states one. Guessing
        // shorter than the window it asked for is how a rate limit turns into
        // a longer one.
        retryAfterSeconds: this.retryAfter(response),
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        success: false,
        retryable: true,
        summary:
          error instanceof Error
            ? error.message.slice(0, 500)
            : 'Unknown delivery error',
        durationMs: Date.now() - startedAt,
      };
    }
  }

  /** Seconds TikTok asked us to wait, when it said so. */
  private retryAfter(response: Response): number | undefined {
    const header = response.headers.get('retry-after');
    if (!header) return undefined;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0)
      return Math.min(3600, seconds);
    const at = Date.parse(header);
    if (!Number.isFinite(at)) return undefined;
    return Math.min(3600, Math.max(0, Math.round((at - Date.now()) / 1000)));
  }

  /**
   * Delivers one destination's claimed events and records the outcome for each.
   *
   * The request is shared, so the result is too: every event in the group is
   * marked delivered, retried, or failed together. That is the honest reading
   * — the API accepted or rejected the batch as a unit — and it keeps the
   * attempt rows lined up with the request that actually happened.
   */
  private async deliver(jobs: OutboxRow[]): Promise<void> {
    const result = await this.send(jobs);

    /**
     * A permanent rejection of a batch is retried one event at a time.
     *
     * TikTok answers for the request as a whole, so a single malformed payload
     * would otherwise mark up to forty-nine healthy siblings
     * `failed_permanently` — batching would have turned one lost event into a
     * lost batch. Splitting costs extra requests only on a permanent
     * rejection, which is rare, and it recurses exactly once because a
     * one-event group cannot split again. Nothing is recorded for the group
     * here: each job gets its own attempt row from its own call.
     */
    if (!result.success && !result.retryable && jobs.length > 1) {
      this.logger.warn(
        `TikTok batch rejected, retrying ${jobs.length} events individually — ${result.summary ?? 'no detail'}`,
      );
      for (const job of jobs) await this.deliver([job]);
      return;
    }

    // Delivery failures were previously only readable by querying the attempts
    // table, so a misconfigured token or a rejected payload looked exactly like
    // no traffic at all. A permanent failure is the operator's problem to fix
    // and says so; a retry is noted quietly because the next pass may succeed.
    if (!result.success) {
      const attempts = Math.max(...jobs.map((job) => job.attempt_count));
      const detail = `events=${jobs.length} attempt=${attempts}/${MAX_ATTEMPTS} status=${result.statusCode ?? 'none'} request_id=${result.requestId ?? 'none'}: ${result.summary ?? 'no detail'}`;
      if (result.retryable && attempts < MAX_ATTEMPTS)
        this.logger.warn(`TikTok delivery retrying — ${detail}`);
      else this.logger.error(`TikTok delivery failed permanently — ${detail}`);
    }

    await this.database.transaction(async (client) => {
      for (const job of jobs) {
        const canRetry =
          !result.success &&
          result.retryable &&
          job.attempt_count < MAX_ATTEMPTS;
        const outcome = result.success
          ? 'success'
          : canRetry
            ? 'retry'
            : 'failure';
        const delaySeconds =
          result.retryAfterSeconds ??
          Math.min(3600, 30 * 2 ** Math.max(0, job.attempt_count - 1));

        await client.query(
          `INSERT INTO marketing_delivery_attempts (
             outbox_id, attempt_number, outcome, status_code, duration_ms,
             provider_request_id, response_summary
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (outbox_id, attempt_number) DO NOTHING`,
          [
            job.id,
            job.attempt_count,
            outcome,
            result.statusCode || null,
            result.durationMs,
            result.requestId || null,
            result.summary || null,
          ],
        );
        await client.query(
          `UPDATE marketing_event_outbox
           SET status = $2,
               next_attempt_at = CASE
                 WHEN $2 = 'retry_scheduled'
                   THEN now() + make_interval(secs => $3::integer)
                 ELSE next_attempt_at
               END,
               delivered_at = CASE WHEN $2 = 'delivered' THEN now() ELSE NULL END,
               locked_at = NULL,
               last_error = $4,
               updated_at = now()
           WHERE id = $1`,
          [
            job.id,
            result.success
              ? 'delivered'
              : canRetry
                ? 'retry_scheduled'
                : 'failed_permanently',
            delaySeconds,
            result.summary || null,
          ],
        );
        this.metrics.recordWorkerJob(
          'tiktok-outbox',
          result.success ? 'completed' : canRetry ? 'retried' : 'failed',
        );
      }
    });

    // Raised only once the attempt row and the terminal status are committed,
    // and never allowed to throw. Inside the transaction a failed insert would
    // roll back the `failed_permanently` status with it, and the same event
    // would be retried forever — the notification about a stuck queue would be
    // the thing keeping it stuck. Same reasoning as the security audit writer.
    const permanentlyFailed =
      !result.success &&
      (!result.retryable ||
        jobs.every((job) => job.attempt_count >= MAX_ATTEMPTS));
    if (permanentlyFailed) {
      try {
        await this.communications.notifyPlatformOfTikTokFailure({
          businessId: jobs[0].business_id,
          destinationId: jobs[0].destination_id,
          pixelCode: jobs[0].pixel_id,
          statusCode: result.statusCode ?? null,
          summary: result.summary ?? null,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to notify platform administrators of a TikTok delivery failure: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
