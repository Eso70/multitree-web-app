/**
 * Initial platform-administrator settings are read only from the current
 * `PLATFORM_ADMIN_*` environment variables.
 */
export const PLATFORM_ADMIN_ENV_KEYS = [
  'PLATFORM_ADMIN_USERNAME',
  'PLATFORM_ADMIN_NAME',
  'PLATFORM_ADMIN_EMAIL',
  'PLATFORM_ADMIN_PHONE',
  'PLATFORM_ADMIN_WEBSITE_COLOR',
  'PLATFORM_ADMIN_LOGO_WITH_BACKGROUND',
  'PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND',
  'PLATFORM_ADMIN_FAVICON',
] as const;

export type PlatformAdminEnvKey = (typeof PLATFORM_ADMIN_ENV_KEYS)[number];

/**
 * `read` is supplied by the caller so this works with both NestJS
 * `ConfigService` and a bare `process.env` lookup.
 */
export function readPlatformAdminEnv(
  key: PlatformAdminEnvKey,
  read: (name: string) => string | undefined,
): string | undefined {
  return read(key) || undefined;
}
