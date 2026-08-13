import {
  HttpException,
  NotFoundException,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';

import { PlatformAdminGuard } from './platform-admin.guard';
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
});
