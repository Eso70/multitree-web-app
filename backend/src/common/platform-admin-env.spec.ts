import {
  PLATFORM_ADMIN_ENV_ALIASES,
  legacyPlatformAdminEnvKey,
  readPlatformAdminEnv,
} from './platform-admin-env';

describe('readPlatformAdminEnv', () => {
  const from = (values: Record<string, string | undefined>) => (name: string) =>
    values[name];

  it('prefers the current PLATFORM_ADMIN_* name', () => {
    const read = from({
      PLATFORM_ADMIN_USERNAME: 'new-admin',
      SA_USERNAME: 'old-admin',
    });
    expect(readPlatformAdminEnv('PLATFORM_ADMIN_USERNAME', read)).toBe(
      'new-admin',
    );
  });

  it('falls back to the deprecated SA_* name', () => {
    const read = from({ SA_USERNAME: 'old-admin' });
    expect(readPlatformAdminEnv('PLATFORM_ADMIN_USERNAME', read)).toBe(
      'old-admin',
    );
  });

  it('treats an empty current value as unset so the alias still applies', () => {
    const read = from({ PLATFORM_ADMIN_NAME: '', SA_NAME: 'MultiTree' });
    expect(readPlatformAdminEnv('PLATFORM_ADMIN_NAME', read)).toBe('MultiTree');
  });

  it('returns undefined when neither name is set', () => {
    expect(
      readPlatformAdminEnv('PLATFORM_ADMIN_PHONE', from({})),
    ).toBeUndefined();
  });

  it('exposes the legacy alias for every supported key', () => {
    for (const key of Object.keys(
      PLATFORM_ADMIN_ENV_ALIASES,
    ) as (keyof typeof PLATFORM_ADMIN_ENV_ALIASES)[]) {
      expect(legacyPlatformAdminEnvKey(key)).toMatch(/^SA_/);
    }
  });

  it('covers every documented initial-administrator setting', () => {
    expect(Object.keys(PLATFORM_ADMIN_ENV_ALIASES).sort()).toEqual(
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
