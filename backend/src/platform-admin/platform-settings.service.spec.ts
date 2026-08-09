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
      name: 'MultiTree',
      email: 'admin@example.com',
      phone: '+964 750 123 4567',
      logo: '/images/upload/multitree/logo.png',
      avatar: '/images/upload/multitree/avatar.png',
      favicon: '/images/upload/multitree/favicon.ico',
      accent_color: '#84cc16',
      accent_ink_color: '#ffffff',
      app_url: 'https://multitree.example',
    };
    const database = {
      query: jest.fn().mockResolvedValue({ rows: [profile] }),
    } as unknown as DatabaseService;

    const service = new PlatformSettingsService(database, redis, {
      get: jest.fn((key: string) =>
        key === 'NEXT_PUBLIC_APP_URL' ? 'https://multitree.example' : undefined,
      ),
    } as unknown as ConfigService);

    await expect(service.getProfile('admin-id')).resolves.toEqual(profile);
    expect(mockArg(database.query, 0, 0)).toContain(
      'email, phone, logo, avatar, favicon',
    );
  });

  it('fills empty legacy database fields from the server environment', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'admin-id',
            username: 'operator',
            name: 'MultiTree',
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
      SA_EMAIL: 'admin@example.com',
      SA_PHONE: '7502485829',
      SA_LOGO_WITH_BACKGROUND: '/images/Logo.jpg',
      SA_LOGO_WITHOUT_BACKGROUND: '/images/DefaultAvatar.png',
      SA_FAVICON: '/favicon.ico',
      SA_WEBSITE_COLOR: '#b6f20d',
      NEXT_PUBLIC_APP_URL: 'https://multitree.example',
    };
    const service = new PlatformSettingsService(database, redis, {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService);

    await expect(service.getProfile('admin-id')).resolves.toMatchObject({
      email: 'admin@example.com',
      phone: '7502485829',
      logo: '/images/Logo.jpg',
      avatar: '/images/DefaultAvatar.png',
      favicon: '/favicon.ico',
      accent_color: '#b6f20d',
      app_url: 'https://multitree.example',
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

  it('loads active sessions and recent platform login activity', async () => {
    const sessions = [{ id: 'session-id', is_current: true }];
    const recentActivity = [{ id: '1', outcome: 'success' }];
    const database = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: sessions })
        .mockResolvedValueOnce({ rows: recentActivity }),
    } as unknown as DatabaseService;
    const service = new PlatformSettingsService(database, redis);

    await expect(
      service.getLoginSecurity('admin-id', 'current-token'),
    ).resolves.toEqual({
      sessions,
      recent_activity: recentActivity,
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
