import {
  readPlatformAdminEnv,
  type PlatformAdminEnvKey,
} from '../common/platform-admin-env';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';

export interface PlatformAdminProfile {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  avatar: string | null;
  favicon: string | null;
  accent_color: string;
  accent_ink_color: string;
  app_url: string;
  created_at?: Date;
}

export interface PlatformAdminSession {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_used_at: Date;
  created_at: Date;
  session_expires_at: Date;
  is_current: boolean;
  remembered: boolean;
}

export interface PlatformLoginActivity {
  id: string;
  outcome: 'success' | 'failure' | 'denied';
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly storageService?: StorageService,
  ) {}

  private lookupEnv(name: string): string | undefined {
    return this.configService?.get<string>(name) ?? process.env[name];
  }

  private env(key: string, fallback = ''): string {
    return (this.lookupEnv(key) || fallback).trim();
  }

  /**
   * Reads an initial-administrator setting, preferring the current
   * `PLATFORM_ADMIN_*` name and falling back to its deprecated `SA_*` alias.
   */
  private adminEnv(key: PlatformAdminEnvKey, fallback = ''): string {
    const resolved = readPlatformAdminEnv(key, (name) => this.lookupEnv(name));
    return (resolved || fallback).trim();
  }

  private resolveProfile(profile: PlatformAdminProfile): PlatformAdminProfile {
    return {
      ...profile,
      username: profile.username || this.adminEnv('PLATFORM_ADMIN_USERNAME'),
      name: profile.name || this.adminEnv('PLATFORM_ADMIN_NAME', 'MultiTree'),
      email: profile.email || this.adminEnv('PLATFORM_ADMIN_EMAIL') || null,
      phone: profile.phone || this.adminEnv('PLATFORM_ADMIN_PHONE') || null,
      logo:
        profile.logo ||
        this.adminEnv(
          'PLATFORM_ADMIN_LOGO_WITH_BACKGROUND',
          '/images/Logo.jpg',
        ),
      avatar:
        profile.avatar ||
        // The bare MultiTree mark. This used to point at
        // `/images/DefaultAvatar.png`, which happened to hold the same artwork
        // until that file became the neutral person placeholder every business
        // falls back to. Platform branding now owns its own file so a change to
        // the business default can never repaint MultiTree's logo.
        this.adminEnv(
          'PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND',
          '/images/multitree-logo-mark.png',
        ),
      favicon:
        profile.favicon ||
        this.adminEnv('PLATFORM_ADMIN_FAVICON', '/favicon.ico'),
      accent_color:
        profile.accent_color ||
        this.adminEnv('PLATFORM_ADMIN_WEBSITE_COLOR', '#b6f20d'),
      accent_ink_color: profile.accent_ink_color || '#000000',
      app_url: this.env('NEXT_PUBLIC_APP_URL', 'http://localhost:3011'),
    };
  }

  async getProfile(id: string): Promise<PlatformAdminProfile> {
    const result = await this.databaseService.query<PlatformAdminProfile>(
      `SELECT id, username, name, email, phone, logo, avatar, favicon,
              accent_color, accent_ink_color, created_at
       FROM platform_admins WHERE id = $1`,
      [id],
    );
    const profile = result.rows[0];
    if (!profile)
      throw new NotFoundException('Platform administrator not found');
    return this.resolveProfile(profile);
  }

  async updateProfile(
    id: string,
    data: {
      name?: string;
      username?: string;
      email?: string | null;
      phone?: string | null;
    },
  ): Promise<PlatformAdminProfile> {
    const updates: string[] = [];
    const parameters: unknown[] = [];

    if (data.name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      parameters.push(data.name.trim());
    }
    if (data.username !== undefined) {
      const username = data.username.trim().toLowerCase();
      const duplicate = await this.databaseService.query(
        'SELECT 1 FROM platform_admins WHERE username = $1 AND id != $2',
        [username, id],
      );
      if (duplicate.rows[0]) {
        throw new ConflictException('Username is already in use');
      }
      updates.push(`username = $${updates.length + 1}`);
      parameters.push(username);
    }
    if (data.email !== undefined) {
      const allowedEmail = this.env('PLATFORM_ADMIN_EMAIL').toLowerCase();
      const requestedEmail = data.email?.trim().toLowerCase() || '';
      if (!allowedEmail || requestedEmail !== allowedEmail) {
        throw new BadRequestException(
          'Platform administrator email is controlled by configuration',
        );
      }
      updates.push(`email = $${updates.length + 1}`);
      parameters.push(allowedEmail);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${updates.length + 1}`);
      parameters.push(data.phone?.trim() || null);
    }
    if (updates.length === 0) return this.getProfile(id);

    parameters.push(id);
    const result = await this.databaseService.query<PlatformAdminProfile>(
      `UPDATE platform_admins
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${parameters.length}
       RETURNING id, username, name, email, phone, logo, avatar, favicon,
                 accent_color, accent_ink_color`,
      parameters,
    );
    await this.redisService.deleteByPattern('cache:public:platform-theme');
    return this.resolveProfile(result.rows[0]);
  }

  async getLoginSecurity(adminId: string, currentToken: string) {
    const [sessions, activity] = await Promise.all([
      this.databaseService.query<PlatformAdminSession>(
        `SELECT id, host(ip_address) AS ip_address, user_agent, last_used_at,
                created_at, session_expires_at, remembered,
                (session_token = $2) AS is_current
         FROM platform_admin_sessions
         WHERE platform_admin_id = $1 AND session_expires_at > NOW()
         ORDER BY is_current DESC, last_used_at DESC`,
        [adminId, currentToken],
      ),
      this.databaseService.query<PlatformLoginActivity>(
        `SELECT id::text, outcome, host(ip_address) AS ip_address,
                user_agent, created_at
         FROM security_audit_events
         WHERE actor_type = 'platform-admin'
           AND actor_id = $1
           AND event_type = 'platform_admin.login'
         ORDER BY created_at DESC
         LIMIT 10`,
        [adminId],
      ),
    ]);

    return { sessions: sessions.rows, recent_activity: activity.rows };
  }

  async revokeSession(
    adminId: string,
    sessionId: string,
    currentToken: string,
  ): Promise<void> {
    const result = await this.databaseService.query<{ session_token: string }>(
      `DELETE FROM platform_admin_sessions
       WHERE id = $1 AND platform_admin_id = $2 AND session_token != $3
       RETURNING session_token`,
      [sessionId, adminId, currentToken],
    );
    const token = result.rows[0]?.session_token;
    if (!token) {
      throw new BadRequestException(
        'Session was not found or is the current session',
      );
    }
    await Promise.all([
      this.redisService.del(`session:${token}`),
      this.redisService.untrackBusinessSession(adminId, token),
    ]);
  }

  async revokeOtherSessions(
    adminId: string,
    currentToken: string,
  ): Promise<number> {
    const result = await this.databaseService.query<{ session_token: string }>(
      `DELETE FROM platform_admin_sessions
       WHERE platform_admin_id = $1 AND session_token != $2
       RETURNING session_token`,
      [adminId, currentToken],
    );
    await Promise.all(
      result.rows.flatMap(({ session_token: token }) => [
        this.redisService.del(`session:${token}`),
        this.redisService.untrackBusinessSession(adminId, token),
      ]),
    );
    return result.rows.length;
  }

  async updateBranding(
    id: string,
    data: {
      name?: string;
      logo?: string | null;
      avatar?: string | null;
      favicon?: string | null;
      accent_color?: string;
      accent_ink_color?: string;
    },
  ): Promise<PlatformAdminProfile> {
    const current = this.storageService ? await this.getProfile(id) : null;
    const allowedFields = [
      ['name', data.name?.trim()],
      ['logo', data.logo],
      ['avatar', data.avatar],
      ['favicon', data.favicon],
      ['accent_color', data.accent_color],
      ['accent_ink_color', data.accent_ink_color],
    ] as const;
    const updates: string[] = [];
    const parameters: unknown[] = [];
    for (const [field, value] of allowedFields) {
      if (value !== undefined) {
        parameters.push(value);
        updates.push(`${field} = $${parameters.length}`);
      }
    }
    if (updates.length === 0) return this.getProfile(id);

    parameters.push(id);
    const result = await this.databaseService.query<PlatformAdminProfile>(
      `UPDATE platform_admins
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${parameters.length}
       RETURNING id, username, name, email, phone, logo, avatar, favicon,
                 accent_color, accent_ink_color`,
      parameters,
    );
    await this.storageService?.deleteUnreferencedFromValues(
      data.logo !== undefined && data.logo !== current?.logo
        ? current?.logo
        : null,
      data.avatar !== undefined && data.avatar !== current?.avatar
        ? current?.avatar
        : null,
      data.favicon !== undefined && data.favicon !== current?.favicon
        ? current?.favicon
        : null,
    );
    await this.redisService.deleteByPattern('cache:public:platform-theme');
    return this.resolveProfile(result.rows[0]);
  }

  async getStats() {
    const [businesses, linktrees, analytics] = await Promise.all([
      this.databaseService.query<{ count: string }>(
        'SELECT COUNT(*)::BIGINT AS count FROM businesses',
      ),
      this.databaseService.query<{ count: string }>(
        'SELECT COUNT(*)::BIGINT AS count FROM linktrees',
      ),
      this.databaseService.query<{
        total_views: string;
        total_clicks: string;
      }>(
        `SELECT COALESCE(SUM(total_views), 0)::BIGINT AS total_views,
                COALESCE(SUM(total_clicks), 0)::BIGINT AS total_clicks
         FROM analytics_page_daily`,
      ),
    ]);
    return {
      business_count: Number(businesses.rows[0]?.count || 0),
      linktree_count: Number(linktrees.rows[0]?.count || 0),
      total_views: Number(analytics.rows[0]?.total_views || 0),
      total_clicks: Number(analytics.rows[0]?.total_clicks || 0),
    };
  }

  async flushCache(): Promise<number> {
    return this.redisService.deleteByPattern('cache:*');
  }

  async getTemplateSettings() {
    const result = await this.databaseService.query<{
      template_key: string;
      widget_config: Record<string, unknown>;
      updated_at: Date;
    }>(
      'SELECT template_key, widget_config, updated_at FROM template_global_settings ORDER BY template_key',
    );
    return result.rows;
  }

  async updateTemplateSettings(
    templateKey: string,
    config: Record<string, unknown>,
  ) {
    if (!/^[a-z0-9-]{2,50}$/.test(templateKey)) {
      throw new BadRequestException('Invalid template key');
    }
    const allowed = new Set([
      'buttonRadius',
      'buttonShadow',
      'fontFamily',
      'contentScale',
      'buttonColor',
      'textColor',
    ]);
    const sanitized = Object.fromEntries(
      Object.entries(config || {}).filter(([key]) => allowed.has(key)),
    );
    const result = await this.databaseService.query<{
      template_key: string;
      widget_config: Record<string, unknown>;
      updated_at: Date;
    }>(
      `INSERT INTO template_global_settings (template_key, widget_config, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (template_key) DO UPDATE
       SET widget_config = EXCLUDED.widget_config, updated_at = NOW()
       RETURNING template_key, widget_config, updated_at`,
      [templateKey, JSON.stringify(sanitized)],
    );
    await this.flushCache();
    return result.rows[0];
  }
}
