import * as fc from 'fast-check';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

/**
 * Property 4: Empty Subdomain Login Rejection
 * **Validates: Requirements 1.5, 3.2**
 *
 * For any credentials where requestSubdomain is empty OR business.subdomain is null,
 * login is rejected regardless of credential validity.
 */
describe('AuthService - Property Tests', () => {
  // Custom arbitrary for valid subdomain format: lowercase alphanumeric + hyphens
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

  // Arbitrary for usernames (non-empty strings)
  const usernameArbitrary = fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim().length > 0);

  // Arbitrary for passwords (non-empty strings)
  const passwordArbitrary = fc.string({ minLength: 1, maxLength: 50 });

  function createMockDatabaseService(
    business: {
      id: string;
      username: string;
      name: string;
      password_hash: string;
      status: string;
      subdomain: string | null;
    } | null,
  ): DatabaseService {
    return {
      query: jest.fn(async (queryText: string) => {
        if (
          queryText.includes('SELECT') &&
          queryText.includes('FROM businesses')
        ) {
          if (!business) {
            return { rows: [] };
          }
          return { rows: [business] };
        }
        // For INSERT/UPDATE queries (session creation, last login update)
        return { rows: [], rowCount: 1 };
      }),
    } as unknown as DatabaseService;
  }

  function createMockRedisService(): RedisService {
    return {
      set: jest.fn(async () => true),
      get: jest.fn(async () => null),
      del: jest.fn(async () => true),
      trackBusinessSession: jest.fn(async () => true),
    } as unknown as RedisService;
  }

  beforeEach(() => {
    // Mock bcrypt.compare to always return true — we're testing subdomain logic, not password
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Property 4: Empty Subdomain Login Rejection', () => {
    it('rejects login when requestSubdomain is empty string, even with valid password and business.subdomain set', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitrary,
          passwordArbitrary,
          subdomainArbitrary,
          fc.boolean(),
          async (username, password, businessSubdomain, rememberMe) => {
            // Arrange: business has a valid subdomain, but requestSubdomain is empty
            const business = {
              id: 'business-123',
              username,
              name: 'Test Business',
              password_hash: 'hashed_password',
              status: 'active',
              subdomain: businessSubdomain,
            };

            const mockDb = createMockDatabaseService(business);
            const mockRedis = createMockRedisService();
            const service = new AuthService(mockDb, mockRedis);

            // Act & Assert: login with empty requestSubdomain should reject
            await expect(
              service.login(
                username,
                password,
                rememberMe,
                '127.0.0.1',
                'test-agent',
                '',
              ),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects login when requestSubdomain is undefined, even with valid password and business.subdomain set', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitrary,
          passwordArbitrary,
          subdomainArbitrary,
          fc.boolean(),
          async (username, password, businessSubdomain, rememberMe) => {
            // Arrange: business has a valid subdomain, but requestSubdomain is undefined
            const business = {
              id: 'business-456',
              username,
              name: 'Test Business',
              password_hash: 'hashed_password',
              status: 'active',
              subdomain: businessSubdomain,
            };

            const mockDb = createMockDatabaseService(business);
            const mockRedis = createMockRedisService();
            const service = new AuthService(mockDb, mockRedis);

            // Act & Assert: login with undefined requestSubdomain should reject
            await expect(
              service.login(
                username,
                password,
                rememberMe,
                '127.0.0.1',
                'test-agent',
                undefined as any,
              ),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects login when business.subdomain is null, even with valid password and non-empty requestSubdomain', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitrary,
          passwordArbitrary,
          subdomainArbitrary,
          fc.boolean(),
          async (username, password, requestSubdomain, rememberMe) => {
            // Arrange: business has NULL subdomain, request has a valid subdomain
            const business = {
              id: 'business-789',
              username,
              name: 'Test Business',
              password_hash: 'hashed_password',
              status: 'active',
              subdomain: null,
            };

            const mockDb = createMockDatabaseService(business);
            const mockRedis = createMockRedisService();
            const service = new AuthService(mockDb, mockRedis);

            // Act & Assert: login with null business.subdomain should reject
            await expect(
              service.login(
                username,
                password,
                rememberMe,
                '127.0.0.1',
                'test-agent',
                requestSubdomain,
              ),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects login when business.subdomain is empty string, even with valid password and non-empty requestSubdomain', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitrary,
          passwordArbitrary,
          subdomainArbitrary,
          fc.boolean(),
          async (username, password, requestSubdomain, rememberMe) => {
            // Arrange: business has empty string subdomain, request has a valid subdomain
            const business = {
              id: 'business-101',
              username,
              name: 'Test Business',
              password_hash: 'hashed_password',
              status: 'active',
              subdomain: '',
            };

            const mockDb = createMockDatabaseService(business);
            const mockRedis = createMockRedisService();
            const service = new AuthService(mockDb, mockRedis);

            // Act & Assert: login with empty business.subdomain should reject
            await expect(
              service.login(
                username,
                password,
                rememberMe,
                '127.0.0.1',
                'test-agent',
                requestSubdomain,
              ),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
