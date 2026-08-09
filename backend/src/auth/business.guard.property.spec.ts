import * as fc from 'fast-check';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessGuard } from './business.guard';
import { SessionService, SessionUser } from './session.service';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';

/**
 * Property 1: Subdomain Mismatch Rejection
 * Property 2: Subdomain Match Grants Access
 * **Validates: Requirements 1.3, 2.1, 2.2, 6.2**
 *
 * For any session with subdomain X and request subdomain Y where X ≠ Y, the guard rejects.
 * For any session with subdomain X and request subdomain X, the guard allows.
 */
describe('BusinessGuard - Property Tests', () => {
  const ROOT_DOMAIN = 'sponsor.krd';

  // Custom arbitrary for valid subdomain format: lowercase alphanumeric + hyphens, 1-100 chars
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

  function createMockSessionService(user: SessionUser | null): SessionService {
    return {
      getSessionUser: jest.fn(async () => user),
    } as unknown as SessionService;
  }

  function createMockConfigService(): ConfigService {
    return {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'ROOT_DOMAIN') return ROOT_DOMAIN;
        return defaultValue;
      }),
    } as unknown as ConfigService;
  }

  function createMockAccessRules(): AccessRuleEnforcementService {
    return {
      assertAllowed: jest.fn(async () => undefined),
    } as unknown as AccessRuleEnforcementService;
  }

  function createMockExecutionContext(
    subdomain: string,
    sessionToken = 'valid-token',
  ) {
    const request = {
      cookies: { business_session: sessionToken },
      headers: {
        'x-subdomain': subdomain,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  describe('Property 1: Subdomain Mismatch Rejection', () => {
    it('rejects when session subdomain X does not match request subdomain Y', async () => {
      await fc.assert(
        fc.asyncProperty(
          subdomainArbitrary,
          subdomainArbitrary,
          async (sessionSubdomain: string, requestSubdomain: string) => {
            // Pre-condition: subdomains must be different
            fc.pre(sessionSubdomain !== requestSubdomain);

            // Arrange: session user has subdomain X, request has subdomain Y
            const user: SessionUser = {
              id: 'business-123',
              username: 'testbusiness',
              name: 'Test Business',
              role: 'business',
              subdomain: sessionSubdomain,
            };

            const mockSessionService = createMockSessionService(user);
            const mockConfigService = createMockConfigService();
            const guard = new BusinessGuard(
              mockSessionService,
              mockConfigService,
              createMockAccessRules(),
            );

            const context = createMockExecutionContext(requestSubdomain);

            // Act & Assert: guard should reject with UnauthorizedException
            await expect(guard.canActivate(context)).rejects.toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects when request has no subdomain (empty x-subdomain header)', async () => {
      await fc.assert(
        fc.asyncProperty(
          subdomainArbitrary,
          async (sessionSubdomain: string) => {
            // Arrange: user has a subdomain but request comes from root domain
            const user: SessionUser = {
              id: 'business-123',
              username: 'testbusiness',
              name: 'Test Business',
              role: 'business',
              subdomain: sessionSubdomain,
            };

            const mockSessionService = createMockSessionService(user);
            const mockConfigService = createMockConfigService();
            const guard = new BusinessGuard(
              mockSessionService,
              mockConfigService,
              createMockAccessRules(),
            );

            // Simulate root domain request (no x-subdomain, host is root domain)
            const request = {
              cookies: { business_session: 'valid-token' },
              headers: {
                host: ROOT_DOMAIN,
              },
            };
            const context = {
              switchToHttp: () => ({
                getRequest: () => request,
              }),
            } as unknown as ExecutionContext;

            // Act & Assert: guard should reject (no subdomain in request)
            await expect(guard.canActivate(context)).rejects.toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects when user has no subdomain assigned', async () => {
      await fc.assert(
        fc.asyncProperty(
          subdomainArbitrary,
          async (requestSubdomain: string) => {
            // Arrange: user has NO subdomain, request has a subdomain
            const user: SessionUser = {
              id: 'business-123',
              username: 'testbusiness',
              name: 'Test Business',
              role: 'business',
              // subdomain is undefined
            };

            const mockSessionService = createMockSessionService(user);
            const mockConfigService = createMockConfigService();
            const guard = new BusinessGuard(
              mockSessionService,
              mockConfigService,
              createMockAccessRules(),
            );

            const context = createMockExecutionContext(requestSubdomain);

            // Act & Assert: guard should reject (user has no subdomain)
            await expect(guard.canActivate(context)).rejects.toThrow(
              UnauthorizedException,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Subdomain Match Grants Access', () => {
    it('allows access when session subdomain matches request subdomain', async () => {
      await fc.assert(
        fc.asyncProperty(subdomainArbitrary, async (subdomain: string) => {
          // Arrange: session user has subdomain X, request also has subdomain X
          const user: SessionUser = {
            id: 'business-456',
            username: 'matchedbusiness',
            name: 'Matched Business',
            role: 'business',
            subdomain: subdomain,
          };

          const mockSessionService = createMockSessionService(user);
          const mockConfigService = createMockConfigService();
          const guard = new BusinessGuard(
            mockSessionService,
            mockConfigService,
            createMockAccessRules(),
          );

          const context = createMockExecutionContext(subdomain);

          // Act: guard should grant access
          const result = await guard.canActivate(context);

          // Assert: returns true (access granted)
          expect(result).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('attaches user and sessionToken to request on successful match', async () => {
      await fc.assert(
        fc.asyncProperty(subdomainArbitrary, async (subdomain: string) => {
          // Arrange
          const user: SessionUser = {
            id: 'business-789',
            username: 'business',
            name: 'Business',
            role: 'business',
            subdomain: subdomain,
          };

          const mockSessionService = createMockSessionService(user);
          const mockConfigService = createMockConfigService();
          const guard = new BusinessGuard(
            mockSessionService,
            mockConfigService,
            createMockAccessRules(),
          );

          const request: {
            cookies: Record<string, string>;
            headers: Record<string, string>;
            user?: unknown;
            sessionToken?: string;
          } = {
            cookies: { business_session: 'test-session-token' },
            headers: {
              'x-subdomain': subdomain,
            },
          };

          const context = {
            switchToHttp: () => ({
              getRequest: () => request,
            }),
          } as unknown as ExecutionContext;

          // Act
          const result = await guard.canActivate(context);

          // Assert: access granted and user attached
          expect(result).toBe(true);
          expect(request.user).toEqual(user);
          expect(request.sessionToken).toBe('test-session-token');
        }),
        { numRuns: 100 },
      );
    });
  });
});
