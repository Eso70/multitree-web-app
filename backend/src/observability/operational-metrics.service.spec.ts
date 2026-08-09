import { OperationalMetricsService } from './operational-metrics.service';

describe('OperationalMetricsService', () => {
  it('keeps bounded request counters and latency buckets', () => {
    const service = new OperationalMetricsService();

    service.recordHttpRequest(200, 40);
    service.recordHttpRequest(503, 300);

    expect(service.snapshot().http).toMatchObject({
      requests: 2,
      errors: 1,
      errorRate: 0.5,
      averageDurationMs: 170,
      statusCounts: { '2xx': 1, '5xx': 1 },
      latencyBucketsMs: {
        '50': 1,
        '100': 1,
        '250': 1,
        '500': 2,
        '1000': 2,
        '2500': 2,
        '5000': 2,
      },
    });
  });

  it('reports failed and stale workers as down', () => {
    const service = new OperationalMetricsService();
    service.registerWorker('worker', 100);
    const startedAt = Date.now();

    service.recordWorkerRun('worker', startedAt, false);
    expect(service.workerHealth().status).toBe('down');

    service.recordWorkerRun('worker', startedAt, true);
    service.recordWorkerJob('worker', 'completed');
    service.recordWorkerJob('worker', 'retried');
    expect(service.workerHealth().status).toBe('up');
    expect(service.snapshot().workers.worker).toMatchObject({
      jobsCompleted: 1,
      jobsRetried: 1,
      jobsFailed: 0,
    });
    expect(service.workerHealth(Date.now() + 101).status).toBe('down');
  });
});
