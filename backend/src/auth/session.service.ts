import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { createHash, randomBytes } from 'crypto';
import { isIP } from 'net';

/**
 * A business session created by a platform administrator rather than by the
 * owner. Carried on the session itself so every consumer — guards, the audit
 * interceptor, and the dashboard banner — sees the same fact, including after
 * a Redis eviction rebuilds the session from PostgreSQL.
 */
export interface SessionImpersonation {
  platformAdminId: string;
  platformAdminName: string;
  startedAt: string;
}

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'business' | 'platform-admin';
  subdomain?: string;
  userId?: string;
  impersonation?: SessionImpersonation;
}

export interface ManagedSession {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_used_at: Date;
  created_at: Date;
  session_expires_at: Date;
  remembered: boolean;
  is_current: boolean;
  /** Set when a platform administrator opened this session, not the owner. */
  impersonated_by: string | null;
}

export interface LoginActivity {
  id: string;
  outcome: 'success' | 'failure' | 'denied';
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  private businessTokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createBusinessSession(input: {
    businessId: string;
    userId: string | null;
    ipAddress: string;
    userAgent: string;
    ttlSeconds?: number;
    rememberDevice?: boolean;
    impersonation?: {
      platformAdminId: string;
      platformAdminName: string;
      reason?: string | null;
    };
    sessionUser?: {
      username: string;
      name: string;
      subdomain: string;
    };
  }): Promise<{ sessionToken: string; ttlSeconds: number }> {
    const sessionToken = randomBytes(32).toString('base64url');
    const tokenHash = this.businessTokenHash(sessionToken);
    // An impersonated session is never remembered: it is short by construction
    // so an administrator who walks away cannot leave a live tenant session
    // behind. Its lifetime is supplied by the caller.
    const ttlSeconds =
      input.ttlSeconds ??
      (input.rememberDevice ? 30 * 24 * 60 * 60 : 12 * 60 * 60);
    const impersonatedBy = input.impersonation?.platformAdminId ?? null;

    const inserted = await this.databaseService.query<{
      impersonation_started_at: Date | null;
    }>(
      `INSERT INTO business_sessions
        (business_id, user_id, session_token_hash, session_expires_at,
         ip_address, user_agent, remembered, last_used_at,
         impersonated_by_platform_admin_id, impersonation_reason,
         impersonation_started_at)
       VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 second'),
               NULLIF($5, '')::inet, $6, $7, NOW(),
               $8, $9, CASE WHEN $8::uuid IS NULL THEN NULL ELSE NOW() END)
       RETURNING impersonation_started_at`,
      [
        input.businessId,
        input.userId,
        tokenHash,
        ttlSeconds,
        input.ipAddress === 'unknown' ? '' : input.ipAddress,
        input.userAgent,
        impersonatedBy ? false : Boolean(input.rememberDevice),
        impersonatedBy,
        input.impersonation?.reason?.trim() || null,
      ],
    );
    // The per-business session cap only ever evicts real sign-ins, and is only
    // ever counted over them. An administrator opening a dashboard must not
    // push a real owner's oldest session out, and an impersonated session must
    // not survive at a real session's expense either.
    const revoked = await this.databaseService.query<{
      session_token_hash: string;
    }>(
      `DELETE FROM business_sessions
       WHERE id IN (
         SELECT id FROM business_sessions
         WHERE business_id = $1
           AND impersonated_by_platform_admin_id IS NULL
         ORDER BY created_at DESC
         OFFSET 5
       )
       RETURNING session_token_hash`,
      [input.businessId],
    );
    await Promise.all(
      revoked.rows.flatMap(({ session_token_hash: hash }) => [
        this.redisService.del(`session:${hash}`),
        this.redisService.untrackBusinessSession(input.businessId, hash),
      ]),
    );
    if (input.sessionUser) {
      const user: SessionUser = {
        id: input.businessId,
        ...(input.userId ? { userId: input.userId } : {}),
        username: input.sessionUser.username,
        name: input.sessionUser.name,
        subdomain: input.sessionUser.subdomain,
        role: 'business',
        ...(input.impersonation
          ? {
              impersonation: {
                platformAdminId: input.impersonation.platformAdminId,
                platformAdminName: input.impersonation.platformAdminName,
                startedAt: (
                  inserted.rows[0]?.impersonation_started_at ?? new Date()
                ).toISOString(),
              },
            }
          : {}),
      };
      await Promise.all([
        this.redisService.set(`session:${tokenHash}`, user, ttlSeconds),
        this.redisService.trackBusinessSession(
          input.businessId,
          tokenHash,
          ttlSeconds,
        ),
      ]);
    }
    return { sessionToken, ttlSeconds };
  }

