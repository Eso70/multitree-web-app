import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsReadService } from '../analytics/analytics-read.service';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'crypto';
import type { PoolClient } from 'pg';
import { isIP } from 'node:net';
import { SecurityAuditService } from '../auth/security-audit.service';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';
import { AuthorizationService } from '../auth/authorization.service';
import { Capability } from '../auth/capabilities';
import { TemplateAccessService } from '../billing/template-access.service';
import { DatabaseService } from '../database/database.service';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { LinktreesService } from '../linktrees/linktrees.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import {
  DEFAULT_LINKTREE_FOOTER_PHONE,
  DEFAULT_LINKTREE_FOOTER_TEXT,
} from '../common/linktree-defaults';

const CLIENT_SESSION_SECONDS = 30 * 24 * 60 * 60;
const MAX_PENDING_INVITATIONS = 20;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

type InvitationStatus = 'active' | 'submitted' | 'expired';

type InvitationRow = {
  id: string;
  business_id: string;
  client_label: string;
  token_hash: string;
  pin_hash: string;
  status: InvitationStatus;
  failed_pin_attempts: number;
  locked_until: Date | null;
  created_at: Date;
  submitted_at: Date | null;
  expired_at: Date | null;
};

export type ClientLinktreeSession = {
  sessionId: string;
  invitationId: string;
  businessId: string;
  clientLabel: string;
  expiresAt: Date;
};

export type ClientRequestContext = {
  ipAddress: string;
  userAgent: string;
  requestId?: string;
};

