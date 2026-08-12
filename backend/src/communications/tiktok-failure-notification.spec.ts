import { DatabaseService } from '../database/database.service';
import { CommunicationService } from './communication.service';

function createService(businessName = 'Ismail Store') {
  const query = jest
    .fn()
    .mockResolvedValueOnce({ rows: [{ name: businessName }] })
    .mockResolvedValue({ rows: [] });
  const database = { query } as unknown as DatabaseService;
  const service = new CommunicationService(database, {} as never, {} as never);
  return { service, query };
}

describe('CommunicationService.notifyPlatformOfTikTokFailure', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reaches every platform administrator with the failing pixel named', async () => {
    const { service, query } = createService();

    await service.notifyPlatformOfTikTokFailure({
      businessId: 'business-id',
      destinationId: 'destination-id',
      pixelCode: 'PIXEL123',
      statusCode: 401,
      summary: 'Invalid access token',
    });

    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain('FROM platform_admins admin');
    expect(sql).toContain("'platform-admin'");
    expect(params[0]).toBe('TikTok delivery failing: Ismail Store');
    expect(params[1]).toContain('PIXEL123');
    expect(params[1]).toContain('HTTP 401');
    expect(params[1]).toContain('Invalid access token');
    expect(params[2]).toBe('destination-id');
  });

  it('throttles per pixel so one bad token is not one notification per event', async () => {
    const { service, query } = createService();

    await service.notifyPlatformOfTikTokFailure({
      businessId: 'business-id',
      destinationId: 'destination-id',
      pixelCode: 'PIXEL123',
    });

    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    // Scoped to the destination, not the business: a business running three
    // pixels still learns which one broke.
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain("existing.kind = 'tiktok_delivery_failure'");
    expect(sql).toContain('existing.source_id = $3::uuid');
    expect(sql).toContain('existing.platform_admin_id = admin.id');
    expect(params[3]).toBe(6);
  });

  it('stores operational content in the plain columns, not as ciphertext', async () => {
    const { service, query } = createService();

    await service.notifyPlatformOfTikTokFailure({
      businessId: 'business-id',
      destinationId: 'destination-id',
      pixelCode: 'PIXEL123',
    });

    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    // A delivery failure is operational, not private correspondence, and
    // `decryptContent` returns the plain columns when no ciphertext is set.
    expect(sql).not.toContain('encrypted_content');
    expect(params[0]).not.toBe('[encrypted]');
    expect(params[1]).toContain('No detail returned');
  });

  it('names an unknown business rather than failing', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const service = new CommunicationService(
      { query } as unknown as DatabaseService,
      {} as never,
      {} as never,
    );

    await service.notifyPlatformOfTikTokFailure({
      businessId: 'business-id',
      destinationId: 'destination-id',
      pixelCode: 'PIXEL123',
    });

    const [, params] = query.mock.calls[1] as [string, unknown[]];
    expect(params[0]).toBe('TikTok delivery failing: Unknown business');
  });
});
