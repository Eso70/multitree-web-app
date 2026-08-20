import * as fc from 'fast-check';
import { GoneException, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';

/**
 * Property 12: Unregistered Subdomain Returns 404
 * **Validates: Requirements 8.4**
 *
 * For any subdomain not in the businesses table, all routes return 404.
 * We test at the service level: for any randomly generated subdomain S
 * that is NOT in the mock database, the PublicService should throw NotFoundException.
 */
describe('PublicService - Property Tests', () => {
  // Custom arbitrary for valid subdomain format: lowercase alphanumeric + hyphens, 1-50 chars
  const subdomainArbitrary = fc
    .string({
      minLength: 1,
      maxLength: 50,
      unit: fc.oneof(
        fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)), // a-z
        fc.integer({ min: 48, max: 57 }).map((c) => String.fromCharCode(c)), // 0-9
        fc.constant('-'),
      ),
    })
    .filter(
      (s) =>
        s.length > 0 &&
        !s.startsWith('-') &&
        !s.endsWith('-') &&
        !s.includes('--') &&
        /^[a-z0-9-]+$/.test(s),
    );

  // Custom arbitrary for valid UIDs
  const uidArbitrary = fc
    .string({
      minLength: 1,
      maxLength: 50,
      unit: fc.oneof(
        fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)), // a-z
        fc.integer({ min: 48, max: 57 }).map((c) => String.fromCharCode(c)), // 0-9
        fc.constant('-'),
      ),
    })
    .filter((s) => s.length > 0 && /^[a-z0-9-]+$/.test(s));

  /**
   * Creates a mock DatabaseService that simulates an unregistered subdomain.
   * All queries return empty results (no business found for any subdomain).
   */
  function createMockDatabaseService(): DatabaseService {
    return {
      query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
    } as unknown as DatabaseService;
  }

  /**
   * Creates a mock RedisService that returns no cached data.
   */
  function createMockRedisService(): RedisService {
    return {
      get: jest.fn(async () => null),
      set: jest.fn(async () => true),
      isRateLimited: jest.fn(async () => false),
    } as unknown as RedisService;
  }

  /** No pixel and no registered actions, which is what these cases assert about. */
  function createMockPageAnalytics(): PublicPageAnalyticsService {
    return {
      forSource: jest.fn(async () => ({ pixelIds: [], actions: {} })),
      forPublicPage: jest.fn(async () => ({ pixelIds: [], actions: {} })),
    } as unknown as PublicPageAnalyticsService;
  }

  function createMockPlatformWorkspace(): PlatformContentWorkspaceService {
    return {
      getBranding: jest.fn(),
      getWorkspaceId: jest.fn(),
    } as unknown as PlatformContentWorkspaceService;
  }

  it('does not expose the legacy public lookup without a subdomain', () => {
    const service = new PublicService(
      createMockDatabaseService(),
      createMockRedisService(),
      createMockPageAnalytics(),
      createMockPlatformWorkspace(),
    );

    expect('getPublicLinktreeByUid' in service).toBe(false);
    expect(service.getPublicLinktreeByUidAndSubdomain).toBeInstanceOf(Function);
  });

  it('serves the tracking block on a cache hit, not just a cold read', async () => {
    const cached = {
      linktree: { id: 'lt-1', name: 'Acme' },
      links: [],
    };
    const redis = {
      get: jest.fn(async () => cached),
      set: jest.fn(async () => true),
      isRateLimited: jest.fn(async () => false),
    } as unknown as RedisService;
    const pageAnalytics = {
      forSource: jest.fn(async () => ({
        pixelIds: ['PIXEL123'],
        actions: {},
      })),
    } as unknown as PublicPageAnalyticsService;
    const service = new PublicService(
      createMockDatabaseService(),
      redis,
      pageAnalytics,
      createMockPlatformWorkspace(),
    );

    const payload = await service.getPublicLinktreeByUidAndSubdomain(
      'lt-1',
      'tenant',
    );

    // The cached body deliberately holds no tracking: pixel ids follow a plan
    // that can lapse and actions follow links the business can edit, so a
    // two-hour-old copy would keep a page reporting to a pixel it no longer
    // has. A cache hit must therefore still resolve them, and the failure this
    // guards against is silent — the page renders perfectly with no pixel.
    expect(payload.analytics.pixelIds).toEqual(['PIXEL123']);
    expect(pageAnalytics.forSource).toHaveBeenCalledWith('linktree', 'lt-1');
  });

  it('returns 410 only for a deleted linktree on the matching subdomain', async () => {
    const database = createMockDatabaseService();
    (database.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
    const service = new PublicService(
      database,
      createMockRedisService(),
      createMockPageAnalytics(),
      createMockPlatformWorkspace(),
    );

    await expect(
      service.getPublicLinktreeByUidAndSubdomain('lt-deleted', 'tenant'),
    ).rejects.toThrow(GoneException);

    expect(database.query).toHaveBeenLastCalledWith(
      expect.stringContaining('public_page_tombstones'),
      ['lt-deleted', 'tenant'],
    );
  });

  describe('Property 12: Unregistered Subdomain Returns 404', () => {
    it('getLinktreesBySubdomain throws NotFoundException for any unregistered subdomain', async () => {
      await fc.assert(
        fc.asyncProperty(subdomainArbitrary, async (subdomain: string) => {
          // Arrange: DB returns empty results (subdomain not registered)
          const mockDbService = createMockDatabaseService();
          const mockRedisService = createMockRedisService();
          const service = new PublicService(
            mockDbService,
            mockRedisService,
            createMockPageAnalytics(),
            createMockPlatformWorkspace(),
          );

          // Act & Assert: should throw NotFoundException
          await expect(
            service.getLinktreesBySubdomain(subdomain),
          ).rejects.toThrow(NotFoundException);

          // Verify DB was queried with the subdomain
          expect(mockDbService.query).toHaveBeenCalledWith(
            expect.stringMatching(
              /SELECT id FROM businesses\s+WHERE subdomain = \$1[\s\S]*account_type = 'business'/,
            ),
            [subdomain],
          );
        }),
        { numRuns: 100 },
      );
    });

    it('getPublicLinktreeByUidAndSubdomain throws NotFoundException for any unregistered subdomain', async () => {
      await fc.assert(
        fc.asyncProperty(
          uidArbitrary,
          subdomainArbitrary,
          async (uid: string, subdomain: string) => {
            // Arrange: DB returns empty results (no linktree found for this subdomain)
            // Redis cache returns null (no cached data)
            const mockDbService = createMockDatabaseService();
            const mockRedisService = createMockRedisService();
            const service = new PublicService(
              mockDbService,
              mockRedisService,
              createMockPageAnalytics(),
              createMockPlatformWorkspace(),
            );

            // Act & Assert: should throw NotFoundException
            await expect(
              service.getPublicLinktreeByUidAndSubdomain(uid, subdomain),
            ).rejects.toThrow(NotFoundException);

            // Verify Redis cache was checked first
            expect(mockRedisService.get).toHaveBeenCalledWith(
              `cache:linktree:uid:${uid}:sub:${subdomain}`,
            );

            // Verify DB was queried (both uid and seo_name lookups return empty)
            expect(mockDbService.query).toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
