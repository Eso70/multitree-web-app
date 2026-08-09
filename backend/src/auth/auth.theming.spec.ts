import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { RedisService } from '../redis/redis.service';
import { DatabaseService } from '../database/database.service';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';

/**
 * Unit tests for AuthService and AuthController theming additions.
 * Validates Requirements 1.1, 1.2, 6.1, 6.2, 6.3
 */
describe('Auth Theming - Unit Tests', () => {
  const accessRules = {
    assertForBusinessSubdomain: jest.fn(async () => undefined),
  } as unknown as AccessRuleEnforcementService;
  // ==========================================================================
  // AuthService.getBusinessProfile tests
  // ==========================================================================
  describe('AuthService.getBusinessProfile', () => {
    let authService: AuthService;
    let mockDatabaseService: jest.Mocked<DatabaseService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockDatabaseService = {
        query: jest.fn(),
      } as unknown as jest.Mocked<DatabaseService>;

      mockRedisService = {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        trackBusinessSession: jest.fn(),
      } as unknown as jest.Mocked<RedisService>;

      authService = new AuthService(mockDatabaseService, mockRedisService);
    });

    it('should return business profile with website_color field (Req 1.1)', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [
          {
            id: 'business-1',
            username: 'subdomain',
            name: 'subdomain',
            website_color: '#ff0000',
          },
        ],
      } as any);

      const result = await authService.getBusinessProfile('business-1');

      expect(result).toEqual({
        id: 'business-1',
        username: 'subdomain',
        name: 'subdomain',
        website_color: '#ff0000',
      });
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE a.id = $1'),
        ['business-1'],
      );
    });

    it('should return null website_color when database has null (Req 1.2)', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [
          {
            id: 'business-2',
            username: 'karwan',
            name: 'Karwan',
            website_color: null,
          },
        ],
      } as any);

      const result = await authService.getBusinessProfile('business-2');

      expect(result).toEqual({
        id: 'business-2',
        username: 'karwan',
        name: 'Karwan',
        website_color: null,
      });
    });

    it('should return null when business not found', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [],
      } as any);

      const result = await authService.getBusinessProfile('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // AuthService.getSubdomainTheme tests
  // ==========================================================================
  describe('AuthService.getSubdomainTheme', () => {
    let authService: AuthService;
    let mockDatabaseService: jest.Mocked<DatabaseService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockDatabaseService = {
        query: jest.fn(),
      } as unknown as jest.Mocked<DatabaseService>;

      mockRedisService = {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        trackBusinessSession: jest.fn(),
      } as unknown as jest.Mocked<RedisService>;

      authService = new AuthService(mockDatabaseService, mockRedisService);
    });

    it('should return website_color for a valid active subdomain (Req 6.1)', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [{ website_color: '#0066ff' }],
      } as any);

      const result = await authService.getSubdomainTheme('subdomain');

      expect(result).toEqual({
        website_color: '#0066ff',
      });
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE a.subdomain = $1'),
        ['subdomain'],
      );
    });

    it('should return null for non-existent subdomain (Req 6.2)', async () => {
      mockDatabaseService.query.mockResolvedValue({
        rows: [],
      } as any);

      const result = await authService.getSubdomainTheme('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for inactive subdomain (query filters by active status) (Req 6.2)', async () => {
      // The query itself filters by status = 'active', so an inactive business returns no rows
      mockDatabaseService.query.mockResolvedValue({
        rows: [],
      } as any);

      const result = await authService.getSubdomainTheme('suspended-business');

      expect(result).toBeNull();
    });

    it('should return null for empty subdomain without querying DB', async () => {
      const result = await authService.getSubdomainTheme('');

      expect(result).toBeNull();
      expect(mockDatabaseService.query).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AuthController.getProfile theming tests
  // ==========================================================================
  describe('AuthController.getProfile - theming', () => {
    let authController: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockSessionService: jest.Mocked<SessionService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockAuthService = {
        getBusinessProfile: jest.fn(),
        login: jest.fn(),
        getSubdomainTheme: jest.fn(),
        subdomainExists: jest.fn(),
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
      );
    });

    it('should return profile with website_color field (Req 1.1)', async () => {
      mockAuthService.getBusinessProfile.mockResolvedValue({
        id: 'business-1',
        username: 'subdomain',
        name: 'subdomain',
        website_color: '#ff0000',
      });

      const result = await authController.getProfile({
        id: 'business-1',
        username: 'subdomain',
        name: 'subdomain',
        role: 'business',
      });

      expect(result).toMatchObject({
        user: {
          id: 'business-1',
          username: 'subdomain',
          name: 'subdomain',
          website_color: '#ff0000',
        },
      });
    });

    it('should return #000000 for null website_color (Req 1.2)', async () => {
      mockAuthService.getBusinessProfile.mockResolvedValue({
        id: 'business-2',
        username: 'karwan',
        name: 'Karwan',
        website_color: null,
      });

      const result = await authController.getProfile({
        id: 'business-2',
        username: 'karwan',
        name: 'Karwan',
        role: 'business',
      });

      expect(result.user.website_color).toBe('#000000');
    });

    it('should return #000000 for empty string website_color (Req 1.2)', async () => {
      mockAuthService.getBusinessProfile.mockResolvedValue({
        id: 'business-3',
        username: 'test',
        name: 'Test',
        website_color: '',
      });

      const result = await authController.getProfile({
        id: 'business-3',
        username: 'test',
        name: 'Test',
        role: 'business',
      });

      expect(result.user.website_color).toBe('#000000');
    });
  });

  // ==========================================================================
  // AuthController.getSubdomainTheme tests
  // ==========================================================================
  describe('AuthController.getSubdomainTheme', () => {
    let authController: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;
    let mockSessionService: jest.Mocked<SessionService>;
    let mockRedisService: jest.Mocked<RedisService>;

    beforeEach(() => {
      mockAuthService = {
        getBusinessProfile: jest.fn(),
        login: jest.fn(),
        getSubdomainTheme: jest.fn(),
        subdomainExists: jest.fn(),
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
      );
    });

    it('should return correct website_color for valid active subdomain (Req 6.1)', async () => {
      mockAuthService.getSubdomainTheme.mockResolvedValue({
        website_color: '#0066ff',
      });

      const result = await authController.getSubdomainTheme('subdomain');

      expect(result).toMatchObject({ website_color: '#0066ff' });
      expect(mockAuthService.getSubdomainTheme).toHaveBeenCalledWith(
        'subdomain',
      );
    });

    it('should return #000000 when subdomain has null website_color (Req 6.1)', async () => {
      mockAuthService.getSubdomainTheme.mockResolvedValue({
        website_color: null,
      });

      const result = await authController.getSubdomainTheme('subdomain');

      expect(result).toMatchObject({ website_color: '#000000' });
    });

    it('should throw 404 for non-existent subdomain (Req 6.2)', async () => {
      mockAuthService.getSubdomainTheme.mockResolvedValue(null);

      await expect(
        authController.getSubdomainTheme('nonexistent'),
      ).rejects.toThrow(HttpException);

      try {
        await authController.getSubdomainTheme('nonexistent');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as HttpException).message).toBe('Subdomain not found');
      }
    });

    it('should throw 404 for inactive subdomain (Req 6.2)', async () => {
      // AuthService returns null for inactive subdomains (query filters by status='active')
      mockAuthService.getSubdomainTheme.mockResolvedValue(null);

      await expect(
        authController.getSubdomainTheme('inactive-business'),
      ).rejects.toThrow(HttpException);

      try {
        await authController.getSubdomainTheme('inactive-business');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should not require authentication (Req 6.3) - endpoint is public', async () => {
      mockAuthService.getSubdomainTheme.mockResolvedValue({
        website_color: 'gradient:to-r:#ff0000:#0066ff',
      });

      // The endpoint can be called without any session user context
      const result = await authController.getSubdomainTheme('subdomain');

      expect(result).toMatchObject({
        website_color: 'gradient:to-r:#ff0000:#0066ff',
      });
    });
  });
});
