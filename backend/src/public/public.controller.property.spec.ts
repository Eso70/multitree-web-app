import * as fc from 'fast-check';
import type { FastifyRequest } from 'fastify';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { RedisService } from '../redis/redis.service';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';

/**
 * Property 6: Linktree Ownership Scoping
 * Property 7: Root Domain Blocks Public Linktrees
 * **Validates: Requirements 5.1, 5.2, 5.4**
 *
 * Property 6: Linktree served iff subdomain matches owning business.
 * Property 7: Root domain (no subdomain) always returns 404 for any linktree request.
 */
describe('PublicController - Property Tests', () => {
  /** The app's own host. `getPublicPage` treats it as "no business". */
  const RESERVED_SUBDOMAIN = 'id';

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
        // `id` is the app's own host, which the controller answers with a 404
        // by design — Property 7 below is what covers that. Leaving it in the
        // generator made this property fail roughly once in a few thousand
        // runs, when it happened to produce exactly that string, and read as
        // an intermittent bug rather than the two properties contradicting
        // each other.
        s !== RESERVED_SUBDOMAIN &&
        /^[a-z0-9-]+$/.test(s),
    );

  // Custom arbitrary for valid linktree UIDs: lowercase alphanumeric + hyphens, 1-50 chars
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

  function createMockRedisService(): RedisService {
    return {
      isRateLimited: jest.fn(async () => false),
      get: jest.fn(async () => null),
      set: jest.fn(async () => true),
    } as unknown as RedisService;
  }

  function createMockAccessRules(): AccessRuleEnforcementService {
    return {
      assertForPublicLinktree: jest.fn(async () => undefined),
      assertForBusinessSubdomain: jest.fn(async () => undefined),
    } as unknown as AccessRuleEnforcementService;
  }

  function createMockRequest(): FastifyRequest {
    return {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    } as unknown as FastifyRequest;
  }

  describe('Property 6: Linktree Ownership Scoping', () => {
    it('serves linktree when request subdomain matches the owning business subdomain', async () => {
      await fc.assert(
        fc.asyncProperty(
          uidArbitrary,
          subdomainArbitrary,
          async (uid: string, owningSubdomain: string) => {
            // Arrange: service returns data when subdomain matches
            const mockLinktreeData = {
              linktree: { id: '1', uid, name: 'Test' },
              links: [],
            };

            const mockPublicService = {
              getPublicLinktreeByUidAndSubdomain: jest.fn(
                async () => mockLinktreeData,
              ),
            } as unknown as PublicService;

            const mockRedisService = createMockRedisService();
            const controller = new PublicController(
              mockPublicService,
              mockRedisService,
              createMockAccessRules(),
            );
            const mockReq = createMockRequest();

            // Act: request with matching subdomain
            const result = await controller.getPublicPage(
              uid,
              owningSubdomain,
              mockReq,
            );

            // Assert: controller returns success with linktree data
            expect(result).toEqual({ success: true, data: mockLinktreeData });
            expect(
              mockPublicService.getPublicLinktreeByUidAndSubdomain,
            ).toHaveBeenCalledWith(uid, owningSubdomain);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns 404 when request subdomain does NOT match the owning business subdomain', async () => {
      await fc.assert(
        fc.asyncProperty(
          uidArbitrary,
          subdomainArbitrary,
          subdomainArbitrary,
          async (
            uid: string,
            owningSubdomain: string,
            requestSubdomain: string,
          ) => {
            // Pre-condition: subdomains must be different
            fc.pre(owningSubdomain !== requestSubdomain);

            // Arrange: service throws NotFoundException when subdomain doesn't match
            const mockPublicService = {
              getPublicLinktreeByUidAndSubdomain: jest.fn(async () => {
                throw new NotFoundException('Page not found');
              }),
            } as unknown as PublicService;

            const mockRedisService = createMockRedisService();
            const controller = new PublicController(
              mockPublicService,
              mockRedisService,
              createMockAccessRules(),
            );
            const mockReq = createMockRequest();

            // Act & Assert: controller propagates 404 when subdomain doesn't match
            await expect(
              controller.getPublicPage(uid, requestSubdomain, mockReq),
            ).rejects.toThrow(NotFoundException);

            expect(
              mockPublicService.getPublicLinktreeByUidAndSubdomain,
            ).toHaveBeenCalledWith(uid, requestSubdomain);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 7: Root Domain Blocks Public Linktrees', () => {
    it('returns 404 when subdomain is empty (root domain)', async () => {
      await fc.assert(
        fc.asyncProperty(uidArbitrary, async (uid: string) => {
          // Arrange: service should NOT be called
          const mockPublicService = {
            getPublicLinktreeByUidAndSubdomain: jest.fn(),
          } as unknown as PublicService;

          const mockRedisService = createMockRedisService();
          const controller = new PublicController(
            mockPublicService,
            mockRedisService,
            createMockAccessRules(),
          );
          const mockReq = createMockRequest();

          // Act & Assert: empty subdomain returns 404
          try {
            await controller.getPublicPage(uid, '', mockReq);
            // If no exception thrown, test fails
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(
              HttpStatus.NOT_FOUND,
            );
          }

          // Verify the service was never called
          expect(
            mockPublicService.getPublicLinktreeByUidAndSubdomain,
          ).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('returns 404 when subdomain is the root domain identifier "id"', async () => {
      await fc.assert(
        fc.asyncProperty(uidArbitrary, async (uid: string) => {
          // Arrange: service should NOT be called
          const mockPublicService = {
            getPublicLinktreeByUidAndSubdomain: jest.fn(),
          } as unknown as PublicService;

          const mockRedisService = createMockRedisService();
          const controller = new PublicController(
            mockPublicService,
            mockRedisService,
            createMockAccessRules(),
          );
          const mockReq = createMockRequest();

          // Act & Assert: "id" subdomain (root domain fallback) returns 404
          try {
            await controller.getPublicPage(uid, 'id', mockReq);
            // If no exception thrown, test fails
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(
              HttpStatus.NOT_FOUND,
            );
          }

          // Verify the service was never called
          expect(
            mockPublicService.getPublicLinktreeByUidAndSubdomain,
          ).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });
});