  async createPlatformAdminSession(input: {
    platformAdminId: string;
    username: string;
    name: string;
    email?: string;
    ipAddress: string;
    userAgent: string;
    rememberDevice?: boolean;
  }): Promise<{
    sessionToken: string;
    ttlSeconds: number;
    user: SessionUser;
  }> {
    const sessionToken = randomBytes(32).toString('base64url');
    const ttlSeconds = input.rememberDevice ? 7 * 24 * 60 * 60 : 30 * 60;
    const candidateIp = input.ipAddress.split(',')[0]?.trim() || '';
    const ipAddress = isIP(candidateIp) ? candidateIp : '127.0.0.1';
    const user: SessionUser = {
      id: input.platformAdminId,
      username: input.username,
      name: input.name,
      email: input.email,
      role: 'platform-admin',
    };

    const revoked = await this.databaseService.query<{
      session_token: string;
    }>(
      `DELETE FROM platform_admin_sessions
       WHERE platform_admin_id = $1
       RETURNING session_token`,
      [input.platformAdminId],
    );
    await Promise.all(
      revoked.rows.flatMap(({ session_token: token }) => [
        this.redisService.del(`session:${token}`),
        this.redisService.untrackBusinessSession(input.platformAdminId, token),
      ]),
    );
    await this.databaseService.query(
      `INSERT INTO platform_admin_sessions
        (platform_admin_id, session_token, session_expires_at,
         ip_address, user_agent, remembered, last_used_at)
       VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 second'),
               $4::inet, $5, $6, NOW())`,
      [
        input.platformAdminId,
        sessionToken,
        ttlSeconds,
        ipAddress,
        input.userAgent,
        Boolean(input.rememberDevice),
      ],
    );
    await this.redisService.set(`session:${sessionToken}`, user, ttlSeconds);
    await this.redisService.trackBusinessSession(
      input.platformAdminId,
      sessionToken,
      ttlSeconds,
    );
    return { sessionToken, ttlSeconds, user };
  }

  async getSessionUser(sessionToken: string): Promise<SessionUser | null> {
    if (!sessionToken) return null;
    const businessTokenHash = this.businessTokenHash(sessionToken);

    // 1. Check Redis Cache
    const [cachedBusiness, cachedPlatform] = await Promise.all([
      this.redisService.get<SessionUser>(`session:${businessTokenHash}`),
      this.redisService.get<SessionUser>(`session:${sessionToken}`),
    ]);
    const cachedUser = cachedBusiness || cachedPlatform;
    if (cachedUser) {
      return cachedUser;
    }

    // 2. Cache miss: Query Database
    // Check if it is a regular business session
    // The impersonation columns are part of this projection so a Redis
    // eviction cannot silently rebuild an administrator's borrowed session as
    // an ordinary owner session.
    const businessResult = await this.databaseService.query<{
      business_id: string;
      user_id: string | null;
      username: string;
      name: string;
      subdomain: string | null;
      session_expires_at: string;
      impersonated_by_platform_admin_id: string | null;
      impersonated_by_name: string | null;
      impersonation_started_at: Date | null;
    }>(
      `SELECT a.id as business_id, s.user_id, a.username, a.name, a.subdomain, s.session_expires_at,
              s.impersonated_by_platform_admin_id,
              admin.name AS impersonated_by_name,
              s.impersonation_started_at
       FROM business_sessions s
       INNER JOIN businesses a ON s.business_id = a.id
       LEFT JOIN platform_admins admin ON admin.id = s.impersonated_by_platform_admin_id
       WHERE s.session_token_hash = $1
         AND s.session_expires_at > NOW()
         AND a.status = 'active'`,
      [businessTokenHash],
    );

    if (businessResult.rows && businessResult.rows.length > 0) {
      const business = businessResult.rows[0];
      const user: SessionUser = {
        id: business.business_id,
        username: business.username,
        name: business.name,
        role: 'business',
        ...(business.subdomain ? { subdomain: business.subdomain } : {}),
        ...(business.user_id ? { userId: business.user_id } : {}),
        ...(business.impersonated_by_platform_admin_id
          ? {
              impersonation: {
                platformAdminId: business.impersonated_by_platform_admin_id,
                platformAdminName:
                  business.impersonated_by_name || 'Platform administrator',
                startedAt: (
                  business.impersonation_started_at ?? new Date()
                ).toISOString(),
              },
            }
          : {}),
      };

      // Cache session in Redis
      await this.cacheSession(
        businessTokenHash,
        user,
        business.session_expires_at,
      );
      return user;
    }

    // The database table keeps its legacy name for a non-destructive upgrade.
    const platformAdminResult = await this.databaseService.query<{
      platform_admin_id: string;
      username: string;
      name: string;
      email: string | null;
      session_expires_at: string;
    }>(
      `SELECT sa.id as platform_admin_id, sa.username, sa.name, sa.email,
              s.session_expires_at
       FROM platform_admin_sessions s
       INNER JOIN platform_admins sa ON s.platform_admin_id = sa.id
       WHERE s.session_token = $1 AND s.session_expires_at > NOW()`,
      [sessionToken],
    );

    if (platformAdminResult.rows && platformAdminResult.rows.length > 0) {
      const platformAdmin = platformAdminResult.rows[0];
      const user: SessionUser = {
        id: platformAdmin.platform_admin_id,
        username: platformAdmin.username,
        name: platformAdmin.name,
        email: platformAdmin.email || undefined,
        role: 'platform-admin',
      };

      // Cache session in Redis
      await this.cacheSession(
        sessionToken,
        user,
        platformAdmin.session_expires_at,
      );
      return user;
    }

    return null;
  }

