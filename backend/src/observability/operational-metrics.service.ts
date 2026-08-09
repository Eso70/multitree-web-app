import { Injectable } from '@nestjs/common';

const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500, 5000] as const;

type WorkerMetric = {
  maxSilenceMs: number;
  registeredAt: number;
  lastCompletedAt: number | null;
  lastDurationMs: number | null;
  lastErrorAt: number | null;
  completed: number;
  failed: number;
  jobsCompleted: number;
  jobsFailed: number;
  jobsRetried: number;
};

@Injectable()
export class OperationalMetricsService {
  private readonly startedAt = Date.now();
  private readonly latencyBuckets = new Map<number, number>(
    LATENCY_BUCKETS_MS.map((bucket) => [bucket, 0]),
  );
  private readonly statusCounts = new Map<string, number>();
  private readonly workers = new Map<string, WorkerMetric>();
  private requestCount = 0;
  private errorCount = 0;
  private totalDurationMs = 0;

  recordHttpRequest(statusCode: number, durationMs: number): void {
    this.requestCount += 1;
    this.totalDurationMs += durationMs;
    if (statusCode >= 500) this.errorCount += 1;
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    this.statusCounts.set(
      statusClass,
      (this.statusCounts.get(statusClass) || 0) + 1,
    );
    for (const bucket of LATENCY_BUCKETS_MS) {
      if (durationMs <= bucket) {
        this.latencyBuckets.set(
          bucket,
          (this.latencyBuckets.get(bucket) || 0) + 1,
        );
      }
    }
  }

  registerWorker(name: string, maxSilenceMs: number): void {
    if (this.workers.has(name)) return;
    this.workers.set(name, {
      maxSilenceMs,
      registeredAt: Date.now(),
      lastCompletedAt: null,
      lastDurationMs: null,
      lastErrorAt: null,
      completed: 0,
      failed: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
      jobsRetried: 0,
    });
  }

  recordWorkerJob(
    name: string,
    outcome: 'completed' | 'failed' | 'retried',
  ): void {
    const worker = this.workers.get(name);
    if (!worker) return;
    if (outcome === 'completed') worker.jobsCompleted += 1;
    if (outcome === 'failed') worker.jobsFailed += 1;
    if (outcome === 'retried') worker.jobsRetried += 1;
  }

  recordWorkerRun(name: string, startedAt: number, succeeded: boolean): void {
    const worker = this.workers.get(name);
    if (!worker) return;
    const now = Date.now();
    worker.lastCompletedAt = now;
    worker.lastDurationMs = Math.max(0, now - startedAt);
    if (succeeded) {
      worker.completed += 1;
      worker.lastErrorAt = null;
    } else {
      worker.failed += 1;
      worker.lastErrorAt = now;
    }
  }

  workerHealth(now = Date.now()): {
    status: 'up' | 'down';
    workers: Record<
      string,
      { status: 'up' | 'down' | 'starting'; lastRunAt: string | null }
    >;
  } {
    let allUp = true;
    const workers: Record<
      string,
      { status: 'up' | 'down' | 'starting'; lastRunAt: string | null }
    > = {};
    for (const [name, worker] of this.workers) {
      const reference = worker.lastCompletedAt || worker.registeredAt;
      const stale = now - reference > worker.maxSilenceMs;
      const failed = worker.lastErrorAt !== null;
      const status =
        stale || failed ? 'down' : worker.lastCompletedAt ? 'up' : 'starting';
      if (status === 'down') allUp = false;
      workers[name] = {
        status,
        lastRunAt: worker.lastCompletedAt
          ? new Date(worker.lastCompletedAt).toISOString()
          : null,
      };
    }
    return { status: allUp ? 'up' : 'down', workers };
  }

  snapshot() {
    return {
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      http: {
        requests: this.requestCount,
        errors: this.errorCount,
        errorRate: this.requestCount ? this.errorCount / this.requestCount : 0,
        averageDurationMs: this.requestCount
          ? Math.round((this.totalDurationMs / this.requestCount) * 100) / 100
          : 0,
        statusCounts: Object.fromEntries(this.statusCounts),
        latencyBucketsMs: Object.fromEntries(this.latencyBuckets),
      },
      workers: Object.fromEntries(
        [...this.workers].map(([name, worker]) => [
          name,
          {
            completed: worker.completed,
            failed: worker.failed,
            jobsCompleted: worker.jobsCompleted,
            jobsFailed: worker.jobsFailed,
            jobsRetried: worker.jobsRetried,
            lastDurationMs: worker.lastDurationMs,
            lastCompletedAt: worker.lastCompletedAt
              ? new Date(worker.lastCompletedAt).toISOString()
              : null,
          },
        ]),
      ),
    };
  }
}
