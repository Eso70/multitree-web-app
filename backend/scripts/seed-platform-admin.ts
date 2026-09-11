import type { PoolClient } from 'pg';
import {
  readPlatformAdminEnv,
  type PlatformAdminEnvKey,
} from '../src/common/platform-admin-env';
import { SPONSOR_KRD_ACCENT_VALUE } from '../src/common/platform-brand';

const fromEnvironment = (name: string) => process.env[name];

/** Reads a current platform-administrator setting from the environment. */
function setting(key: PlatformAdminEnvKey): string | undefined {
  return readPlatformAdminEnv(key, fromEnvironment)?.trim() || undefined;
}

export async function seedPlatformAdmin(client: PoolClient): Promise<void> {
  const username =
    setting('PLATFORM_ADMIN_USERNAME')?.toLowerCase() || 'sponsor-krd-admin';
  const name = setting('PLATFORM_ADMIN_NAME') || 'Sponsor.krd';
  const email = setting('PLATFORM_ADMIN_EMAIL')?.toLowerCase() || null;
  const phone = setting('PLATFORM_ADMIN_PHONE') || null;
  const websiteColor =
    setting('PLATFORM_ADMIN_WEBSITE_COLOR') || SPONSOR_KRD_ACCENT_VALUE;
  const logoWithBackground =
    setting('PLATFORM_ADMIN_LOGO_WITH_BACKGROUND') || '/images/Logo.jpg';
  const logoWithoutBackground =
    setting('PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND') ||
    '/images/DefaultAvatar.png';
  const favicon = setting('PLATFORM_ADMIN_FAVICON') || '/favicon.ico';

  if (!email) {
    console.warn(
      '  ! Sponsor.krd seed skipped: PLATFORM_ADMIN_EMAIL is missing',
    );
    return;
  }

  await client.query(
    `INSERT INTO platform_admins
       (username,name,email,phone,accent_color,logo,avatar,favicon)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (username) DO UPDATE SET
       email=EXCLUDED.email,
       phone=EXCLUDED.phone,
       accent_color=EXCLUDED.accent_color,
       logo=EXCLUDED.logo,
       avatar=EXCLUDED.avatar,
       favicon=EXCLUDED.favicon,
       updated_at=NOW()`,
    [
      username,
      name,
      email,
      phone,
      websiteColor,
      logoWithBackground,
      logoWithoutBackground,
      favicon,
    ],
  );
  console.log('  OK Sponsor.krd seed checked from environment');
}
