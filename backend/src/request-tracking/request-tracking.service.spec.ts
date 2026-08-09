import { mockArg, mockCalls } from '../common/test-utils';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { RequestTrackingService } from './request-tracking.service';

describe('RequestTrackingService', () => {
  const config = {
    get: jest.fn((_key: string, fallback: unknown) => fallback),
  } as unknown as ConfigService;

  it('records request metadata without query values or request bodies', async () => {
    const query = jest
      .fn<Promise<{ rows: never[] }>, [string, (unknown[] | undefined)?]>()
      .mockResolvedValue({ rows: [] });
    const database = { query };
    const service = new RequestTrackingService(
      database as unknown as DatabaseService,
      config,
    );
    const request = {
      id: 'req-1',
      method: 'POST',
      url: '/api/business/settings?token=private',
      ip: '127.0.0.1',
      routeOptions: { url: '/api/business/settings' },
      headers: { 'user-agent': 'test-agent' },
      body: { password: 'must-not-be-recorded' },
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'acme',
        name: 'Acme',
        role: 'business' as const,
      },
      trackingStartedAt: Date.now() - 20,
    };

    await service.recordBackendRequest(request, { statusCode: 200 });
    await service.onModuleDestroy();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('jsonb_to_recordset'),
      [expect.any(String)],
    );
    const batch = JSON.parse(
      String(mockArg<unknown[]>(query, 0, 1)?.[0]),
    ) as Array<Record<string, unknown>>;
    expect(batch).toEqual([
      expect.objectContaining({
        requestId: 'req-1',
        source: 'backend',
        method: 'POST',
        requestPath: '/api/business/settings',
        routePattern: '/api/business/settings',
        statusCode: 200,
        // @types/jest declares expect.any as `any`.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        durationMs: expect.any(Number),
        actorType: 'business',
        actorId: '11111111-1111-1111-1111-111111111111',
        actorLabel: 'Acme',
        businessId: '11111111-1111-1111-1111-111111111111',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }),
    ]);
  });

  it('does not recursively track the frontend ingestion endpoint', async () => {
    const database = { query: jest.fn() };
    const service = new RequestTrackingService(
      database as unknown as DatabaseService,
      config,
    );

    await service.recordBackendRequest(
      {
        id: 'req-2',
        method: 'POST',
        url: '/api/internal/request-events',
        headers: {},
      },
      { statusCode: 202 },
    );

    expect(database.query).not.toHaveBeenCalled();
  });

  it('never fails the website request when telemetry storage is unavailable', async () => {
    const database = {
      query: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const service = new RequestTrackingService(
      database as unknown as DatabaseService,
      config,
    );

    await expect(
      service.recordFrontendRequest({ method: 'GET', path: '/welcome?x=1' }),
    ).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('deletes expired telemetry in bounded skip-locked batches', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ request_log_days: 30 }] })
      .mockResolvedValueOnce({ rows: [{ deleted: 25 }] })
      .mockResolvedValueOnce({ rows: [] });
    const cleanupConfig = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'REQUEST_LOG_CLEANUP_BATCH_SIZE' ? 1000 : fallback,
      ),
    } as unknown as ConfigService;
    const service = new RequestTrackingService(
      { query } as unknown as DatabaseService,
      cleanupConfig,
    );

    await (
      service as unknown as { cleanupExpired(): Promise<void> }
    ).cleanupExpired();

    const calls = mockCalls<[string, unknown[]?]>(query);
    const cleanupCall = calls.find(([sql]) =>
      String(sql).includes('FOR UPDATE SKIP LOCKED'),
    );
    const emptyStatsCall = calls.find(([sql]) =>
      String(sql).includes('total = 0'),
    );

    expect(cleanupCall?.[1]).toEqual([30, 1000]);
    expect(emptyStatsCall).toBeDefined();
  });
});
