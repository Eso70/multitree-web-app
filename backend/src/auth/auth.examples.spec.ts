import {
  HttpException,
  NotFoundException,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService, SessionUser } from './session.service';
import { RedisService } from '../redis/redis.service';
import { PublicController } from '../public/public.controller';
import { PublicService } from '../public/public.service';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';

/**
 * Example-based unit tests for subdomain-based business routing.
 * Validates Requirements 4.1, 5.3, 7.2, 1.1, 1.2
 */
describe('Auth Examples - Subdomain Business Routing', () => {
  const accessRules = {
    assertAllowed: jest.fn(async () => undefined),
    assertForBusinessSubdomain: jest.fn(async () => undefined),
    assertForPublicLinktree: jest.fn(async () => undefined),
  } as unknown as AccessRuleEnforcementService;
  // ======================================================================
  // Scenario 1: MultiTree routes accessible on root domain (Req 4.1)
  // ======================================================================
  describe('Scenario 1: MultiTree routes accessible on root domain (Req 4.1)', () => {
    let platformAdminGuard: PlatformAdminGuard;
    let mockSessionService: jest.Mocked<SessionService>;

    beforeEach(() => {
      mockSessionService = {
        getSessionUser: jest.fn(),
        destroySession: jest.fn(),
      } as unknown as jest.Mocked<SessionService>;

      platformAdminGuard = new PlatformAdminGuard(
        mockSessionService,
        accessRules,
      );
    });

    it('should allow MultiTree access on root domain with valid session', async () => {
      const platformAdminUser: SessionUser = {
        id: 'sa-001',
        username: 'platform-admin',
        name: 'MultiTree',
        role: 'platform-admin',
      };
      mockSessionService.getSessionUser.mockResolvedValue(platformAdminUser);

      // The guard assigns `user` and `sessionToken` onto the request, so the
      // literal declares them up front rather than being indexed untyped.
      const request: {
        cookies: { platform_admin_session: string };
        headers: { host: string };
        user?: SessionUser;
        sessionToken?: string;
      } = {
        cookies: { platform_admin_session: 'valid-platform-token-123' },
        headers: { host: 'sponsor.krd' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const result = await platformAdminGuard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(platformAdminUser);
      expect(request.sessionToken).toBe('valid-platform-token-123');
    });

    it('should reject access when no MultiTree session cookie is present', async () => {
      const request = {
        cookies: {},
        headers: { host: 'sponsor.krd' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      await expect(platformAdminGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject access when the session user is not a platform administrator', async () => {
      const regularBusiness: SessionUser = {
        id: 'business-001',
        username: 'subdomain',
        name: 'subdomain',
        role: 'business',
        subdomain: 'subdomain',
      };
      mockSessionService.getSessionUser.mockResolvedValue(regularBusiness);

      const request = {
        cookies: { platform_admin_session: 'business-token' },
        headers: { host: 'sponsor.krd' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      await expect(platformAdminGuard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('platformAdminGuard works on the root domain without a subdomain', async () => {
      // Platform administrator access is intentionally root-domain scoped.
      const platformAdminUser: SessionUser = {
        id: 'sa-002',
        username: 'root',
        name: 'MultiTree',
        role: 'platform-admin',
      };
      mockSessionService.getSessionUser.mockResolvedValue(platformAdminUser);

      // Root domain request — no x-subdomain header, host is just sponsor.krd
      const request = {
        cookies: { platform_admin_session: 'root-platform-session' },
        headers: { host: 'sponsor.krd' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const result = await platformAdminGuard.canActivate(context);
      expect(result).toBe(true);
      // Confirm no subdomain dependency
      expect(platformAdminUser.subdomain).toBeUndefined();
    });
  });

  // ======================================================================
  // Scenario 2: Cookie attributes correctness (Req 7.2)
  // ======================================================================
  describe('Scenario 2: Cookie attributes (httpOnly, secure, sameSite) correctness (Req 7.2)', () => {
    let authController: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockSessionService: jest.Mocked<SessionService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockAuthService = {
        login: jest.fn(),
      } as unknown as jest.Mocked<AuthService>;

      mockSessionService = {
        getSessionUser: jest.fn(),
        destroySession: jest.fn(),
      } as unknown as jest.Mocked<SessionService>;

      mockRedisService = {
        isRateLimited: jest.fn().mockResolvedValue(false),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      } as unknown as jest.Mocked<RedisService>;

      authController = new AuthController(
        mockAuthService,
        mockSessionService,
        mockRedisService,
        accessRules,
        {} as never,
      );
    });

    it('should set a host-only secure cookie for an HTTPS request', async () => {
      mockAuthService.login.mockResolvedValue({
        sessionToken: '3f1a7c2e-9b4d-4e6a-8c1f-2d5b7a9e0c31',
        user: {
          id: 'business-subdomain',
          username: 'subdomain',
          name: 'subdomain',
          role: 'business' as const,
          subdomain: 'subdomain',
        },
        ttlSeconds: 1800,
      });

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'subdomain',
          'x-forwarded-proto': 'https',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      await authController.login(
        { username: 'subdomain', password: 'password123', rememberMe: false },
        mockReq,
        mockRes,
        'subdomain',
      );

      expect(setCookieMock).toHaveBeenCalledWith(
        'business_session',
        '3f1a7c2e-9b4d-4e6a-8c1f-2d5b7a9e0c31',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 1800,
        }),
      );
      expect(setCookieMock.mock.calls[0][2].domain).toBeUndefined();
    });

    it('should keep the business cookie host-only', async () => {
      mockAuthService.login.mockResolvedValue({
        sessionToken: '5c2b8d3f-1e6a-4b7c-9d0e-8f3a1c5b7d92',
        user: {
          id: 'business-karwan',
          username: 'karwan',
          name: 'Karwan',
          role: 'business' as const,
          subdomain: 'karwan',
        },
        ttlSeconds: 31536000,
      });

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'karwan',
          'x-forwarded-for': '10.0.0.1',
          'user-agent': 'TestAgent',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      await authController.login(
        { username: 'karwan', password: 'pass', rememberMe: true },
        mockReq,
        mockRes,
        'karwan',
      );

      const cookieOptions = setCookieMock.mock.calls[0][2];
      expect(cookieOptions.domain).toBeUndefined();
    });

    it('should NOT set cookie with wildcard domain .sponsor.krd', async () => {
      mockAuthService.login.mockResolvedValue({
        sessionToken: '7d3c9e4a-2f5b-4c8d-a1e0-9b4f2d6c8e13',
        user: {
          id: 'business-test',
          username: 'test',
          name: 'Test',
          role: 'business' as const,
          subdomain: 'testshop',
        },
        ttlSeconds: 1800,
      });

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'testshop',
          'user-agent': 'Test',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      await authController.login(
        { username: 'test', password: 'pw', rememberMe: false },
        mockReq,
        mockRes,
        'testshop',
      );

      const cookieOptions = setCookieMock.mock.calls[0][2];
      expect(cookieOptions.domain).toBeUndefined();
    });
  });

  // ======================================================================
  // Scenario 3: Business landing page returns linktree list (Req 5.3)
  // ======================================================================
  describe('Scenario 3: Business landing page returns linktree list (Req 5.3)', () => {
    let publicController: PublicController;
    let mockPublicService: jest.Mocked<PublicService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockPublicService = {
        getLinktreesBySubdomain: jest.fn(),
        getPublicLinktreeByUidAndSubdomain: jest.fn(),
      } as unknown as jest.Mocked<PublicService>;

      mockRedisService = {
        isRateLimited: jest.fn().mockResolvedValue(false),
      } as unknown as jest.Mocked<RedisService>;

      publicController = new PublicController(
        mockPublicService,
        mockRedisService,
        accessRules,
      );
    });

    it('should return a list of active linktrees for subdomain "subdomain"', async () => {
      const linktrees = [
        {
          id: 'lt-1',
          name: 'My Shop',
          uid: 'my-shop',
          seo_name: 'my-shop',
          image: null,
          subtitle: 'Shop links',
          description: null,
        },
        {
          id: 'lt-2',
          name: 'Portfolio',
          uid: 'portfolio',
          seo_name: 'portfolio',
          image: null,
          subtitle: 'My work',
          description: null,
        },
      ];
      mockPublicService.getLinktreesBySubdomain.mockResolvedValue(linktrees);

      const result = await publicController.getLinktrees('subdomain');

      expect(result).toEqual({ success: true, data: linktrees });
      expect(mockPublicService.getLinktreesBySubdomain).toHaveBeenCalledWith(
        'subdomain',
      );
    });

    it('should return empty array for subdomain with no linktrees', async () => {
      mockPublicService.getLinktreesBySubdomain.mockResolvedValue([]);

      const result = await publicController.getLinktrees('empty-business');

      expect(result).toEqual({ success: true, data: [] });
      expect(mockPublicService.getLinktreesBySubdomain).toHaveBeenCalledWith(
        'empty-business',
      );
    });

    it('should throw NotFoundException for non-existent subdomain', async () => {
      mockPublicService.getLinktreesBySubdomain.mockRejectedValue(
        new NotFoundException('Page not found'),
      );

      await expect(
        publicController.getLinktrees('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 404 when subdomain is empty (root domain request)', async () => {
      await expect(publicController.getLinktrees('')).rejects.toThrow(
        HttpException,
      );
    });
  });

  // ======================================================================
  // Scenario 4: Specific login flow with mock DB (Req 1.1, 1.2)
  // ======================================================================
  describe('Scenario 4: Specific login flow with mock DB (Req 1.1, 1.2)', () => {
    let authController: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockSessionService: jest.Mocked<SessionService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockAuthService = {
        login: jest.fn(),
      } as unknown as jest.Mocked<AuthService>;

      mockSessionService = {
        getSessionUser: jest.fn(),
        destroySession: jest.fn(),
      } as unknown as jest.Mocked<SessionService>;

      mockRedisService = {
        isRateLimited: jest.fn().mockResolvedValue(false),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      } as unknown as jest.Mocked<RedisService>;

      authController = new AuthController(
        mockAuthService,
        mockSessionService,
        mockRedisService,
        accessRules,
        {} as never,
      );
    });

    it('business "subdomain" logs in on subdomain.sponsor.krd with a host-only cookie', async () => {
      // Mock: AuthService.login resolves with session for business "subdomain"
      mockAuthService.login.mockResolvedValue({
        sessionToken: '9e4d0f5b-3a6c-4d9e-b2f1-0c5a3e7d9f24',
        user: {
          id: 'business-subdomain-uuid',
          username: 'subdomain',
          name: 'subdomain',
          role: 'business' as const,
          subdomain: 'subdomain',
        },
        ttlSeconds: 1800,
      });

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'subdomain',
          'x-forwarded-for': '203.0.113.5',
          'user-agent': 'Mozilla/5.0 (Linux) Chrome/120',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      const result = await authController.login(
        { username: 'subdomain', password: 'securePass123', rememberMe: false },
        mockReq,
        mockRes,
        'subdomain',
      );

      // Verify AuthService.login was called with the correct subdomain
      expect(mockAuthService.login).toHaveBeenCalledWith(
        'subdomain',
        'securePass123',
        false,
        '203.0.113.5',
        'Mozilla/5.0 (Linux) Chrome/120',
        'subdomain',
      );

      // Verify response contains user info
      expect(result).toEqual({
        message: 'Login successful',
        user: {
          id: 'business-subdomain-uuid',
          username: 'subdomain',
          name: 'subdomain',
        },
      });

      // Verify the cookie is host-only and scoped by the browser to the
      // current business hostname.
      expect(setCookieMock).toHaveBeenCalledWith(
        'business_session',
        '9e4d0f5b-3a6c-4d9e-b2f1-0c5a3e7d9f24',
        expect.objectContaining({
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
      expect(setCookieMock.mock.calls[0][2].domain).toBeUndefined();
    });

    it('business "subdomain" login rejected on wrong subdomain "karwan.sponsor.krd"', async () => {
      // Mock: AuthService.login rejects due to subdomain mismatch
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('ئەم هەژمارە بۆ ئەم سەبدۆمەینە نییە'),
      );

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'karwan',
          'x-forwarded-for': '10.0.0.1',
          'user-agent': 'Test',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      await expect(
        authController.login(
          {
            username: 'subdomain',
            password: 'securePass123',
            rememberMe: false,
          },
          mockReq,
          mockRes,
          'karwan',
        ),
      ).rejects.toThrow(UnauthorizedException);

      // Cookie must NOT be set on rejection
      expect(setCookieMock).not.toHaveBeenCalled();
    });

    it('login rejected on root domain (no subdomain)', async () => {
      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          host: 'sponsor.krd',
          'user-agent': 'Test',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      // Passing empty string as subdomain (root domain)
      await expect(
        authController.login(
          { username: 'subdomain', password: 'pass', rememberMe: false },
          mockReq,
          mockRes,
          '', // Empty subdomain = root domain
        ),
      ).rejects.toThrow(UnauthorizedException);

      // AuthService.login should never be called
      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(setCookieMock).not.toHaveBeenCalled();
    });

    it('session user object contains subdomain field after successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        sessionToken: 'b5f1a2c6-4d7e-4a0b-c3d2-1e6b4f8a0c35',
        user: {
          id: 'business-id-1',
          username: 'subdomain',
          name: 'subdomain',
          role: 'business' as const,
          subdomain: 'subdomain',
        },
        ttlSeconds: 1800,
      });

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'subdomain',
          'user-agent': 'Test',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      await authController.login(
        { username: 'subdomain', password: 'pass', rememberMe: false },
        mockReq,
        mockRes,
        'subdomain',
      );

      // Verify the user object returned by AuthService.login contains subdomain
      const loginResult = (await mockAuthService.login.mock.results[0]
        .value) as { user: { subdomain?: string } };
      expect(loginResult.user.subdomain).toBe('subdomain');
    });

    it('remember me sets longer TTL in cookie maxAge', async () => {
      const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
      mockAuthService.login.mockResolvedValue({
        sessionToken: 'c6a2b3d7-5e8f-4b1c-d4e3-2f7c5a9b1d46',
        user: {
          id: 'business-remember',
          username: 'subdomain',
          name: 'subdomain',
          role: 'business' as const,
          subdomain: 'subdomain',
        },
        ttlSeconds: YEAR_IN_SECONDS,
      });

      const setCookieMock = jest.fn<
        void,
        [string, string, Record<string, unknown>]
      >();
      const mockReq = {
        headers: {
          'x-subdomain': 'subdomain',
          'user-agent': 'Test',
        },
      } as unknown as FastifyRequest;
      const mockRes = {
        setCookie: setCookieMock,
      } as unknown as FastifyReply;

      await authController.login(
        { username: 'subdomain', password: 'pass', rememberMe: true },
        mockReq,
        mockRes,
        'subdomain',
      );

      const cookieOptions = setCookieMock.mock.calls[0][2];
      expect(cookieOptions.maxAge).toBe(YEAR_IN_SECONDS);
    });
  });
});
