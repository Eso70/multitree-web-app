import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { DatabaseService } from '../database/database.service';
import type { PoolClient } from 'pg';
import { RedisService } from '../redis/redis.service';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import { validateWebhookUrl } from './webhook-security';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

interface DeliveryJob {
  id: string;
  endpoint_id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  encrypted_url: Buffer;
  encrypted_signing_secret: Buffer;
  attempt_count: number;
}

@Injectable()
export class WebhookDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly crypto: SecretCryptoService,
    private readonly redis: RedisService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  onModuleInit() {
    this.metrics.registerWorker('webhook-delivery', 30_000);
    this.timer = setInterval(() => void this.tick(), 5000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async emit(
    businessId: string,
    eventType: string,
    resourceType: string | null,
    resourceId: string | null,
    data: Record<string, unknown>,
  ): Promise<string> {
    return this.database.transaction((client) =>
      this.emitWithClient(
        client,
        businessId,
        eventType,
        resourceType,
        resourceId,
        data,
      ),
    );
  }

  async emitWithClient(
    client: PoolClient,
    businessId: string,
    eventType: string,
    resourceType: string | null,
    resourceId: string | null,
    data: Record<string, unknown>,
  ): Promise<string> {
    const event = await client.query<{ id: string; occurred_at: string }>(
      `INSERT INTO api_webhook_events(business_id,event_type,resource_type,resource_id,payload)
         VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id::text,occurred_at::text`,
      [businessId, eventType, resourceType, resourceId, JSON.stringify(data)],
    );
    const eventId = event.rows[0].id;
    await client.query(
      `INSERT INTO api_webhook_deliveries(endpoint_id,event_id)
         SELECT endpoint.id,$1::uuid
         FROM api_webhook_endpoints endpoint
         JOIN api_webhook_subscriptions subscription ON subscription.endpoint_id=endpoint.id
         WHERE endpoint.business_id=$2::uuid AND endpoint.status='active'
           AND subscription.event_type=$3
         ON CONFLICT(endpoint_id,event_id) DO NOTHING`,
      [eventId, businessId, eventType],
    );
    return eventId;
  }

  async enqueueTest(endpointId: string): Promise<string> {
    return this.database.transaction(async (client) => {
      const endpoint = await client.query<{ business_id: string }>(
        'SELECT business_id::text FROM api_webhook_endpoints WHERE id=$1::uuid',
        [endpointId],
      );
      if (!endpoint.rows[0]) throw new Error('Webhook endpoint not found');
      const event = await client.query<{ id: string }>(
        `INSERT INTO api_webhook_events(business_id,event_type,resource_type,payload)
         VALUES($1,'webhook.test','webhook',$2::jsonb) RETURNING id::text`,
        [
          endpoint.rows[0].business_id,
          JSON.stringify({ message: 'MultiTree webhook test' }),
        ],
      );
      await client.query(
        `INSERT INTO api_webhook_deliveries(endpoint_id,event_id)
         VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,
        [endpointId, event.rows[0].id],
      );
      return event.rows[0].id;
    });
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    const startedAt = Date.now();
    let succeeded = false;
    try {
      await this.processSchedules();
      const jobs = await this.claimJobs(25);
      await Promise.allSettled(jobs.map((job) => this.deliver(job)));
      if (Math.random() < 0.01) await this.cleanup();
      succeeded = true;
    } catch (error) {
      this.logger.error('Webhook worker tick failed', error);
    } finally {
      this.metrics.recordWorkerRun('webhook-delivery', startedAt, succeeded);
      this.running = false;
    }
  }

  private async claimJobs(limit: number): Promise<DeliveryJob[]> {
    return this.database.transaction(async (client) => {
      const result = await client.query<DeliveryJob>(
        `WITH claimed AS (
           SELECT delivery.id
           FROM api_webhook_deliveries delivery
           WHERE (delivery.status IN ('queued','retrying') AND delivery.next_attempt_at <= now())
              OR (delivery.status='processing' AND delivery.updated_at < now()-interval '2 minutes')
           ORDER BY delivery.next_attempt_at, delivery.created_at
           FOR UPDATE SKIP LOCKED LIMIT $1
         )
         UPDATE api_webhook_deliveries delivery
         SET status='processing',updated_at=now()
         FROM claimed, api_webhook_endpoints endpoint, api_webhook_events event
         WHERE delivery.id=claimed.id AND endpoint.id=delivery.endpoint_id
           AND event.id=delivery.event_id
         RETURNING delivery.id::text,delivery.endpoint_id::text,delivery.event_id::text,
           event.event_type,event.payload,event.occurred_at::text,
           endpoint.encrypted_url,endpoint.encrypted_signing_secret,
           delivery.attempt_count`,
        [limit],
      );
      return result.rows;
    });
  }

  private async deliver(job: DeliveryJob) {
    const attempt = Number(job.attempt_count) + 1;
    const url = this.crypto.decryptText(job.encrypted_url);
    const secret = this.crypto.decryptText(job.encrypted_signing_secret);
    const body = JSON.stringify({
      id: job.event_id,
      type: job.event_type,
      occurredAt: job.occurred_at,
      data: job.payload,
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    const started = Date.now();
    let responseStatus: number | null = null;
    let errorMessage: string | null = null;
    try {
      await validateWebhookUrl(url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'MultiTree-Webhooks/1.0',
          'x-multitree-event': job.event_type,
          'x-multitree-delivery': job.id,
          'x-multitree-timestamp': timestamp,
          'x-multitree-signature': `v1=${signature}`,
        },
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      responseStatus = response.status;
      if (!response.ok) errorMessage = `HTTP ${response.status}`;
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message.slice(0, 500)
          : 'Delivery failed';
    }
    const succeeded =
      responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
    const maxAttempts = 6;
    const retryDelays = [60, 300, 1800, 7200, 21600, 43200];
    await this.database.transaction(async (client) => {
      await client.query(
        `INSERT INTO api_webhook_delivery_attempts
           (delivery_id,attempt_number,response_status,duration_ms,error_message)
         VALUES($1,$2,$3,$4,$5) ON CONFLICT(delivery_id,attempt_number) DO NOTHING`,
        [job.id, attempt, responseStatus, Date.now() - started, errorMessage],
      );
      await client.query(
        `UPDATE api_webhook_deliveries SET
           status=$2,attempt_count=$3,last_response_status=$4,last_error=$5,
           next_attempt_at=CASE WHEN $2='retrying' THEN now()+($6::int*interval '1 second') ELSE next_attempt_at END,
           delivered_at=CASE WHEN $2='delivered' THEN now() ELSE delivered_at END,updated_at=now()
         WHERE id=$1`,
        [
          job.id,
          succeeded
            ? 'delivered'
            : attempt >= maxAttempts
              ? 'failed'
              : 'retrying',
          attempt,
          responseStatus,
          errorMessage,
          retryDelays[Math.min(attempt - 1, retryDelays.length - 1)],
        ],
      );
      await client.query(
        `UPDATE api_webhook_endpoints SET
           last_delivery_at=now(),
           last_success_at=CASE WHEN $2 THEN now() ELSE last_success_at END,
           consecutive_failures=CASE WHEN $2 THEN 0 ELSE consecutive_failures+1 END,
           status=CASE WHEN NOT $2 AND consecutive_failures+1 >= 20 THEN 'disabled' ELSE status END,
           updated_at=now() WHERE id=$1`,
        [job.endpoint_id, succeeded],
      );
    });
    this.metrics.recordWorkerJob(
      'webhook-delivery',
      succeeded ? 'completed' : attempt >= maxAttempts ? 'failed' : 'retried',
    );
  }

  private async processSchedules() {
    const rows = await this.database.transaction(async (client) => {
      const claimed = await client.query<{
        id: string;
        business_id: string;
        linktree_id: string;
        action: string;
        uid: string;
        seo_name: string | null;
        subdomain: string;
      }>(
        `WITH due AS (
           SELECT schedule.id FROM api_linktree_schedules schedule
           WHERE (schedule.status='scheduled' AND schedule.execute_at<=now())
              OR (schedule.status='processing' AND schedule.updated_at<now()-interval '2 minutes')
           ORDER BY schedule.execute_at FOR UPDATE SKIP LOCKED LIMIT 25
         )
         UPDATE api_linktree_schedules schedule SET status='processing',updated_at=now()
         FROM due,linktrees linktree,businesses business
         WHERE schedule.id=due.id AND linktree.id=schedule.linktree_id AND business.id=schedule.business_id
         RETURNING schedule.id::text,schedule.business_id::text,schedule.linktree_id::text,
           schedule.action,linktree.uid,linktree.seo_name,business.subdomain`,
      );
      return claimed.rows;
    });
    for (const row of rows) {
      try {
        await this.database.query(
          `UPDATE linktrees SET status=$2,updated_at=now() WHERE id=$1 AND business_id=$3`,
          [
            row.linktree_id,
            row.action === 'publish' ? 'active' : 'inactive',
            row.business_id,
          ],
        );
        await this.database.query(
          `UPDATE api_linktree_schedules SET status='completed',processed_at=now(),updated_at=now() WHERE id=$1`,
          [row.id],
        );
        const keys = [`cache:linktree:uid:${row.uid}`, `cache:linktree:uid:id`];
        if (row.seo_name) {
          keys.push(`cache:linktree:uid:${row.seo_name}`);
        }
        const sub = row.subdomain?.toLowerCase();
        if (sub) {
          keys.push(`cache:linktree:uid:${row.uid}:sub:${sub}`);
          keys.push(`cache:linktree:uid:id:sub:${sub}`);
          if (row.seo_name) {
            keys.push(`cache:linktree:uid:${row.seo_name}:sub:${sub}`);
          }
        }
        await Promise.all(keys.map((k) => this.redis.del(k)));
        await this.emit(
          row.business_id,
          `linktree.${row.action === 'publish' ? 'published' : 'unpublished'}`,
          'linktree',
          row.linktree_id,
          { linktreeId: row.linktree_id },
        );
      } catch (error) {
        await this.database.query(
          `UPDATE api_linktree_schedules SET status='failed',processed_at=now(),error_message=$2,updated_at=now() WHERE id=$1`,
          [
            row.id,
            error instanceof Error
              ? error.message.slice(0, 500)
              : 'Schedule failed',
          ],
        );
      }
    }
  }

  private async cleanup() {
    await this.database.query(
      `DELETE FROM api_idempotency_keys WHERE expires_at<now()`,
    );
  }
}
