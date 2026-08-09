import { ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';

describe('AccessRuleEnforcementService', () => {
  it('allows requests when no active rule matches', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const service = new AccessRuleEnforcementService({
      query,
    } as unknown as DatabaseService);

    await expect(
      service.assertAllowed('203.0.113.10', [{ scope: 'platform_admin' }]),
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('records and rejects the winning deny rule', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'rule-id', effect: 'deny' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const service = new AccessRuleEnforcementService({
      query,
    } as unknown as DatabaseService);

    await expect(
      service.assertAllowed('203.0.113.10', [
        { scope: 'business', businessId: 'business-id' },
        { scope: 'business_admin', businessId: 'business-id' },
      ]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('masklen(rule.ip_network) DESC'),
      expect.any(Array),
    );
    expect(query.mock.calls[1]).toEqual([
      expect.stringContaining('match_count=match_count+1'),
      ['rule-id'],
    ]);
  });

  it('treats a winning allow rule as a specific exception', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'allow-id', effect: 'allow' }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const service = new AccessRuleEnforcementService({
      query,
    } as unknown as DatabaseService);

    await expect(service.assertAllowed('192.0.2.100')).resolves.toBeUndefined();
  });

  it('does not pass an invalid address to PostgreSQL inet casts', async () => {
    const query = jest.fn();
    const service = new AccessRuleEnforcementService({
      query,
    } as unknown as DatabaseService);

    await expect(service.assertAllowed('unknown')).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });
});
