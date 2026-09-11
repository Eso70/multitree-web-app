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
      this.database.query<{ communications: string }>(
        `SELECT ((SELECT COUNT(*) FROM communication_notifications WHERE created_at < now() - ($1::int * interval '1 day') AND (read_at IS NOT NULL OR archived_at IS NOT NULL))
           + (SELECT COUNT(*) FROM communication_announcements WHERE updated_at < now() - ($1::int * interval '1 day') AND status IN ('expired','archived'))
           + (SELECT COUNT(*) FROM communication_conversations WHERE updated_at < now() - ($1::int * interval '1 day') AND status='archived'))::text AS communications`,
        [policy.communication_history_days],
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
        communications: Number(row?.communications || 0),
      },
      last_run: latestResult.rows[0] || null,
    };
  }

  async updatePolicy(adminId: string, dto: UpdateDataRetentionDto) {
    const result = await this.database.query<RetentionPolicy>(
      `UPDATE platform_data_retention_settings SET
         communication_history_days=$1,
         automatic_cleanup=$2, cleanup_hour_utc=$3,
         updated_by=$4, updated_at=now()
       WHERE id=1
       RETURNING communication_history_days, automatic_cleanup, cleanup_hour_utc,
         batch_size, updated_at`,
      [
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
      `SELECT communication_history_days, automatic_cleanup, cleanup_hour_utc,
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
      communications: 0,
    };
    try {
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
}
