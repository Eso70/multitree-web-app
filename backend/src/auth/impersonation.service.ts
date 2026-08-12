import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { buildTenantUrl } from '../common/root-domain';
import { SecurityAuditService } from './security-audit.service';
import { SessionService, type SessionUser } from './session.service';
import {
  authHandoffKey,
  createAuthHandoffCode,
  AUTH_HANDOFF_TTL_SECONDS,
  type AuthHandoffPayload,
} from './auth-handoff';

interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

interface ImpersonatingAdmin {
  id: string;
  name: string;
}

/**
 * Platform-administrator impersonation: opening a business dashboard as that
 * business, without the owner's credentials and without a password reset.
 *
 * The administrator never receives a tenant credential. This service mints the
 * same single-use, 60-second, hash-keyed handoff the Google sign-in flow uses,
 * and the tenant's existing consume endpoint is what exchanges it for a
 * host-only session cookie. That keeps one code path responsible for turning a
 * handoff into a session, and it keeps the administrator's own root-domain
 * session untouched: the two cookies are scoped to different hosts, so exiting
 * impersonation returns to a console session that was never disturbed.
 *
 * The resulting session is deliberately weaker than an owner session. It
 * carries `role: 'business'`, so the business's plan entitlements, quotas, and
 * approval rules apply unchanged — impersonation grants the tenant's own
 * access, never platform access. On top of that it is short, never remembered,
 * marked in PostgreSQL, disclosed in the owner's device list, announced by a
 * non-dismissible dashboard banner, and restricted by
 * `impersonation-policy.ts`.
 */
@Injectable()
export class ImpersonationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async start(input: {
    businessId: string;
    admin: ImpersonatingAdmin;
    reason?: string | null;
    context: RequestContext;
  }): Promise<{ redirectUrl: string; expiresInSeconds: number }> {
    if (!this.redis.isAvailable()) {
      throw new ServiceUnavailableException(
        'Impersonation is temporarily unavailable',
      );
    }
    // Minting a tenant session is a critical action, so it is rate limited per
    // administrator independently of the shared authentication limits.
    if (
      await this.redis.isRateLimited(
        `rl:impersonation:${input.admin.id}`,
        10,
        300,
      )
    ) {
      await this.recordAudit(input, 'denied', { reason: 'rate_limited' });
      throw new HttpException(
        'Too many impersonation attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const business = await this.database.query<{
      id: string;
      username: string;
      name: string;
      subdomain: string | null;
      status: string;
    }>(
      `SELECT id, username, name, subdomain, status
       FROM businesses WHERE id = $1`,
      [input.businessId],
    );
    const target = business.rows[0];
    if (!target) {
      await this.recordAudit(input, 'failure', {
        reason: 'business_not_found',
      });
      throw new NotFoundException('Business not found');
    }
    // The shared session lookup only resolves sessions for active businesses,
    // so an impersonated session on a suspended tenant would stop working the
    // moment its Redis entry expired. Fail here instead, with a clear reason.
    if (target.status !== 'active' || !target.subdomain) {
      await this.recordAudit(input, 'failure', {
        reason:
          target.status !== 'active' ? 'business_inactive' : 'no_subdomain',
      });
      throw new ForbiddenException(
        'Only an active business with a subdomain can be opened',
      );
    }

    const code = createAuthHandoffCode();
    const payload: AuthHandoffPayload = {
      kind: 'impersonation',
      // Intentionally unattributed: the session belongs to no owner account, so
      // administrator activity is never recorded as a specific person's work.
      user_id: null,
      business_id: target.id,
      subdomain: target.subdomain,
      username: target.username,
      business_name: target.name,
      rememberDevice: false,
      impersonation: {
        platformAdminId: input.admin.id,
        platformAdminName: input.admin.name,
        ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
      },
    };
    await this.redis.set(
      authHandoffKey(code),
      payload,
      AUTH_HANDOFF_TTL_SECONDS,
    );

    await this.recordAudit(input, 'success', {
      subdomain: target.subdomain,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    });

    return {
      redirectUrl: buildTenantUrl(
        this.applicationBaseUrl(),
        target.subdomain,
        `/business/auth/consume?code=${encodeURIComponent(code)}`,
      ),
      expiresInSeconds: AUTH_HANDOFF_TTL_SECONDS,
    };
  }

  /**
   * Ends an impersonated session from inside the tenant. Separate from business
   * logout so the audit trail records the end of administrator access rather
   * than an owner signing themselves out.
   */
  async end(input: {
    sessionToken: string;
    user: SessionUser;
    context: RequestContext;
  }): Promise<{ consoleUrl: string }> {
    const impersonation = input.user.impersonation;
    if (!impersonation) {
      throw new ForbiddenException('This session is not an impersonation');
    }
    await this.sessions.destroySession(input.sessionToken, input.user);
    await this.securityAudit.record({
      actorType: 'platform-admin',
      actorId: impersonation.platformAdminId,
      actorLabel: impersonation.platformAdminName,
      businessId: input.user.id,
      eventType: 'platform.business.impersonation.end',
      outcome: 'success',
      resourceType: 'business',
      resourceId: input.user.id,
      resourceLabel: input.user.name,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      metadata: { startedAt: impersonation.startedAt },
    });
    return { consoleUrl: this.applicationBaseUrl() };
  }

  private async recordAudit(
    input: {
      businessId: string;
      admin: ImpersonatingAdmin;
      context: RequestContext;
    },
    outcome: 'success' | 'failure' | 'denied',
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.securityAudit.record({
      actorType: 'platform-admin',
      actorId: input.admin.id,
      actorLabel: input.admin.name,
      businessId: input.businessId,
      eventType: 'platform.business.impersonation.start',
      outcome,
      resourceType: 'business',
      resourceId: input.businessId,
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
      metadata,
    });
  }

  private applicationBaseUrl(): string {
    return (
      this.config.get<string>('APP_BASE_URL') ||
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ||
      'http://localhost:3011'
    );
  }
}