  private async cacheSession(
    sessionKey: string,
    user: SessionUser,
    expiresAtStr: string,
  ) {
    try {
      const expiresAt = new Date(expiresAtStr).getTime();
      const ttlSeconds = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000),
      );
      if (ttlSeconds > 0) {
        await this.redisService.set(`session:${sessionKey}`, user, ttlSeconds);
        await this.redisService.trackBusinessSession(
          user.id,
          sessionKey,
          ttlSeconds,
        );
      }
    } catch (error) {
      this.logger.warn('Failed to cache session in Redis:', error);
    }
  }

  async destroySession(sessionToken: string, user: SessionUser): Promise<void> {
    // 1. Delete from Redis
    const sessionKey =
      user.role === 'business'
        ? this.businessTokenHash(sessionToken)
        : sessionToken;
    await this.redisService.del(`session:${sessionKey}`);
    await this.redisService.untrackBusinessSession(user.id, sessionKey);

    // 2. Delete from Postgres
    if (user.role === 'platform-admin') {
      await this.databaseService.query(
        'DELETE FROM platform_admin_sessions WHERE session_token = $1',
        [sessionToken],
      );
    } else {
      await this.databaseService.query(
        'DELETE FROM business_sessions WHERE session_token_hash = $1',
        [sessionKey],
      );
    }
  }

  async getBusinessLoginSecurity(businessId: string, currentToken = '') {
    const currentHash = currentToken
      ? this.businessTokenHash(currentToken)
      : '';
    const [sessions, activity] = await Promise.all([
      this.databaseService.query<ManagedSession>(
        // Administrator access is disclosed to the owner rather than hidden:
        // an impersonated session appears in the owner's own device list.
        `SELECT s.id, host(s.ip_address) AS ip_address, s.user_agent, s.last_used_at,
                s.created_at, s.session_expires_at, s.remembered,
                ($2 != '' AND s.session_token_hash = $2) AS is_current,
                admin.name AS impersonated_by
         FROM business_sessions s
         LEFT JOIN platform_admins admin ON admin.id = s.impersonated_by_platform_admin_id
         WHERE s.business_id = $1 AND s.session_expires_at > NOW()
         ORDER BY is_current DESC, s.last_used_at DESC`,
        [businessId, currentHash],
      ),
      this.databaseService.query<LoginActivity>(
        `SELECT id::text, outcome, host(ip_address) AS ip_address,
                user_agent, created_at
         FROM security_audit_events
         WHERE actor_type = 'business'
           AND actor_id = $1
           AND event_type = 'business.login'
         ORDER BY created_at DESC
         LIMIT 10`,
        [businessId],
      ),
    ]);
    return { sessions: sessions.rows, recent_activity: activity.rows };
  }

  async revokeBusinessSession(
    businessId: string,
    sessionId: string,
    currentToken = '',
  ): Promise<void> {
    const currentHash = currentToken
      ? this.businessTokenHash(currentToken)
      : '';
    const result = await this.databaseService.query<{
      session_token_hash: string;
    }>(
      `DELETE FROM business_sessions
       WHERE id = $1 AND business_id = $2
         AND ($3 = '' OR session_token_hash != $3)
       RETURNING session_token_hash`,
      [sessionId, businessId, currentHash],
    );
    const tokenHash = result.rows[0]?.session_token_hash;
    if (!tokenHash) {
      throw new BadRequestException(
        'Session was not found or is the current session',
      );
    }
    await Promise.all([
      this.redisService.del(`session:${tokenHash}`),
      this.redisService.untrackBusinessSession(businessId, tokenHash),
    ]);
  }

  async revokeBusinessSessions(
    businessId: string,
    currentToken = '',
  ): Promise<number> {
    const currentHash = currentToken
      ? this.businessTokenHash(currentToken)
      : '';
    const result = await this.databaseService.query<{
      session_token_hash: string;
    }>(
      `DELETE FROM business_sessions
       WHERE business_id = $1 AND ($2 = '' OR session_token_hash != $2)
       RETURNING session_token_hash`,
      [businessId, currentHash],
    );
    await Promise.all(
      result.rows.flatMap(({ session_token_hash: hash }) => [
        this.redisService.del(`session:${hash}`),
        this.redisService.untrackBusinessSession(businessId, hash),
      ]),
    );
    return result.rows.length;
  }
}
