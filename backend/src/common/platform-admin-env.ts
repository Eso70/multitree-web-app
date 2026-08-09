/**
 * Initial platform-administrator settings are read from `PLATFORM_ADMIN_*`.
 *
 * The original names were `SA_*` ("super admin"). Those are still honoured so
 * an already-deployed `.env` keeps working across the rename, but they are
 * deprecated: set the `PLATFORM_ADMIN_*` name and drop the old one when
 * convenient. The new name always wins when both are present.
 */
export const PLATFORM_ADMIN_ENV_ALIASES = {
  PLATFORM_ADMIN_USERNAME: 'SA_USERNAME',
  PLATFORM_ADMIN_NAME: 'SA_NAME',
  PLATFORM_ADMIN_EMAIL: 'SA_EMAIL',
  PLATFORM_ADMIN_PHONE: 'SA_PHONE',
  PLATFORM_ADMIN_WEBSITE_COLOR: 'SA_WEBSITE_COLOR',
  PLATFORM_ADMIN_LOGO_WITH_BACKGROUND: 'SA_LOGO_WITH_BACKGROUND',
  PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND: 'SA_LOGO_WITHOUT_BACKGROUND',
  PLATFORM_ADMIN_FAVICON: 'SA_FAVICON',
} as const;

export type PlatformAdminEnvKey = keyof typeof PLATFORM_ADMIN_ENV_ALIASES;

/** The deprecated `SA_*` name a given `PLATFORM_ADMIN_*` key falls back to. */
export function legacyPlatformAdminEnvKey(key: PlatformAdminEnvKey): string {
  return PLATFORM_ADMIN_ENV_ALIASES[key];
}

/**
 * Resolves one setting, preferring the current name over its legacy alias.
 *
 * `read` is supplied by the caller so this works with both NestJS
 * `ConfigService` and a bare `process.env` lookup.
 */
export function readPlatformAdminEnv(
  key: PlatformAdminEnvKey,
  read: (name: string) => string | undefined,
): string | undefined {
  const current = read(key);
  if (current !== undefined && current !== null && current !== '') {
    return current;
  }
  return read(PLATFORM_ADMIN_ENV_ALIASES[key]) ?? undefined;
}
