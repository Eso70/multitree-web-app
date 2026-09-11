import { mockArg } from '../common/test-utils';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { PlatformSettingsService } from './platform-settings.service';

describe('PlatformSettingsService', () => {
  const redis = {
    deleteByPattern: jest.fn().mockResolvedValue(1),
  } as unknown as RedisService;

  it('loads every persisted General-tab field', async () => {
    const profile = {
      id: 'admin-id',
      username: 'operator',
      name: 'Sponsor.krd',
      email: 'admin@example.com',
      phone: '+964 750 123 4567',
      logo: '/images/upload/sponsor-krd/logo.png',
      avatar: '/images/upload/sponsor-krd/avatar.png',
      favicon: '/images/upload/sponsor-krd/favicon.ico',
      accent_color: '#25f4ee',
      accent_ink_color: '#ffffff',
      app_url: 'https://sponsor-krd.example',
    };
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [profile] }),
    } as unknown as DatabaseService;

    const service = new PlatformSettingsService(database, redis, {
      get: jest.fn((key: string) =>
        key === 'NEXT_PUBLIC_APP_URL'
          ? 'https://sponsor-krd.example'
          : undefined,
      ),
    } as unknown as ConfigService);

    await expect(service.getProfile('admin-id')).resolves.toEqual(profile);
    expect(mockArg(database.query, 0, 0)).toContain(
      'email, phone, logo, avatar, favicon',
    );
  });

  it('fills empty database fields from the current server environment', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'admin-id',
            username: 'operator',
            name: 'Sponsor.krd',
            email: null,
            phone: null,
            logo: null,
            avatar: null,
            favicon: null,
            accent_color: '',
            accent_ink_color: '#000000',
          },
        ],
      }),
    } as unknown as DatabaseService;
    const values: Record<string, string> = {
      PLATFORM_ADMIN_EMAIL: 'admin@example.com',
      PLATFORM_ADMIN_PHONE: '7502485829',
      PLATFORM_ADMIN_LOGO_WITH_BACKGROUND: '/images/Logo.jpg',
      PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND:
        '/images/sponsor-krd-logo-mark.png',
      PLATFORM_ADMIN_FAVICON: '/favicon.ico',
      PLATFORM_ADMIN_WEBSITE_COLOR: '#123456',
      NEXT_PUBLIC_APP_URL: 'https://sponsor-krd.example',
    };
    const service = new PlatformSettingsService(database, redis, {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);

    await expect(service.getProfile('admin-id')).resolves.toMatchObject({
      email: 'admin@example.com',
      phone: '7502485829',
      logo: '/images/Logo.jpg',
      avatar: '/images/sponsor-krd-logo-mark.png',
      favicon: '/favicon.ico',
      accent_color: '#123456',
      app_url: 'https://sponsor-krd.example',
    });
  });

  it('keeps the configured Google email while updating profile fields', async () => {
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'admin-id',
              username: 'operator',
              email: 'admin@example.com',
              phone: '+964 750 123 4567',
            },
          ],
        }),
    } as unknown as DatabaseService;
    const service = new PlatformSettingsService(database, redis, {
      get: jest.fn((key: string) =>
        key === 'PLATFORM_ADMIN_EMAIL' ? 'admin@example.com' : undefined,
      ),
    } as unknown as ConfigService);

    await service.updateProfile('admin-id', {
      username: ' Operator ',
      email: ' ADMIN@Example.COM ',
      phone: ' +964 750 123 4567 ',
    });

    expect(mockArg(database.query, 1, 1)).toEqual([
      'operator',
      'admin@example.com',
      '+964 750 123 4567',
      'admin-id',
    ]);
  });

  it('rejects a username already assigned to another administrator', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [{ exists: 1 }] }),
    } as unknown as DatabaseService;
    const service = new PlatformSettingsService(database, redis);

    await expect(
      service.updateProfile('admin-id', { username: 'existing' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('stores all branding assets and colors', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'admin-id',
            name: 'My Platform',
            logo: '/logo.png',
            avatar: '/avatar.png',
            favicon: '/favicon.ico',
            accent_color: 'gradient:to-r:#112233:#445566',
            accent_ink_color: '#ffffff',
          },
        ],
      }),
    } as unknown as DatabaseService;
    const service = new PlatformSettingsService(database, redis);

    await service.updateBranding('admin-id', {
      name: 'My Platform',
      logo: '/logo.png',
      avatar: '/avatar.png',
      favicon: '/favicon.ico',
      accent_color: 'gradient:to-r:#112233:#445566',
      accent_ink_color: '#ffffff',
    });

    expect(mockArg(database.query, 0, 1)).toEqual([
      'My Platform',
      '/logo.png',
      '/avatar.png',
      '/favicon.ico',
      'gradient:to-r:#112233:#445566',
      '#ffffff',
      'admin-id',
    ]);
  });

  it('loads active platform sessions', async () => {
    const sessions = [{ id: 'session-id', is_current: true }];
    const database = {
      query: jest.fn().mockResolvedValueOnce({ rows: sessions }),
    } as unknown as DatabaseService;
    const service = new PlatformSettingsService(database, redis);

    await expect(
      service.getLoginSecurity('admin-id', 'current-token'),
    ).resolves.toEqual({
      sessions,
    });
    expect(mockArg(database.query, 0, 1)).toEqual([
      'admin-id',
      'current-token',
    ]);
  });

  it('revokes another session from the database and cache', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [{ session_token: 'other-token' }],
      }),
    } as unknown as DatabaseService;
    const sessionRedis = {
      del: jest.fn().mockResolvedValue(true),
      untrackBusinessSession: jest.fn().mockResolvedValue(true),
    } as unknown as RedisService;
    const service = new PlatformSettingsService(database, sessionRedis);

    await service.revokeSession('admin-id', 'session-id', 'current-token');

    expect(mockArg(database.query, 0, 1)).toEqual([
      'session-id',
      'admin-id',
      'current-token',
    ]);
    expect(sessionRedis.del as jest.Mock).toHaveBeenCalledWith(
      'session:other-token',
    );
  });
});
