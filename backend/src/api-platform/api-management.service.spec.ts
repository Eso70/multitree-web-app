import { ConfigService } from '@nestjs/config';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import { EntitlementService } from '../billing/entitlement.service';
import { CommunicationService } from '../communications/communication.service';
import { DatabaseService } from '../database/database.service';
import { ApiManagementService } from './api-management.service';
import { WebhookDeliveryService } from './webhook-delivery.service';

describe('ApiManagementService dashboard', () => {
  it('uses fixed-count aggregate queries instead of per-business lookups', async () => {
    const query = jest.fn((sql: string) => {
      if (sql.includes('FROM api_clients WHERE')) {
        return Promise.resolve({
          rows: [
            {
              active: 0,
              expiring: 0,
              expiringKeysPercent: 0,
              ipRestrictedPercent: 0,
              rotatedPercent: 0,
            },
          ],
        });
      }
      if (sql.includes('FROM api_webhook_endpoints')) {
        return Promise.resolve({ rows: [{ attention: 0, signedPercent: 0 }] });
      }
      if (sql.includes('AS "nearQuota"')) {
        return Promise.resolve({ rows: [{ nearQuota: 0 }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const entitlements = {
      getEffective: jest.fn(),
    } as unknown as EntitlementService;
    const service = new ApiManagementService(
      { query } as unknown as DatabaseService,
      entitlements,
      { decryptText: jest.fn() } as unknown as SecretCryptoService,
      {} as WebhookDeliveryService,
      {} as CommunicationService,
      {
        get: jest.fn((_key: string, fallback?: string) => fallback),
      } as unknown as ConfigService,
    );

    await service.getDashboard({
      page: 1,
      limit: 20,
      section: 'overview',
    });

    expect(query).toHaveBeenCalledTimes(6);
    expect(entitlements.getEffective).not.toHaveBeenCalled();
    expect(
      query.mock.calls.some(([sql]) => sql.includes('monthly_usage')),
    ).toBe(true);
  });
});
