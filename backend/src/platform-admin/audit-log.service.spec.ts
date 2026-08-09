import { mockArg } from '../common/test-utils';
import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  it('returns a typed paginated audit page with summary and facets', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'audit:42',
              record_kind: 'audit',
              actor_type: 'platform-admin',
              actor_id: '11111111-1111-1111-1111-111111111111',
              actor_label: 'Platform Operator',
              business_id: null,
              business_label: null,
              event_type: 'platform.business.create',
              outcome: 'success',
              resource_type: 'business',
              resource_id: '22222222-2222-2222-2222-222222222222',
              resource_label: 'Acme',
              request_id: 'request-42',
              ip_address: '203.0.113.10',
              user_agent: 'test-agent',
              metadata: { changedFields: ['name'] },
              http_method: null,
              request_path: null,
              status_code: null,
              duration_ms: null,
              source: null,
              created_at: new Date('2026-07-15T10:00:00.000Z'),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total: 1,
              successful: 1,
              failed: 0,
              denied: 0,
              last_24_hours: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ value: 'platform.business.create', count: 1 }],
        }),
    } as unknown as DatabaseService;
    const service = new AuditLogService(database);

    const result = await service.getPage({
      page: 1,
      pageSize: 25,
      search: 'Acme',
      actorType: 'platform-admin',
      outcome: 'failure',
      kind: 'request',
      source: 'frontend',
      httpMethod: 'GET',
      sort: 'failure-first',
    });

    expect(result.items[0]).toMatchObject({
      id: 'audit:42',
      kind: 'audit',
      actorLabel: 'Platform Operator',
      resourceLabel: 'Acme',
      outcome: 'success',
    });
    expect(result.summary).toEqual({
      total: 1,
      successful: 1,
      failed: 0,
      denied: 0,
      last24Hours: 1,
    });
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 25,
      totalItems: 1,
      totalPages: 1,
    });
    expect(result.eventTypes).toEqual([
      { value: 'platform.business.create', count: 1 },
    ]);
    expect(mockArg(database.query, 0, 1)).toEqual([
      '%Acme%',
      'platform-admin',
      'failure',
      'request',
      'frontend',
      'GET',
      25,
      0,
    ]);
    const itemQuery = mockArg(database.query, 0, 0);
    expect(itemQuery).toContain('u.outcome = $3');
    expect(itemQuery).toContain('u.record_kind = $4');
    expect(itemQuery).toContain('u.source = $5');
    expect(itemQuery).toContain('u.http_method = $6');
    expect(itemQuery).toContain(
      "CASE WHEN u.outcome = 'failure' THEN 0 ELSE 1 END",
    );
  });

  it('rejects invalid audit identifiers without querying the database', async () => {
    const database = { query: jest.fn() } as unknown as DatabaseService;
    const service = new AuditLogService(database);

    await expect(service.getOne('not-a-number')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(database.query).not.toHaveBeenCalled();
  });

  it('uses daily request rollups instead of recounting the complete telemetry table', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              total: '5000000',
              successful: '0',
              failed: '5000000',
              denied: '0',
              last_24_hours: '0',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total: '1200' }] })
        .mockResolvedValueOnce({ rows: [] }),
    } as unknown as DatabaseService;
    const service = new AuditLogService(database);

    const result = await service.getPage({
      page: 1,
      pageSize: 10,
      kind: 'request',
      source: 'backend',
      outcome: 'failure',
      sort: 'newest',
    });

    expect(result.summary).toEqual({
      total: 5000000,
      successful: 0,
      failed: 5000000,
      denied: 0,
      last24Hours: 1200,
    });
    expect(mockArg(database.query, 1, 0)).toContain(
      'http_request_event_daily_stats',
    );
    expect(mockArg(database.query, 2, 0)).toContain(
      "created_at >= NOW() - INTERVAL '24 hours'",
    );
    expect(mockArg(database.query, 1, 1)).toEqual(['backend', 'failure']);
  });
});
