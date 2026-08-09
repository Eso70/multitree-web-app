import { DatabaseService } from '../database/database.service';
import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  it('persists a normalized security event', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    } as unknown as DatabaseService;
    const service = new SecurityAuditService(database);

    await service.record({
      actorType: 'business',
      actorId: '11111111-1111-1111-1111-111111111111',
      businessId: '11111111-1111-1111-1111-111111111111',
      eventType: 'business.login',
      outcome: 'success',
      ipAddress: '203.0.113.5, 10.0.0.1',
      userAgent: 'test-agent',
      metadata: { requestedSubdomain: 'shop' },
    });

    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO security_audit_events'),
      expect.arrayContaining([
        'business',
        '11111111-1111-1111-1111-111111111111',
        'business.login',
        'success',
        '203.0.113.5',
      ]),
    );
  });

  it('does not fail authentication when audit storage is unavailable', async () => {
    const database = {
      query: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as DatabaseService;
    const service = new SecurityAuditService(database);

    await expect(
      service.record({
        actorType: 'anonymous',
        eventType: 'business.login',
        outcome: 'failure',
        ipAddress: 'unknown',
      }),
    ).resolves.toBeUndefined();
  });
});
