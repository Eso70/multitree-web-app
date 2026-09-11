import {
  PLATFORM_ADMIN_ENV_KEYS,
  readPlatformAdminEnv,
} from './platform-admin-env';

describe('readPlatformAdminEnv', () => {
  const from = (values: Record<string, string | undefined>) => (name: string) =>
    values[name];

  it('reads the current PLATFORM_ADMIN_* name', () => {
    const read = from({ PLATFORM_ADMIN_USERNAME: 'sponsor-admin' });
    expect(readPlatformAdminEnv('PLATFORM_ADMIN_USERNAME', read)).toBe(
      'sponsor-admin',
    );
  });

  it('treats an empty current value as unset', () => {
    expect(
      readPlatformAdminEnv(
        'PLATFORM_ADMIN_NAME',
        from({ PLATFORM_ADMIN_NAME: '' }),
      ),
    ).toBeUndefined();
  });

  it('returns undefined when neither name is set', () => {
    expect(
      readPlatformAdminEnv('PLATFORM_ADMIN_PHONE', from({})),
    ).toBeUndefined();
  });

  it('covers every documented initial-administrator setting', () => {
    expect([...PLATFORM_ADMIN_ENV_KEYS].sort()).toEqual(
      [
        'PLATFORM_ADMIN_EMAIL',
        'PLATFORM_ADMIN_FAVICON',
        'PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND',
        'PLATFORM_ADMIN_LOGO_WITH_BACKGROUND',
        'PLATFORM_ADMIN_NAME',
        'PLATFORM_ADMIN_PHONE',
        'PLATFORM_ADMIN_USERNAME',
        'PLATFORM_ADMIN_WEBSITE_COLOR',
      ].sort(),
    );
  });
});
