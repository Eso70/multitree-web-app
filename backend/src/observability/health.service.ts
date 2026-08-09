import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { OperationalMetricsService } from './operational-metrics.service';

type ComponentStatus = { status: 'up' | 'down'; latencyMs: number };

@Injectable()
export class HealthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  async readiness() {
    const [database, redis, storage] = await Promise.all([
      this.check(() => this.database.query('SELECT 1')),
      this.check(() => this.redis.ping()),
      this.check(() => this.storage.checkHealth()),
    ]);
    const workers = this.metrics.workerHealth();
    const status =
      database.status === 'up' &&
      redis.status === 'up' &&
      storage.status === 'up' &&
      workers.status === 'up'
        ? 'ready'
        : 'not_ready';
    return {
      status,
      checkedAt: new Date().toISOString(),
      components: { database, redis, storage, workers },
    } as const;
  }

  private async check(
    operation: () => Promise<unknown>,
  ): Promise<ComponentStatus> {
    const startedAt = Date.now();
    try {
      await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timed out')), 2000),
        ),
      ]);
      return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch {
      return { status: 'down', latencyMs: Date.now() - startedAt };
    }
  }
}
