import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { UpdateDataRetentionDto } from './dto/platform-settings.dto';

type RetentionPolicy = UpdateDataRetentionDto & {
  batch_size: number;
  updated_at: string;
};

type DeletedCounts = {
  request_logs: number;
  api_history: number;
  communications: number;
};

@Injectable()
export class DataRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DataRetentionService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly database: DatabaseService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.runScheduledIfDue(), 15 * 60_000);
    this.timer.unref();
    setTimeout(() => void this.runScheduledIfDue(), 10_000).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async getStatus() {
    const policy = await this.getPolicy();
    const [eligibleResult, latestResult] = await Promise.all([
      this.database.query<{
        request_logs: string;
        api_history: string;
        communications: string;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM http_request_events WHERE created_at < now() - ($1::int * interval '1 day'))::text AS request_logs,
          ((SELECT COUNT(*) FROM api_usage_daily WHERE usage_date < current_date - $2::int)
           + (SELECT COUNT(*) FROM api_webhook_events event WHERE event.created_at < now() - ($2::int * interval '1 day')
              AND NOT EXISTS (SELECT 1 FROM api_webhook_deliveries delivery WHERE delivery.event_id=event.id AND delivery.status IN ('queued','processing','retrying')))
           + (SELECT COUNT(*) FROM api_linktree_schedules WHERE updated_at < now() - ($2::int * interval '1 day') AND status IN ('completed','failed','cancelled')))::text AS api_history,
          ((SELECT COUNT(*) FROM communication_notifications WHERE created_at < now() - ($3::int * interval '1 day') AND (read_at IS NOT NULL OR archived_at IS NOT NULL))
           + (SELECT COUNT(*) FROM communication_announcements WHERE updated_at < now() - ($3::int * interval '1 day') AND status IN ('expired','archived'))
           + (SELECT COUNT(*) FROM communication_conversations WHERE updated_at < now() - ($3::int * interval '1 day') AND status='archived'))::text AS communications`,
        [
          policy.request_log_days,
          policy.api_history_days,
          policy.communication_history_days,
        ],
      ),
      this.database.query(
        `SELECT id, trigger_type, status, deleted_counts, error_message, started_at, completed_at
         FROM platform_data_retention_runs ORDER BY started_at DESC LIMIT 1`,
      ),
    ]);
    const row = eligibleResult.rows[0];
    return {
      policy,
      eligible: {
        request_logs: Number(row?.request_logs || 0),
        api_history: Number(row?.api_history || 0),
        communications: Number(row?.communications || 0),
      },
      last_run: latestResult.rows[0] || null,
    };
  }

  async updatePolicy(adminId: string, dto: UpdateDataRetentionDto) {
    const result = await this.database.query<RetentionPolicy>(
      `UPDATE platform_data_retention_settings SET
         request_log_days=$1, api_history_days=$2,
         communication_history_days=$3, automatic_cleanup=$4,
         cleanup_hour_utc=$5, updated_by=$6, updated_at=now()
       WHERE id=1
       RETURNING request_log_days, api_history_days,
         communication_history_days, automatic_cleanup, cleanup_hour_utc,
         batch_size, updated_at`,
      [
        dto.request_log_days,
        dto.api_history_days,
        dto.communication_history_days,
        dto.automatic_cleanup,
        dto.cleanup_hour_utc,
        adminId,
      ],
    );
    return result.rows[0];
  }

  async runManual(adminId: string, confirmed: boolean) {
    if (!confirmed)
      throw new BadRequestException('Cleanup confirmation is required');
    return this.runCleanup('manual', adminId);
  }

  private async getPolicy(): Promise<RetentionPolicy> {
    const result = await this.database.query<RetentionPolicy>(
      `SELECT request_log_days, api_history_days,
              communication_history_days, automatic_cleanup, cleanup_hour_utc,
              batch_size, updated_at
       FROM platform_data_retention_settings WHERE id=1`,
    );
    if (!result.rows[0])
      throw new Error('Data retention policy is not provisioned');
    return result.rows[0];
  }

  private async runScheduledIfDue(): Promise<void> {
    try {
      const policy = await this.getPolicy();
      if (
        !policy.automatic_cleanup ||
        new Date().getUTCHours() < policy.cleanup_hour_utc
      )
        return;
      const ranToday = await this.database.query(
        `SELECT 1 FROM platform_data_retention_runs
         WHERE trigger_type='scheduled' AND status='completed'
           AND started_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
         LIMIT 1`,
      );
      if (!ranToday.rows.length) await this.runCleanup('scheduled', null);
    } catch (error) {
      this.logger.error('Scheduled data retention failed', error);
    }
  }

  private async runCleanup(
    trigger: 'manual' | 'scheduled',
    adminId: string | null,
  ) {
    const policy = await this.getPolicy();
    await this.database.query(
      `UPDATE platform_data_retention_runs SET status='failed', completed_at=now(),
         error_message='Cleanup worker stopped before completion'
       WHERE status='running' AND started_at < now() - interval '2 hours'`,
    );
    let runId: string;
    try {
      const run = await this.database.query<{ id: string }>(
        `INSERT INTO platform_data_retention_runs(trigger_type, policy_snapshot, triggered_by)
         VALUES($1,$2::jsonb,$3) RETURNING id`,
        [trigger, JSON.stringify(policy), adminId],
      );
      runId = run.rows[0].id;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A data cleanup is already running');
      }
      throw error;
    }

    const counts: DeletedCounts = {
      request_logs: 0,
      api_history: 0,
      communications: 0,
    };
    try {
      counts.request_logs = await this.deleteRequestLogs(
        policy.request_log_days,
        policy.batch_size,
      );
      counts.api_history += await this.deleteSimple(
        `DELETE FROM api_usage_daily WHERE (usage_date,client_id) IN (
           SELECT usage_date,client_id FROM api_usage_daily WHERE usage_date < current_date - $1::int
           ORDER BY usage_date LIMIT $2 FOR UPDATE SKIP LOCKED)`,
        policy.api_history_days,
        policy.batch_size,
      );
      counts.api_history += await this.deleteSimple(
        `DELETE FROM api_webhook_events event WHERE id IN (
           SELECT candidate.id FROM api_webhook_events candidate
           WHERE candidate.created_at < now() - ($1::int * interval '1 day')
             AND NOT EXISTS (SELECT 1 FROM api_webhook_deliveries delivery WHERE delivery.event_id=candidate.id AND delivery.status IN ('queued','processing','retrying'))
           ORDER BY candidate.created_at LIMIT $2 FOR UPDATE SKIP LOCKED)`,
        policy.api_history_days,
        policy.batch_size,
      );
      counts.api_history += await this.deleteSimple(
        `DELETE FROM api_linktree_schedules WHERE id IN (
           SELECT id FROM api_linktree_schedules WHERE updated_at < now() - ($1::int * interval '1 day')
             AND status IN ('completed','failed','cancelled') ORDER BY updated_at LIMIT $2 FOR UPDATE SKIP LOCKED)`,
        policy.api_history_days,
        policy.batch_size,
      );
      counts.communications += await this.deleteSimple(
        `DELETE FROM communication_notifications WHERE id IN (
           SELECT id FROM communication_notifications WHERE created_at < now() - ($1::int * interval '1 day')
             AND (read_at IS NOT NULL OR archived_at IS NOT NULL) ORDER BY created_at LIMIT $2 FOR UPDATE SKIP LOCKED)`,
        policy.communication_history_days,
        policy.batch_size,
      );
      counts.communications += await this.deleteSimple(
        `DELETE FROM communication_announcements WHERE id IN (
           SELECT id FROM communication_announcements WHERE updated_at < now() - ($1::int * interval '1 day')
             AND status IN ('expired','archived') ORDER BY updated_at LIMIT $2 FOR UPDATE SKIP LOCKED)`,
        policy.communication_history_days,
        policy.batch_size,
      );
      counts.communications += await this.deleteSimple(
        `DELETE FROM communication_conversations WHERE id IN (
           SELECT id FROM communication_conversations WHERE updated_at < now() - ($1::int * interval '1 day')
             AND status='archived' ORDER BY updated_at LIMIT $2 FOR UPDATE SKIP LOCKED)`,
        policy.communication_history_days,
        policy.batch_size,
      );
      await this.database.query(
        `UPDATE platform_data_retention_runs SET status='completed', deleted_counts=$2::jsonb, completed_at=now() WHERE id=$1`,
        [runId, JSON.stringify(counts)],
      );
      return { run_id: runId, deleted_counts: counts };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Cleanup failed';
      await this.database.query(
        `UPDATE platform_data_retention_runs SET status='failed', deleted_counts=$2::jsonb, error_message=$3, completed_at=now() WHERE id=$1`,
        [runId, JSON.stringify(counts), message],
      );
      throw error;
    }
  }

  private async deleteSimple(
    sql: string,
    days: number,
    batchSize: number,
  ): Promise<number> {
    let total = 0;
    for (;;) {
      const result = await this.database.query(sql, [days, batchSize]);
      total += result.rowCount || 0;
      if ((result.rowCount || 0) < batchSize) return total;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  private async deleteRequestLogs(
    days: number,
    batchSize: number,
  ): Promise<number> {
    let total = 0;
    for (;;) {
      const result = await this.database.query<{ deleted: number }>(
        `WITH expired AS (
           SELECT id FROM http_request_events WHERE created_at < now() - ($1::int * interval '1 day')
           ORDER BY created_at,id LIMIT $2 FOR UPDATE SKIP LOCKED
         ), deleted AS (
           DELETE FROM http_request_events target USING expired WHERE target.id=expired.id
           RETURNING target.created_at::date event_day,target.source,target.method,target.actor_type,
             CASE WHEN target.status_code IN (401,403) THEN 'denied' WHEN target.status_code>=400 THEN 'failure' ELSE 'success' END outcome
         ), decrements AS (
           SELECT event_day,source,method,actor_type,outcome,count(*)::bigint total FROM deleted GROUP BY 1,2,3,4,5
         ), adjusted AS (
           UPDATE http_request_event_daily_stats stats SET total=greatest(0,stats.total-decrements.total)
           FROM decrements WHERE stats.event_day=decrements.event_day AND stats.source=decrements.source
             AND stats.method=decrements.method AND stats.actor_type=decrements.actor_type AND stats.outcome=decrements.outcome
           RETURNING stats.total
         ) SELECT count(*)::int deleted FROM deleted`,
        [days, batchSize],
      );
      const deleted = Number(result.rows[0]?.deleted || 0);
      total += deleted;
      if (deleted < batchSize) break;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    await this.database.query(
      'DELETE FROM http_request_event_daily_stats WHERE total=0',
    );
    return total;
  }
}