@Injectable()
export class ClientLinktreeAccessService {
  private readonly pinSecret: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly templates: TemplateAccessService,
    private readonly linktrees: LinktreesService,
    private readonly securityAudit: SecurityAuditService,
    private readonly accessRules: AccessRuleEnforcementService,
    private readonly authorization: AuthorizationService,
    private readonly analyticsReads: AnalyticsReadService,
    private readonly storage: StorageService,
  ) {
    this.pinSecret = this.config.getOrThrow<string>('SESSION_SECRET');
  }

  async list(businessId: string) {
    const result = await this.database.query<{
      id: string;
      client_label: string;
      status: InvitationStatus;
      created_at: Date;
      submitted_at: Date | null;
      expired_at: Date | null;
      active_session: boolean;
      linktree_id: string | null;
      linktree_name: string | null;
      linktree_slug: string | null;
    }>(
      `SELECT invitation.id, invitation.client_label, invitation.status,
              invitation.created_at, invitation.submitted_at, invitation.expired_at,
              EXISTS (
                SELECT 1 FROM client_linktree_sessions session
                 WHERE session.invitation_id = invitation.id
                   AND session.revoked_at IS NULL
                   AND session.expires_at > NOW()
              ) AS active_session,
              linktree.id AS linktree_id, linktree.name AS linktree_name,
              linktree.seo_name AS linktree_slug
         FROM client_linktree_invitations invitation
         LEFT JOIN linktrees linktree
           ON linktree.client_invitation_id = invitation.id
        WHERE invitation.business_id = $1::uuid
        ORDER BY invitation.created_at DESC
        LIMIT 100`,
      [businessId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      clientLabel: row.client_label,
      status: row.status,
      createdAt: row.created_at,
      submittedAt: row.submitted_at,
      expiredAt: row.expired_at,
      hasActiveSession: row.active_session,
      linktree: row.linktree_id
        ? {
            id: row.linktree_id,
            name: row.linktree_name,
            slug: row.linktree_slug,
          }
        : null,
    }));
  }

  async create(businessId: string, rawLabel: string) {
    const clientLabel = rawLabel.trim();
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hash(rawToken);
    const pin = String(randomInt(100_000, 1_000_000));
    const result = await this.database.transaction(async (client) => {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`client-invitations:${businessId}`],
      );
      const count = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
           FROM client_linktree_invitations
          WHERE business_id = $1::uuid AND status = 'active'`,
        [businessId],
      );
      if (Number(count.rows[0]?.count || 0) >= MAX_PENDING_INVITATIONS) {
        throw new ConflictException(
          'Revoke an unused client invitation before creating another one',
        );
      }
      return client.query<{ id: string; created_at: Date }>(
        `INSERT INTO client_linktree_invitations
           (business_id, client_label, token_hash, pin_hash)
         VALUES ($1::uuid, $2, $3, $4)
         RETURNING id, created_at`,
        [businessId, clientLabel, tokenHash, this.pinHash(tokenHash, pin)],
      );
    });
    return {
      id: result.rows[0].id,
      clientLabel,
      token: rawToken,
      pin,
      createdAt: result.rows[0].created_at,
    };
  }

  async revokeAccess(businessId: string, invitationId: string) {
    await this.requireOwnedInvitation(businessId, invitationId);
    await this.database.transaction(async (client) => {
      await this.lockSubmission(client, invitationId);
      await client.query(
        `UPDATE client_linktree_invitations
            SET status = CASE WHEN status <> 'expired' THEN 'expired' ELSE status END,
                expired_at = CASE WHEN status <> 'expired' THEN NOW() ELSE expired_at END
          WHERE id = $1::uuid AND business_id = $2::uuid`,
        [invitationId, businessId],
      );
      await client.query(
        `UPDATE client_linktree_sessions
            SET revoked_at = COALESCE(revoked_at, NOW())
          WHERE invitation_id = $1::uuid AND revoked_at IS NULL`,
        [invitationId],
      );
    });
  }

  async exchange(rawToken: string, pin: string, context: ClientRequestContext) {
    const tokenHash = this.hash(rawToken);
    if (
      (await this.redis.isRateLimited(
        `rl:client-linktree:ip:${this.hash(context.ipAddress)}`,
        20,
        15 * 60,
      )) ||
      (await this.redis.isRateLimited(
        `rl:client-linktree:invite:${tokenHash}`,
        10,
        15 * 60,
      ))
    ) {
      throw this.tooManyAttempts();
    }

    const client = await this.database.getClient();
    try {
      await client.query('BEGIN');
      const result = await client.query<InvitationRow>(
        `SELECT invitation.* FROM client_linktree_invitations invitation
          JOIN businesses business ON business.id = invitation.business_id
          WHERE invitation.token_hash = $1
            AND business.status = 'active'
          FOR UPDATE`,
        [tokenHash],
      );
      const invitation = result.rows[0];
      if (!invitation || invitation.status === 'expired') {
        await client.query('ROLLBACK');
        await this.auditExchange(invitation, context, 'denied');
        throw new UnauthorizedException('Invalid or inactive invitation');
      }
      if (invitation.locked_until && invitation.locked_until > new Date()) {
        await client.query('ROLLBACK');
        await this.auditExchange(invitation, context, 'denied');
        throw this.tooManyAttempts();
      }
      await this.accessRules.assertAllowed(context.ipAddress, [
        { scope: 'business', businessId: invitation.business_id },
      ]);
      if (!this.matches(this.pinHash(tokenHash, pin), invitation.pin_hash)) {
        const attempts = Number(invitation.failed_pin_attempts) + 1;
        await client.query(
          `UPDATE client_linktree_invitations
              SET failed_pin_attempts = $2,
                  locked_until = CASE WHEN $2 >= $3
                    THEN NOW() + ($4 * INTERVAL '1 minute') ELSE NULL END
            WHERE id = $1::uuid`,
          [
            invitation.id,
            attempts >= MAX_PIN_ATTEMPTS ? 0 : attempts,
            MAX_PIN_ATTEMPTS,
            PIN_LOCK_MINUTES,
          ],
        );
        await client.query('COMMIT');
        await this.auditExchange(invitation, context, 'failure');
        throw new UnauthorizedException('Invalid invitation or PIN');
      }

      const sessionToken = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + CLIENT_SESSION_SECONDS * 1000);
      await client.query(
        `UPDATE client_linktree_sessions
            SET revoked_at = COALESCE(revoked_at, NOW())
          WHERE invitation_id = $1::uuid AND revoked_at IS NULL`,
        [invitation.id],
      );
      await client.query(
        `INSERT INTO client_linktree_sessions
           (invitation_id, session_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1::uuid, $2, $3::inet, $4, $5)`,
        [
          invitation.id,
          this.hash(sessionToken),
          this.auditIp(context.ipAddress),
          context.userAgent.slice(0, 1000),
          expiresAt,
        ],
      );
      await client.query(
        `UPDATE client_linktree_invitations
            SET failed_pin_attempts = 0, locked_until = NULL
          WHERE id = $1::uuid`,
        [invitation.id],
      );
      await client.query('COMMIT');
      await this.auditExchange(invitation, context, 'success');
      return { sessionToken, expiresAt };
    } catch (error) {
      if (
        !['25P01', '2D000'].includes((error as { code?: string }).code || '')
      ) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // The transaction was already completed by a handled denial.
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async requireSession(
    rawToken: string,
    ipAddress: string,
  ): Promise<ClientLinktreeSession> {
    const result = await this.database.query<{
      session_id: string;
      invitation_id: string;
      business_id: string;
      client_label: string;
      expires_at: Date;
    }>(
      `UPDATE client_linktree_sessions session
          SET last_used_at = NOW()
         FROM client_linktree_invitations invitation
         JOIN businesses business
           ON business.id = invitation.business_id
        WHERE session.session_token_hash = $1
          AND session.invitation_id = invitation.id
          AND session.revoked_at IS NULL
          AND session.expires_at > NOW()
          AND invitation.status IN ('active', 'submitted')
          AND business.status = 'active'
      RETURNING session.id AS session_id, invitation.id AS invitation_id,
                invitation.business_id, invitation.client_label, session.expires_at`,
      [this.hash(rawToken)],
    );
    const row = result.rows[0];
    if (!row)
      throw new UnauthorizedException('Client session is no longer active');
    await this.accessRules.assertAllowed(ipAddress, [
      { scope: 'business', businessId: row.business_id },
    ]);
    return {
      sessionId: row.session_id,
      invitationId: row.invitation_id,
      businessId: row.business_id,
      clientLabel: row.client_label,
      expiresAt: row.expires_at,
    };
  }

  async sessionContext(session: ClientLinktreeSession) {
    const existing = await this.existingLinktree(session.invitationId);
    return {
      clientLabel: session.clientLabel,
      expiresAt: session.expiresAt,
      templateKeys: await this.templates.getEffectiveKeys(session.businessId),
      linktree: existing,
    };
  }

  async checkSlug(session: ClientLinktreeSession, slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,100}$/.test(normalized)) {
      throw new BadRequestException('Invalid Linktree slug');
    }
    return this.linktrees.isSlugAvailable(session.businessId, normalized);
  }

  async checkName(session: ClientLinktreeSession, name: string) {
    const normalized = name.trim();
    if (normalized.length < 2 || normalized.length > 200) {
      throw new BadRequestException('Invalid Linktree name');
    }
    return this.linktrees.isNameAvailable(session.businessId, normalized);
  }

  async assertUploadAllowed(
    session: ClientLinktreeSession,
    context: ClientRequestContext,
  ): Promise<void> {
    const [sessionLimited, addressLimited] = await Promise.all([
      this.redis.isRateLimited(
        `rl:client-linktree-upload:session:${session.sessionId}`,
        12,
        60 * 60,
      ),
      this.redis.isRateLimited(
        `rl:client-linktree-upload:ip:${this.hash(context.ipAddress)}`,
        60,
        60 * 60,
      ),
    ]);
    if (sessionLimited || addressLimited) throw this.tooManyAttempts();

    if (await this.existingLinktree(session.invitationId)) {
      throw new ForbiddenException('This Linktree has already been created');
    }
    const decision = await this.authorization.authorize({
      principal: { id: session.businessId, type: 'business' },
      businessId: session.businessId,
      permission: Capability.BusinessLinktreesUpload,
      context: {
        ipAddress: context.ipAddress,
        now: new Date(),
        requestId: context.requestId,
      },
    });
    if (decision.outcome !== 'allow') {
      throw new ForbiddenException('Image uploads are not available');
    }
  }

  async recordUpload(
    session: ClientLinktreeSession,
    context: ClientRequestContext,
  ): Promise<void> {
    await this.securityAudit.record({
      actorType: 'anonymous',
      actorLabel: session.clientLabel,
      businessId: session.businessId,
      eventType: 'client-linktree.asset-uploaded',
      outcome: 'success',
      resourceType: 'asset',
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { invitationId: session.invitationId },
    });
  }

  async analytics(session: ClientLinktreeSession) {
    const linktree = await this.existingLinktree(session.invitationId);
    if (!linktree) throw new NotFoundException('Linktree page not found');
    return this.analyticsReads.getLinktreeDetails(
      session.businessId,
      linktree.id,
    );
  }

  async analyticsSummary(session: ClientLinktreeSession) {
    const details = await this.analytics(session);
    return {
      total_views: details.total_views,
      unique_views: details.unique_views,
      total_clicks: details.total_clicks,
      unique_clicks: details.unique_clicks,
      conversions: details.conversions,
      conversion_value: details.conversion_value,
    };
  }

  async analyticsActions(session: ClientLinktreeSession) {
    const linktree = await this.existingLinktree(session.invitationId);
    if (!linktree) throw new NotFoundException('Linktree page not found');
    return this.analyticsReads.getActions(session.businessId, {
      pageId: linktree.id,
    });
  }

  async submit(
    session: ClientLinktreeSession,
    data: CreateLinktreeDto,
    context: ClientRequestContext,
  ) {
    const lockClient = await this.database.getClient();
    try {
      await lockClient.query(
        'SELECT pg_advisory_lock(hashtextextended($1, 0))',
        [`client-linktree-submit:${session.invitationId}`],
      );
      const current = await this.requireInvitationForSubmission(
        lockClient,
        session,
      );
      const alreadyCreated = await this.existingLinktree(session.invitationId);
      if (alreadyCreated) {
        await this.finalizeSubmission(session.invitationId);
        return alreadyCreated;
      }
      if (current.status !== 'active') {
        throw new ForbiddenException('This invitation is no longer active');
      }
      const decision = await this.authorization.authorize({
        principal: { id: session.businessId, type: 'business' },
        businessId: session.businessId,
        permission: Capability.BusinessLinktreesCreate,
        context: {
          ipAddress: context.ipAddress,
          now: new Date(),
          requestId: context.requestId,
        },
      });
      if (decision.outcome !== 'allow') {
        throw new ForbiddenException(
          'The business can no longer create Linktree pages',
        );
      }

      if (
        data.image &&
        !/^\/images\/upload\/[a-zA-Z0-9._/-]+$/.test(data.image)
      ) {
        throw new BadRequestException('Invalid profile image');
      }
      if (
        !(await this.storage.areBusinessAssetsOwned(
          session.businessId,
          data.image,
          data.template_config,
          data.linkMetadata,
        ))
      ) {
        throw new ForbiddenException(
          'An uploaded asset is not owned by this business',
        );
      }
      const safeData: CreateLinktreeDto = {
        ...data,
        is_default: false,
        footer_text: DEFAULT_LINKTREE_FOOTER_TEXT,
        footer_phone: DEFAULT_LINKTREE_FOOTER_PHONE,
        footer_hidden: true,
      };
      const created = await this.linktrees.createLinktree(
        safeData,
        session.businessId,
        'business',
        session.invitationId,
      );
      await this.finalizeSubmission(session.invitationId);
      const createdId = (created as { id?: string }).id;
      await this.securityAudit.record({
        actorType: 'anonymous',
        actorLabel: session.clientLabel,
        businessId: session.businessId,
        eventType: 'client-linktree.submitted',
        outcome: 'success',
        resourceType: 'linktree',
        resourceId: createdId,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { invitationId: session.invitationId },
      });
      return created;
    } finally {
      try {
        await lockClient.query(
          'SELECT pg_advisory_unlock(hashtextextended($1, 0))',
          [`client-linktree-submit:${session.invitationId}`],
        );
      } finally {
        lockClient.release();
      }
    }
  }

  private async requireInvitationForSubmission(
    client: PoolClient,
    session: ClientLinktreeSession,
  ): Promise<InvitationRow> {
    const result = await client.query<InvitationRow>(
      `SELECT invitation.*
         FROM client_linktree_invitations invitation
         JOIN businesses business ON business.id = invitation.business_id
         JOIN client_linktree_sessions session
           ON session.invitation_id = invitation.id
        WHERE invitation.id = $1::uuid
          AND invitation.business_id = $2::uuid
          AND session.id = $3::uuid
          AND session.revoked_at IS NULL
          AND session.expires_at > NOW()
          AND business.status = 'active'`,
      [session.invitationId, session.businessId, session.sessionId],
    );
    if (!result.rows[0]) {
      throw new UnauthorizedException('Client session is no longer active');
    }
    return result.rows[0];
  }

  private async lockSubmission(client: PoolClient, invitationId: string) {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`client-linktree-submit:${invitationId}`],
    );
  }

  private async existingLinktree(invitationId: string) {
    const result = await this.database.query<{
      id: string;
      name: string;
      seo_name: string;
      uid: string;
      status: string;
      subtitle: string | null;
      description: string | null;
      image: string | null;
      template_key: string | null;
      whatsapp_modal_enabled: boolean | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, name, seo_name, uid, status, subtitle, description, image,
              template_key, whatsapp_modal_enabled, created_at, updated_at
         FROM linktrees WHERE client_invitation_id = $1::uuid`,
      [invitationId],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          name: row.name,
          slug: row.seo_name,
          uid: row.uid,
          status: row.status,
          subtitle: row.subtitle,
          description: row.description,
          image: row.image,
          templateKey: row.template_key,
          whatsappModalEnabled: row.whatsapp_modal_enabled,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  private async finalizeSubmission(invitationId: string) {
    await this.database.query(
      `UPDATE client_linktree_invitations
          SET status = 'submitted', submitted_at = COALESCE(submitted_at, NOW())
        WHERE id = $1::uuid AND status <> 'expired'`,
      [invitationId],
    );
  }

  private async requireOwnedInvitation(businessId: string, id: string) {
    const result = await this.database.query<{ id: string }>(
      `SELECT id FROM client_linktree_invitations
        WHERE id = $1::uuid AND business_id = $2::uuid`,
      [id, businessId],
    );
    if (!result.rows[0])
      throw new NotFoundException('Client invitation not found');
  }

  private async auditExchange(
    invitation: InvitationRow | undefined,
    context: ClientRequestContext,
    outcome: 'success' | 'failure' | 'denied',
  ) {
    await this.securityAudit.record({
      actorType: 'anonymous',
      actorLabel: invitation?.client_label,
      businessId: invitation?.business_id,
      eventType: 'client-linktree.pin-exchange',
      outcome,
      resourceType: 'client-linktree-invitation',
      resourceId: invitation?.id,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private pinHash(tokenHash: string, pin: string): string {
    return createHmac('sha256', this.pinSecret)
      .update(`${tokenHash}:${pin}`)
      .digest('hex');
  }

  private matches(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private auditIp(value: string): string | null {
    const normalized = value
      .split(',')[0]
      .trim()
      .replace(/^::ffff:/, '')
      .split('%')[0];
    return isIP(normalized) && normalized !== '0.0.0.0' ? normalized : null;
  }

  private tooManyAttempts(): HttpException {
    return new HttpException(
      'Too many attempts. Try again later',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
