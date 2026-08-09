import * as fc from 'fast-check';
import { SessionService, SessionUser } from './session.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

/**
 * Property 2: Subdomain Match Grants Access (session data integrity subset)
 * **Validates: Requirements 6.4**
 *
 * For any valid subdomain string S, caching a SessionUser with subdomain=S
 * and then retrieving it from cache should yield subdomain=S.
 */
describe('SessionService - Property Tests', () => {
  let sessionService: SessionService;
  let redisStore: Map<string, { value: string; ttl: number }>;
  let mockRedisService: Partial<RedisService>;
  let mockDatabaseService: Partial<DatabaseService>;

  // Custom arbitrary for valid subdomain format: lowercase alphanumeric + hyphens, 1-100 chars
  const subdomainArbitrary = fc
    .string({
      minLength: 1,
      maxLength: 100,
      unit: fc.oneof(
        fc.integer({ min: 97, max: 122 }).map((c) => String.fromCharCode(c)), // a-z
        fc.integer({ min: 48, max: 57 }).map((c) => String.fromCharCode(c)), // 0-9
        fc.constant('-'),
      ),
    })
    .filter(
      (s) =>
        !s.startsWith('-') &&
        !s.endsWith('-') &&
        !s.includes('--') &&
        s.length > 0,
    );

  beforeEach(() => {
    redisStore = new Map();

    mockRedisService = {
      // jest.fn cannot carry a generic signature, so the mock is cast back to
      // the generic method type it stands in for.
      get: jest.fn(async <T>(key: string): Promise<T | null> => {
        const entry = redisStore.get(key);
        if (!entry) return null;
        return JSON.parse(entry.value) as T;
      }) as unknown as RedisService['get'],
      set: jest.fn(
        async (
          key: string,
          value: unknown,
          ttlSeconds = 7200,
        ): Promise<boolean> => {
          redisStore.set(key, {
            value: JSON.stringify(value),
            ttl: ttlSeconds,
          });
          return true;
        },
      ),
      del: jest.fn(async (key: string): Promise<boolean> => {
        redisStore.delete(key);
        return true;
      }),
      trackBusinessSession: jest.fn(async () => true),
      untrackBusinessSession: jest.fn(async () => true),
      isAvailable: jest.fn(() => true),
    };

    mockDatabaseService = {
      query: jest.fn(async () => ({
        rows: [],
        rowCount: 0,
      })) as unknown as DatabaseService['query'],
    };

    sessionService = new SessionService(
      mockDatabaseService as DatabaseService,
      mockRedisService as RedisService,
    );
  });

  it('Property 2: cached session subdomain is preserved through set/get cycle', async () => {
    await fc.assert(
      fc.asyncProperty(subdomainArbitrary, async (subdomain: string) => {
        // Arrange: create a SessionUser with the generated subdomain
        const token = `test-token-${subdomain}-${Date.now()}`;
        const user: SessionUser = {
          id: 'user-123',
          username: 'testuser',
          name: 'Test User',
          role: 'business',
          subdomain,
        };

        // Act: cache the session (simulate what cacheSession does internally)
        await mockRedisService.set!(`session:${token}`, user, 1800);

        // Assert: retrieve from cache and verify subdomain is preserved
        const cached = await mockRedisService.get!<SessionUser>(
          `session:${token}`,
        );
        expect(cached).not.toBeNull();
        expect(cached!.subdomain).toBe(subdomain);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 2: full SessionService getSessionUser returns cached subdomain correctly', async () => {
    await fc.assert(
      fc.asyncProperty(subdomainArbitrary, async (subdomain: string) => {
        // Arrange: pre-populate the Redis store as if session was already cached
        const token = `session-token-${subdomain}`;
        const user: SessionUser = {
          id: 'business-456',
          username: 'business',
          name: 'Business User',
          role: 'business',
          subdomain,
        };
        redisStore.set(`session:${token}`, {
          value: JSON.stringify(user),
          ttl: 1800,
        });

        // Act: retrieve via SessionService (should hit Redis cache)
        const result = await sessionService.getSessionUser(token);

        // Assert: subdomain is preserved through the full retrieval path
        expect(result).not.toBeNull();
        expect(result!.subdomain).toBe(subdomain);
        expect(result!.role).toBe('business');
      }),
      { numRuns: 100 },
    );
  });
});
