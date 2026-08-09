import { HealthService } from './health.service';

describe('HealthService', () => {
  const database = { query: jest.fn() };
  const redis = { ping: jest.fn() };
  const storage = { checkHealth: jest.fn() };
  const metrics = { workerHealth: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    database.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    redis.ping.mockResolvedValue(undefined);
    storage.checkHealth.mockResolvedValue(undefined);
    metrics.workerHealth.mockReturnValue({ status: 'up', workers: {} });
  });

  it('is ready only when dependencies and workers are healthy', async () => {
    const service = new HealthService(
      database as never,
      redis as never,
      storage as never,
      metrics as never,
    );

    await expect(service.readiness()).resolves.toMatchObject({
      status: 'ready',
      components: {
        database: { status: 'up' },
        redis: { status: 'up' },
        storage: { status: 'up' },
        workers: { status: 'up' },
      },
    });
  });

  it('returns not ready without leaking dependency errors', async () => {
    database.query.mockRejectedValue(new Error('contains credentials'));
    const service = new HealthService(
      database as never,
      redis as never,
      storage as never,
      metrics as never,
    );

    const result = await service.readiness();

    expect(result.status).toBe('not_ready');
    expect(JSON.stringify(result)).not.toContain('credentials');
  });
});
