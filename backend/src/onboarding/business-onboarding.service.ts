import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import {
  GoogleIdentityService,
  type VerifiedGoogleIdentity,
} from '../auth/google-identity.service';
import { SessionService } from '../auth/session.service';
import { StorageService } from '../storage/storage.service';
import {
  DEFAULT_LINKTREE_BACKGROUND_COLOR,
  DEFAULT_LINKTREE_TEMPLATE_KEY,
} from '../common/linktree-defaults';
import type {
  ReviewSignupApplicationDto,
  UpdateSignupApplicationDto,
} from './dto/onboarding.dto';
import { SecurityAuditService } from '../auth/security-audit.service';
import { MailService } from '../mail/mail.service';
import { buildTenantUrl } from '../common/root-domain';
import {
  authHandoffKey,
  createAuthHandoffCode,
  AUTH_HANDOFF_TTL_SECONDS,
  IMPERSONATION_SESSION_TTL_SECONDS,
  type AuthHandoffPayload,
} from '../auth/auth-handoff';

export const TERMS_VERSION = '2026-08-09';
export const PRIVACY_VERSION = '2026-08-09';
const SIGNUP_SESSION_SECONDS = 2 * 60 * 60;
const DEFAULT_INVITATION_TTL_HOURS = 24;
const DEFAULT_MULTITREE_WEBSITE_COLOR = '#b6f20d';

interface OAuthState {
  mode: 'signup' | 'signin' | 'platform-admin';
  nonce: string;
  verifier: string;
  subdomain?: string;
  invitationId?: string;
  rememberDevice?: boolean;
}

interface SignupSession {
  applicationId: string;
  userId: string;
}

interface BusinessEmailChallenge {
  email: string;
  subdomain: string;
  codeHash: string;
  expiresAt: number;
  attemptsLeft: number;
  authorized: boolean;
  userId?: string;
  businessId?: string;
  username?: string;
  businessName?: string;
}

interface AdminEmailChallenge {
  email: string;
  codeHash: string;
  expiresAt: number;
  attemptsLeft: number;
  authorized: boolean;
}

interface SignupEmailChallenge {
  invitationId: string;
  email: string;
  codeHash: string;
  expiresAt: number;
  attemptsLeft: number;
  authorized: boolean;
}

@Injectable()
export class BusinessOnboardingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly google: GoogleIdentityService,
    private readonly sessions: SessionService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly securityAudit?: SecurityAuditService,
    private readonly mail?: MailService,
  ) {}

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private randomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private loginCodeHash(challengeId: string, code: string): string {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('SESSION_SECRET'),
    )
      .update(`${challengeId}:${code}`)
      .digest('hex');
  }

  private rootUrl(path: string): string {
    return new URL(path, this.applicationBaseUrl()).toString();
  }

  private tenantUrl(subdomain: string, path: string): string {
    return buildTenantUrl(this.applicationBaseUrl(), subdomain, path);
  }

  private applicationBaseUrl(): string {
    return (
      this.config.get<string>('APP_BASE_URL') ||
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ||
      'http://localhost:3011'
    );
  }

  private assertTemporaryStore(): void {
    if (!this.redis.isAvailable()) {
      throw new ServiceUnavailableException(
        'Authentication is temporarily unavailable',
      );
    }
  }

  async assertRateLimit(key: string, limit: number, seconds: number) {
    if (
      await this.redis.isRateLimited(`rl:onboarding:${key}`, limit, seconds)
    ) {
      throw new HttpException(
        'Too many requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async createInvitation(adminId: string, email?: string) {
    const token = this.randomToken();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const ttlHours = this.config.get<number>(
      'SIGNUP_INVITATION_TTL_HOURS',
      DEFAULT_INVITATION_TTL_HOURS,
    );
    const result = await this.database.query<{
      id: string;
      expires_at: string;
    }>(
      `INSERT INTO business_signup_invitations
        (token_hash, email, expires_at, created_by)
       VALUES ($1, $2, NOW() + ($4 * INTERVAL '1 hour'), $3)
       RETURNING id, expires_at`,
      [this.hash(token), normalizedEmail, adminId, ttlHours],
    );
    return {
      id: result.rows[0].id,
      email: normalizedEmail,
      expiresAt: result.rows[0].expires_at,
      signupUrl: `${this.rootUrl('/join')}?token=${encodeURIComponent(token)}`,
    };
  }

  async validateInvitation(token: string) {
    const invitation = await this.findInvitation(token);
    return {
      valid: true,
      email: invitation.email,
      expiresAt: invitation.expires_at,
    };
  }

  private async findInvitation(token: string) {
    if (!token || token.length < 32)
      throw new NotFoundException('Invitation not found');
    const result = await this.database.query<{
      id: string;
      email: string | null;
      expires_at: string;
      consumed_at: string | null;
      revoked_at: string | null;
      expired: boolean;
    }>(
      `SELECT id, email, expires_at, consumed_at, revoked_at,
              (expires_at <= NOW()) AS expired
       FROM business_signup_invitations
       WHERE token_hash = $1`,
      [this.hash(token)],
    );
    const invitation = result.rows[0];
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.expired) {
      throw new GoneException('Invitation expired');
    }
    if (invitation.revoked_at) throw new GoneException('Invitation revoked');
    if (invitation.consumed_at)
      throw new GoneException('Invitation already used');
    return invitation;
  }

  async beginGoogleSignup(inviteToken: string): Promise<string> {
    this.assertTemporaryStore();
    const invitation = await this.findInvitation(inviteToken);
    return this.beginOAuth({ mode: 'signup', invitationId: invitation.id });
  }

  async beginGoogleSignin(
    subdomain: string,
    rememberDevice = false,
  ): Promise<string> {
    this.assertTemporaryStore();
    const normalized = this.normalizeSubdomain(subdomain);
    const found = await this.database.query(
      `SELECT 1 FROM businesses WHERE subdomain = $1 AND status = 'active'`,
      [normalized],
    );
    if (!found.rows[0])
      throw new UnauthorizedException('Business sign-in unavailable');
    return this.beginOAuth({
      mode: 'signin',
      subdomain: normalized,
      rememberDevice,
    });
  }

  async requestBusinessEmailCode(emailInput: string, subdomainInput: string) {
    this.assertTemporaryStore();
    const email = emailInput.trim().toLowerCase();
    const subdomain = this.normalizeSubdomain(subdomainInput);
    await this.assertRateLimit(
      `business-email:${subdomain}:${this.hash(email)}`,
      5,
      15 * 60,
    );
    await this.assertRateLimit(
      `business-email-cooldown:${subdomain}:${this.hash(email)}`,
      1,
      60,
    );
    const result = await this.database.query<{
      user_id: string;
      business_id: string;
      username: string;
      business_name: string;
    }>(
      `SELECT user_account.id AS user_id, membership.business_id,
              business.username, business.name AS business_name
       FROM users user_account
       JOIN business_memberships membership ON membership.user_id = user_account.id
         AND membership.status = 'active'
       JOIN businesses business ON business.id = membership.business_id
         AND business.status = 'active'
       WHERE user_account.email = $1 AND business.subdomain = $2`,
      [email, subdomain],
    );
    const membership = result.rows[0];
    const challengeId = this.randomToken();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge: BusinessEmailChallenge = {
      email,
      subdomain,
      codeHash: this.loginCodeHash(challengeId, code),
      expiresAt: Date.now() + 10 * 60_000,
      attemptsLeft: 5,
      authorized: Boolean(membership),
      userId: membership?.user_id,
      businessId: membership?.business_id,
      username: membership?.username,
      businessName: membership?.business_name,
    };
    const key = `business:email-login:${this.hash(challengeId)}`;
    await this.redis.set(key, challenge, 10 * 60);
    if (membership) {
      if (!this.mail) {
        await this.redis.del(key);
        throw new ServiceUnavailableException(
          'Email login is not configured yet',
        );
      }
      try {
        await this.mail.sendBusinessLoginCode(email, code);
      } catch (error) {
        await this.redis.del(key);
        throw error;
      }
    }
    return { challengeId, expiresInSeconds: 600, resendAfterSeconds: 60 };
  }

  async verifyBusinessEmailCode(input: {
    challengeId: string;
    code: string;
    subdomain: string;
    ipAddress: string;
    userAgent: string;
    rememberDevice?: boolean;
  }) {
    this.assertTemporaryStore();
    const key = `business:email-login:${this.hash(input.challengeId || '')}`;
    const challenge = await this.redis.consume<BusinessEmailChallenge>(key);
    const subdomain = this.normalizeSubdomain(input.subdomain);
    if (
      !challenge ||
      challenge.subdomain !== subdomain ||
      challenge.expiresAt <= Date.now()
    ) {
      throw new UnauthorizedException('Email login expired');
    }
    const actual = Buffer.from(
      this.loginCodeHash(input.challengeId, input.code),
      'hex',
    );
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const matches =
      actual.length === expected.length && timingSafeEqual(actual, expected);
    if (
      !challenge.authorized ||
      !challenge.userId ||
      !challenge.businessId ||
      !matches
    ) {
      if (challenge.authorized && challenge.attemptsLeft > 1) {
        challenge.attemptsLeft -= 1;
        await this.redis.set(
          key,
          challenge,
          Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000)),
        );
      }
      throw new UnauthorizedException('Verification code is invalid');
    }
    const session = await this.sessions.createBusinessSession({
      businessId: challenge.businessId,
      userId: challenge.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      rememberDevice: Boolean(input.rememberDevice),
      sessionUser:
        challenge.username && challenge.businessName
          ? {
              username: challenge.username,
              name: challenge.businessName,
              subdomain,
            }
          : undefined,
    });
    await Promise.all([
      this.database.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [challenge.userId],
      ),
      this.securityAudit?.record({
        actorType: 'business',
        actorId: challenge.businessId,
        eventType: 'business.login',
        outcome: 'success',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          provider: 'email',
          rememberDevice: Boolean(input.rememberDevice),
        },
      }),
    ]);
    return session;
  }

  async requestAdminEmailCode(emailInput: string) {
    this.assertTemporaryStore();
    const email = emailInput.trim().toLowerCase();
    await this.assertRateLimit(`admin-email:${this.hash(email)}`, 5, 15 * 60);
    await this.assertRateLimit(
      `admin-email-cooldown:${this.hash(email)}`,
      1,
      60,
    );
    const allowedEmail = this.platformAdminGoogleEmail();
    const result = await this.database.query<{ id: string }>(
      `SELECT id FROM platform_admins
       WHERE lower(email) = $1 AND ($2 = '' OR $1 = $2::text)`,
      [email, allowedEmail],
    );
    const challengeId = this.randomToken();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const authorized = Boolean(result.rows[0]);
    const challenge: AdminEmailChallenge = {
      email,
      codeHash: this.loginCodeHash(challengeId, code),
      expiresAt: Date.now() + 10 * 60_000,
      attemptsLeft: 5,
      authorized,
    };
    const key = `admin:email-login:${this.hash(challengeId)}`;
    await this.redis.set(key, challenge, 10 * 60);
    if (authorized) {
      if (!this.mail) {
        await this.redis.del(key);
        throw new ServiceUnavailableException(
          'Admin email login is not configured yet',
        );
      }
      try {
        await this.mail.sendAdminLoginCode(email, code);
      } catch (error) {
        await this.redis.del(key);
        throw error;
      }
    }
    return { challengeId, expiresInSeconds: 600, resendAfterSeconds: 60 };
  }

  async verifyAdminEmailCode(input: {
    challengeId: string;
    code: string;
    ipAddress: string;
    userAgent: string;
    rememberDevice?: boolean;
  }) {
    this.assertTemporaryStore();
    const key = `admin:email-login:${this.hash(input.challengeId || '')}`;
    const challenge = await this.redis.consume<AdminEmailChallenge>(key);
    if (!challenge || challenge.expiresAt <= Date.now()) {
      throw new UnauthorizedException('Email login expired');
    }
    const actual = Buffer.from(
      this.loginCodeHash(input.challengeId, input.code),
      'hex',
    );
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const matches =
      actual.length === expected.length && timingSafeEqual(actual, expected);
    if (!challenge.authorized || !matches) {
      if (challenge.authorized && challenge.attemptsLeft > 1) {
        challenge.attemptsLeft -= 1;
        await this.redis.set(
          key,
          challenge,
          Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000)),
        );
      }
      throw new UnauthorizedException('Verification code is invalid');
    }
    const adminResult = await this.database.query<{
      id: string;
      username: string;
      name: string;
    }>(
      `SELECT id, username, name
       FROM platform_admins WHERE lower(email) = $1
       ORDER BY created_at ASC LIMIT 1`,
      [challenge.email],
    );
    const admin = adminResult.rows[0];
    if (!admin) throw new UnauthorizedException('Admin account not found');
    const session = await this.sessions.createPlatformAdminSession({
      platformAdminId: admin.id,
      username: admin.username,
      name: admin.name,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      rememberDevice: Boolean(input.rememberDevice),
    });
    await this.securityAudit?.record({
      actorType: 'platform-admin',
      actorId: admin.id,
      actorLabel: admin.name,
      eventType: 'platform_admin.login',
      outcome: 'success',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        provider: 'email',
        rememberDevice: Boolean(input.rememberDevice),
      },
    });
    const consolePath = this.config.get<string>('PLATFORM_ADMIN_PATH')?.trim();
    return {
      sessionToken: session.sessionToken,
      ttlSeconds: session.ttlSeconds,
      redirectUrl: consolePath
        ? this.rootUrl(consolePath)
        : this.rootUrl('/admin'),
    };
  }

  async requestSignupEmailCode(inviteToken: string, emailInput: string) {
    this.assertTemporaryStore();
    const invitation = await this.findInvitation(inviteToken);
    const email = emailInput.trim().toLowerCase();
    await this.assertRateLimit(`signup-email:${this.hash(email)}`, 5, 15 * 60);
    await this.assertRateLimit(
      `signup-email-cooldown:${this.hash(email)}`,
      1,
      60,
    );
    const authorized = !invitation.email || invitation.email === email;
    const challengeId = this.randomToken();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge: SignupEmailChallenge = {
      invitationId: invitation.id,
      email,
      codeHash: this.loginCodeHash(challengeId, code),
      expiresAt: Date.now() + 10 * 60_000,
      attemptsLeft: 5,
      authorized,
    };
    const key = `signup:email-login:${this.hash(challengeId)}`;
    await this.redis.set(key, challenge, 10 * 60);
    if (authorized) {
      if (!this.mail) {
        await this.redis.del(key);
        throw new ServiceUnavailableException(
          'Email signup is not configured yet',
        );
      }
      try {
        await this.mail.sendBusinessSignupCode(email, code);
      } catch (error) {
        await this.redis.del(key);
        throw error;
      }
    }
    return { challengeId, expiresInSeconds: 600, resendAfterSeconds: 60 };
  }

  async verifySignupEmailCode(input: {
    challengeId: string;
    code: string;
    ipAddress: string;
    userAgent: string;
  }) {
    this.assertTemporaryStore();
    const key = `signup:email-login:${this.hash(input.challengeId || '')}`;
    const challenge = await this.redis.consume<SignupEmailChallenge>(key);
    if (!challenge || challenge.expiresAt <= Date.now()) {
      throw new UnauthorizedException('Email sign-up expired');
    }
    const actual = Buffer.from(
      this.loginCodeHash(input.challengeId, input.code),
      'hex',
    );
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const matches =
      actual.length === expected.length && timingSafeEqual(actual, expected);
    if (!challenge.authorized || !matches) {
      if (challenge.authorized && challenge.attemptsLeft > 1) {
        challenge.attemptsLeft -= 1;
        await this.redis.set(
          key,
          challenge,
          Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000)),
        );
      }
      throw new UnauthorizedException('Verification code is invalid');
    }
    const session = await this.finishEmailSignupIdentity(
      challenge.invitationId,
      challenge.email,
    );
    const sessionToken = this.randomToken();
    await this.redis.set(
      `signup:session:${this.hash(sessionToken)}`,
      session satisfies SignupSession,
      SIGNUP_SESSION_SECONDS,
    );
    return {
      sessionToken,
      ttlSeconds: SIGNUP_SESSION_SECONDS,
      redirectUrl: this.rootUrl('/join/application'),
    };
  }

  private async finishEmailSignupIdentity(invitationId: string, email: string) {
    return this.database.transaction(async (client) => {
      const invite = await client.query<{ id: string; email: string | null }>(
        `SELECT id, email FROM business_signup_invitations
         WHERE id = $1 AND revoked_at IS NULL AND consumed_at IS NULL
           AND expires_at > NOW() FOR UPDATE`,
        [invitationId],
      );
      const invitation = invite.rows[0];
      if (!invitation) throw new UnauthorizedException('Invitation expired');
      if (invitation.email && invitation.email !== email) {
        throw new ForbiddenException(
          'Use the email invited by the administrator',
        );
      }
      const emailOwner = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE email = $1`,
        [email],
      );
      let userId = emailOwner.rows[0]?.id;
      if (!userId) {
        const user = await client.query<{ id: string }>(
          `INSERT INTO users (email, display_name)
           VALUES ($1, $2) RETURNING id`,
          [email, email.split('@')[0] || email],
        );
        userId = user.rows[0].id;
      }
      const existingApplication = await client.query<{
        id: string;
        status: string;
        invitation_id: string;
      }>(
        `SELECT id, status, invitation_id FROM business_signup_applications
         WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      const existing = existingApplication.rows[0];
      if (existing?.status === 'approved') {
        throw new ConflictException(
          'This email already owns an approved business',
        );
      }
      let applicationId: string;
      if (existing) {
        const resumed = await client.query<{ id: string }>(
          `UPDATE business_signup_applications
           SET invitation_id = $1, owner_name = $2, owner_email = $2,
               status = CASE WHEN status = 'rejected' THEN 'draft' ELSE status END,
               reviewed_at = CASE WHEN status = 'rejected' THEN NULL ELSE reviewed_at END,
               reviewed_by = CASE WHEN status = 'rejected' THEN NULL ELSE reviewed_by END,
               review_reason = CASE WHEN status = 'rejected' THEN NULL ELSE review_reason END,
               updated_at = NOW()
           WHERE id = $3
           RETURNING id`,
          [invitation.id, email, existing.id],
        );
        applicationId = resumed.rows[0].id;
      } else {
        const application = await client.query<{ id: string }>(
          `INSERT INTO business_signup_applications
            (invitation_id, user_id, owner_name, owner_email)
           VALUES ($1, $2, $3, $3)
           RETURNING id`,
          [invitation.id, userId, email],
        );
        applicationId = application.rows[0].id;
      }
      await client.query(
        `UPDATE business_signup_invitations SET consumed_at = NOW()
         WHERE id = $1`,
        [invitation.id],
      );
      return { applicationId, userId };
    });
  }

  async beginPlatformAdminSignin(rememberDevice = false): Promise<string> {
    this.assertTemporaryStore();
    this.platformAdminGoogleEmail();
    return this.beginOAuth({ mode: 'platform-admin', rememberDevice });
  }

  private async beginOAuth(
    input: Pick<
      OAuthState,
      'mode' | 'subdomain' | 'invitationId' | 'rememberDevice'
    >,
  ): Promise<string> {
    if (!this.google.isConfigured()) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }
    const state = this.randomToken();
    const nonce = this.randomToken();
    const verifier = this.randomToken();
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    await this.redis.set(
      `oauth:state:${this.hash(state)}`,
      { ...input, nonce, verifier } satisfies OAuthState,
      10 * 60,
    );
    return this.google.authorizationUrl({
      state,
      nonce,
      codeChallenge: challenge,
    });
  }

  async finishGoogleCallback(
    code: string,
    state: string,
    requestContext: { ipAddress: string; userAgent: string } = {
      ipAddress: 'unknown',
      userAgent: '',
    },
  ) {
    this.assertTemporaryStore();
    const oauth = await this.redis.consume<OAuthState>(
      `oauth:state:${this.hash(state || '')}`,
    );
    if (!oauth || !code)
      throw new UnauthorizedException('Google sign-in expired');
    const identity = await this.google.exchangeCode({
      code,
      codeVerifier: oauth.verifier,
      nonce: oauth.nonce,
    });
    if (oauth.mode === 'signup') {
      return this.finishSignupIdentity(oauth, identity);
    }
    if (oauth.mode === 'platform-admin') {
      return this.finishPlatformAdminIdentity(
        identity,
        requestContext,
        Boolean(oauth.rememberDevice),
      );
    }
    return this.finishSigninIdentity(oauth, identity, requestContext);
  }

  private platformAdminGoogleEmail(): string {
    const email = this.config
      .get<string>('PLATFORM_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();
    if (!email) {
      throw new ServiceUnavailableException(
        'Platform administrator Google sign-in is not configured',
      );
    }
    return email;
  }

  private async finishPlatformAdminIdentity(
    identity: VerifiedGoogleIdentity,
    requestContext: { ipAddress: string; userAgent: string },
    rememberDevice = false,
  ) {
    const allowedEmail = this.platformAdminGoogleEmail();
    const consolePath = this.config.get<string>('PLATFORM_ADMIN_PATH')?.trim();
    if (!consolePath || !/^\/[a-zA-Z0-9_-]{20,}$/.test(consolePath)) {
      throw new ServiceUnavailableException(
        'Platform administrator path is not configured',
      );
    }
    if (!identity.emailVerified || identity.email !== allowedEmail) {
      await this.securityAudit?.record({
        actorType: 'anonymous',
        eventType: 'platform_admin.login',
        outcome: 'denied',
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { provider: 'google', reason: 'email_not_allowed' },
      });
      throw new UnauthorizedException('Google account is not authorized');
    }

    const result = await this.database.query<{
      id: string;
      username: string;
      name: string;
      email: string | null;
    }>(
      `SELECT id, username, name, email
       FROM platform_admins
       WHERE lower(email) = $1
       ORDER BY created_at ASC`,
      [allowedEmail],
    );
    let admin = result.rows[0];
    if (!admin) {
      const onlyAdmin = await this.database.query<{
        id: string;
        username: string;
        name: string;
        email: string | null;
      }>(
        `SELECT id, username, name, email
         FROM platform_admins
         ORDER BY created_at ASC
         LIMIT 2`,
      );
      if (onlyAdmin.rows.length !== 1) {
        throw new UnauthorizedException('Google account is not authorized');
      }
      admin = onlyAdmin.rows[0];
      await this.database.query(
        `UPDATE platform_admins SET email = $1, updated_at = NOW()
         WHERE id = $2`,
        [allowedEmail, admin.id],
      );
    }
    if (result.rows.length > 1) {
      throw new ConflictException('Platform administrator email is ambiguous');
    }

    const session = await this.sessions.createPlatformAdminSession({
      platformAdminId: admin.id,
      username: admin.username,
      name: admin.name,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      rememberDevice,
    });
    await this.securityAudit?.record({
      actorType: 'platform-admin',
      actorId: admin.id,
      actorLabel: admin.name,
      eventType: 'platform_admin.login',
      outcome: 'success',
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { provider: 'google', rememberDevice },
    });
    return {
      mode: 'platform-admin' as const,
      sessionToken: session.sessionToken,
      ttlSeconds: session.ttlSeconds,
      redirectUrl: this.rootUrl(consolePath),
    };
  }

  private async finishSignupIdentity(
    oauth: OAuthState,
    identity: VerifiedGoogleIdentity,
  ) {
    if (!oauth.invitationId) throw new UnauthorizedException('Invalid signup');
    const result = await this.database.transaction(async (client) => {
      const invite = await client.query<{ id: string; email: string | null }>(
        `SELECT id, email FROM business_signup_invitations
         WHERE id = $1 AND revoked_at IS NULL AND consumed_at IS NULL
           AND expires_at > NOW() FOR UPDATE`,
        [oauth.invitationId],
      );
      const invitation = invite.rows[0];
      if (!invitation) throw new UnauthorizedException('Invitation expired');
      if (invitation.email && invitation.email !== identity.email) {
        throw new ForbiddenException(
          'Use the Google account invited by the administrator',
        );
      }
      const existingIdentity = await client.query<{ user_id: string }>(
        `SELECT user_id FROM user_identities
         WHERE provider = 'google' AND provider_subject = $1`,
        [identity.subject],
      );
      let userId = existingIdentity.rows[0]?.user_id;
      if (!userId) {
        const emailOwner = await client.query(
          'SELECT 1 FROM users WHERE email = $1',
          [identity.email],
        );
        if (emailOwner.rows[0]) {
          throw new ConflictException(
            'This email requires administrator-assisted account linking',
          );
        }
        const user = await client.query<{ id: string }>(
          `INSERT INTO users (email, display_name, avatar_url)
           VALUES ($1, $2, $3) RETURNING id`,
          [identity.email, identity.name, identity.avatarUrl],
        );
        userId = user.rows[0].id;
        await client.query(
          `INSERT INTO user_identities
            (user_id, provider, provider_subject, provider_email,
             email_verified, profile)
           VALUES ($1, 'google', $2, $3, true, $4::jsonb)`,
          [
            userId,
            identity.subject,
            identity.email,
            JSON.stringify({
              name: identity.name,
              picture: identity.avatarUrl,
            }),
          ],
        );
      }
      const existingApplication = await client.query<{
        id: string;
        invitation_id: string;
        status: string;
      }>(
        `SELECT id, invitation_id, status
         FROM business_signup_applications
         WHERE user_id = $1
         FOR UPDATE`,
        [userId],
      );
      const existing = existingApplication.rows[0];
      if (existing?.status === 'approved') {
        throw new ConflictException(
          'This Google account already owns an approved business',
        );
      }

      let applicationId: string;
      if (existing) {
        const resumed = await client.query<{ id: string }>(
          `UPDATE business_signup_applications
           SET invitation_id = $1,
               owner_name = $2,
               owner_email = $3,
               google_avatar_url = $4,
               status = CASE WHEN status = 'rejected' THEN 'draft' ELSE status END,
               reviewed_at = CASE WHEN status = 'rejected' THEN NULL ELSE reviewed_at END,
               reviewed_by = CASE WHEN status = 'rejected' THEN NULL ELSE reviewed_by END,
               review_reason = CASE WHEN status = 'rejected' THEN NULL ELSE review_reason END,
               updated_at = NOW()
           WHERE id = $5
           RETURNING id`,
          [
            invitation.id,
            identity.name,
            identity.email,
            identity.avatarUrl,
            existing.id,
          ],
        );
        applicationId = resumed.rows[0].id;
        await client.query(
          `UPDATE business_signup_invitations
           SET consumed_at = COALESCE(consumed_at, NOW())
           WHERE id = $1`,
          [existing.invitation_id],
        );
      } else {
        const application = await client.query<{ id: string }>(
          `INSERT INTO business_signup_applications
            (invitation_id, user_id, owner_name, owner_email, google_avatar_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            invitation.id,
            userId,
            identity.name,
            identity.email,
            identity.avatarUrl,
          ],
        );
        applicationId = application.rows[0].id;
      }
      await client.query(
        `UPDATE business_signup_invitations SET consumed_at = NOW()
         WHERE id = $1`,
        [invitation.id],
      );
      return { applicationId, userId };
    });
    const sessionToken = this.randomToken();
    await this.redis.set(
      `signup:session:${this.hash(sessionToken)}`,
      result satisfies SignupSession,
      SIGNUP_SESSION_SECONDS,
    );
    return {
      mode: 'signup' as const,
      sessionToken,
      redirectUrl: this.rootUrl('/join/application'),
    };
  }

  private async finishSigninIdentity(
    oauth: OAuthState,
    identity: VerifiedGoogleIdentity,
    requestContext: { ipAddress: string; userAgent: string },
  ) {
    if (!oauth.subdomain) throw new UnauthorizedException('Invalid sign-in');
    const result = await this.database.query<{
      user_id: string;
      business_id: string;
      subdomain: string;
      username: string;
      business_name: string;
    }>(
      `SELECT identity.user_id, membership.business_id, business.subdomain,
              business.username, business.name AS business_name
       FROM user_identities identity
       JOIN business_memberships membership ON membership.user_id = identity.user_id
         AND membership.status = 'active'
       JOIN businesses business ON business.id = membership.business_id
         AND business.status = 'active'
       WHERE identity.provider = 'google' AND identity.provider_subject = $1
         AND business.subdomain = $2`,
      [identity.subject, oauth.subdomain],
    );
    let membership:
      | {
          user_id: string;
          business_id: string;
          subdomain: string;
          username: string;
          business_name: string;
        }
      | undefined = result.rows[0];
    let accountLinked = false;

    if (!membership && identity.emailVerified) {
      membership =
        (await this.database.transaction(async (client) => {
          const candidateResult = await client.query<{
            user_id: string;
            business_id: string;
            subdomain: string;
            username: string;
            business_name: string;
          }>(
            `SELECT user_account.id AS user_id, membership.business_id,
                    business.subdomain, business.username,
                    business.name AS business_name
             FROM users user_account
             JOIN business_signup_applications application
               ON application.user_id = user_account.id
              AND application.status = 'approved'
              AND application.owner_email = user_account.email
             JOIN business_memberships membership
               ON membership.user_id = user_account.id
              AND membership.status = 'active'
             JOIN businesses business
               ON business.id = membership.business_id
              AND business.status = 'active'
              AND application.business_id = business.id
             WHERE user_account.email = $1 AND user_account.status = 'active'
               AND business.subdomain = $2
             FOR UPDATE OF user_account`,
            [identity.email, oauth.subdomain],
          );
          const candidate = candidateResult.rows[0];
          if (!candidate) return null;

          const subjectIdentity = await client.query<{ user_id: string }>(
            `SELECT user_id FROM user_identities
             WHERE provider = 'google' AND provider_subject = $1
             FOR UPDATE`,
            [identity.subject],
          );
          if (
            subjectIdentity.rows[0] &&
            subjectIdentity.rows[0].user_id !== candidate.user_id
          ) {
            return null;
          }

          const userGoogleIdentity = await client.query<{
            provider_subject: string;
          }>(
            `SELECT provider_subject FROM user_identities
             WHERE user_id = $1 AND provider = 'google'
             FOR UPDATE`,
            [candidate.user_id],
          );
          if (
            userGoogleIdentity.rows[0] &&
            userGoogleIdentity.rows[0].provider_subject !== identity.subject
          ) {
            return null;
          }

          if (!subjectIdentity.rows[0]) {
            await client.query(
              `INSERT INTO user_identities
                (user_id, provider, provider_subject, provider_email,
                 email_verified, profile, last_authenticated_at)
               VALUES ($1, 'google', $2, $3, true, $4::jsonb, NOW())`,
              [
                candidate.user_id,
                identity.subject,
                identity.email,
                JSON.stringify({
                  name: identity.name,
                  picture: identity.avatarUrl,
                }),
              ],
            );
          } else {
            await client.query(
              `UPDATE user_identities
               SET provider_email = $2, email_verified = true,
                   profile = $3::jsonb, last_authenticated_at = NOW(),
                   updated_at = NOW()
               WHERE user_id = $1 AND provider = 'google'
                 AND provider_subject = $4`,
              [
                candidate.user_id,
                identity.email,
                JSON.stringify({
                  name: identity.name,
                  picture: identity.avatarUrl,
                }),
                identity.subject,
              ],
            );
          }
          return candidate;
        })) || undefined;
      accountLinked = Boolean(membership);
    }

    if (!membership)
      throw new UnauthorizedException(
        'Google account has no access to this business',
      );
    if (accountLinked) {
      await this.securityAudit?.record({
        actorType: 'business',
        actorId: membership.business_id,
        businessId: membership.business_id,
        eventType: 'business.identity.link',
        outcome: 'success',
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { provider: 'google', method: 'verified_signup_email' },
      });
    }
    const handoff = createAuthHandoffCode();
    const payload: AuthHandoffPayload = {
      ...membership,
      kind: 'login',
      rememberDevice: Boolean(oauth.rememberDevice),
    };
    await Promise.all([
      this.redis.set(
        authHandoffKey(handoff),
        payload,
        AUTH_HANDOFF_TTL_SECONDS,
      ),
      this.database.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [membership.user_id],
      ),
    ]);
    return {
      mode: 'signin' as const,
      redirectUrl: this.tenantUrl(
        membership.subdomain,
        `/business/auth/consume?code=${encodeURIComponent(handoff)}`,
      ),
    };
  }

  async consumeHandoff(input: {
    code: string;
    subdomain: string;
    ipAddress: string;
    userAgent: string;
  }) {
    this.assertTemporaryStore();
    const handoff = await this.redis.consume<AuthHandoffPayload>(
      authHandoffKey(input.code || ''),
    );
    const subdomain = this.normalizeSubdomain(input.subdomain);
    if (!handoff || handoff.subdomain !== subdomain) {
      throw new UnauthorizedException('Sign-in handoff expired');
    }
    // One consume path produces both session kinds. An impersonation handoff
    // yields a short, marked, non-rememberable session; anything else is an
    // ordinary owner sign-in.
    const impersonation =
      handoff.kind === 'impersonation' ? handoff.impersonation : undefined;
    return this.sessions.createBusinessSession({
      businessId: handoff.business_id,
      userId: handoff.user_id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      rememberDevice: impersonation ? false : Boolean(handoff.rememberDevice),
      ...(impersonation
        ? {
            ttlSeconds: IMPERSONATION_SESSION_TTL_SECONDS,
            impersonation: {
              platformAdminId: impersonation.platformAdminId,
              platformAdminName: impersonation.platformAdminName,
              reason: impersonation.reason ?? null,
            },
          }
        : {}),
      sessionUser:
        handoff.username && handoff.business_name
          ? {
              username: handoff.username,
              name: handoff.business_name,
              subdomain,
            }
          : undefined,
    });
  }

  async application(sessionToken: string) {
    const session = await this.signupSession(sessionToken);
    const result = await this.database.query(
      `SELECT id, status, owner_name AS "ownerName", owner_email AS "ownerEmail",
              google_avatar_url AS "googleAvatarUrl", business_name AS "businessName",
              phone, requested_subdomain AS "requestedSubdomain",
              review_reason AS "reviewReason", submitted_at AS "submittedAt"
       FROM business_signup_applications WHERE id = $1 AND user_id = $2`,
      [session.applicationId, session.userId],
    );
    if (!result.rows[0])
      throw new UnauthorizedException('Signup session expired');
    return {
      ...result.rows[0],
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
    };
  }

  async updateApplication(
    sessionToken: string,
    dto: UpdateSignupApplicationDto,
  ) {
    const session = await this.signupSession(sessionToken);
    const subdomain = this.normalizeSubdomain(dto.requestedSubdomain);
    try {
      const result = await this.database.query(
        `UPDATE business_signup_applications SET
           business_name = $1, phone = $2, requested_subdomain = $3,
           terms_version = $4, privacy_version = $5,
           terms_accepted_at = COALESCE(terms_accepted_at, NOW()),
           privacy_accepted_at = COALESCE(privacy_accepted_at, NOW()),
           status = CASE WHEN status = 'changes_requested' THEN 'draft' ELSE status END,
           review_reason = CASE WHEN status = 'changes_requested' THEN NULL ELSE review_reason END
         WHERE id = $6 AND user_id = $7 AND status IN ('draft', 'changes_requested')
         RETURNING id`,
        [
          dto.businessName.trim(),
          dto.phone.trim(),
          subdomain,
          TERMS_VERSION,
          PRIVACY_VERSION,
          session.applicationId,
          session.userId,
        ],
      );
      if (!result.rows[0])
        throw new ConflictException('Application can no longer be edited');
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Subdomain is already reserved');
      }
      throw error;
    }
    return this.application(sessionToken);
  }

  async submitApplication(sessionToken: string) {
    const session = await this.signupSession(sessionToken);
    const result = await this.database.query<{ id: string }>(
      `UPDATE business_signup_applications SET status = 'pending', submitted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'draft'
         AND business_name IS NOT NULL AND phone IS NOT NULL
         AND requested_subdomain IS NOT NULL
         AND terms_version = $3 AND privacy_version = $4
         AND terms_accepted_at IS NOT NULL AND privacy_accepted_at IS NOT NULL
       RETURNING id`,
      [session.applicationId, session.userId, TERMS_VERSION, PRIVACY_VERSION],
    );
    if (!result.rows[0]) {
      const current = (await this.application(sessionToken)) as {
        status?: string;
      };
      if (current.status === 'pending') return current;
      throw new BadRequestException(
        'Complete every required field before submission',
      );
    }
    await this.database.query(
      `INSERT INTO business_signup_application_events
        (application_id, actor_type, actor_id, event_type)
       VALUES ($1, 'applicant', $2, 'submitted')`,
      [session.applicationId, session.userId],
    );
    return this.application(sessionToken);
  }

  async subdomainAvailable(sessionToken: string, raw: string) {
    const session = await this.signupSession(sessionToken);
    const subdomain = this.normalizeSubdomain(raw);
    const result = await this.database.query(
      `SELECT 1 FROM businesses WHERE subdomain = $1
       UNION ALL
       SELECT 1 FROM business_signup_applications
       WHERE requested_subdomain = $1 AND id != $2
         AND status IN ('draft', 'pending', 'changes_requested', 'approved')
       LIMIT 1`,
      [subdomain, session.applicationId],
    );
    return { subdomain, available: !result.rows[0] };
  }

  private async signupSession(token: string): Promise<SignupSession> {
    if (!token) throw new UnauthorizedException('Signup session required');
    const session = await this.redis.get<SignupSession>(
      `signup:session:${this.hash(token)}`,
    );
    if (!session) throw new UnauthorizedException('Signup session expired');
    return session;
  }

  async listApplications() {
    const result = await this.database.query(
      `SELECT application.id, application.status,
              application.owner_name AS "ownerName",
              application.owner_email AS "ownerEmail",
              application.google_avatar_url AS "googleAvatarUrl",
              application.business_name AS "businessName", application.phone,
              application.requested_subdomain AS "requestedSubdomain",
              application.submitted_at AS "submittedAt",
              application.review_reason AS "reviewReason"
       FROM business_signup_applications application
       WHERE application.status IN ('pending', 'changes_requested')
       ORDER BY application.submitted_at NULLS LAST, application.created_at`,
    );
    return result.rows;
  }

  async reviewApplication(
    applicationId: string,
    adminId: string,
    dto: ReviewSignupApplicationDto,
  ) {
    if (dto.action !== 'approve') {
      if (!dto.reason?.trim())
        throw new BadRequestException('Review reason is required');
      const status = dto.action === 'reject' ? 'rejected' : 'changes_requested';
      const result = await this.database.query(
        `UPDATE business_signup_applications SET status = $1, review_reason = $2,
           reviewed_at = NOW(), reviewed_by = $3
         WHERE id = $4 AND status = 'pending' RETURNING id`,
        [status, dto.reason.trim(), adminId, applicationId],
      );
      if (!result.rows[0])
        throw new ConflictException('Application is not pending');
      await this.recordReviewEvent(applicationId, adminId, status, dto.reason);
      return { id: applicationId, status };
    }
    if (!dto.subscriptionPlanId) throw new BadRequestException('Select a plan');
    if (!dto.phoneVerified)
      throw new BadRequestException(
        'Administrator phone verification is required',
      );
    const business = await this.provisionApplication(
      applicationId,
      adminId,
      dto.subscriptionPlanId,
    );
    await this.storage.claimBusinessAssets(business.id, business);
    return { id: applicationId, status: 'approved', businessId: business.id };
  }

  private async provisionApplication(
    applicationId: string,
    adminId: string,
    planId: string,
  ) {
    return this.database.transaction(async (client) => {
      const applicationResult = await client.query<{
        id: string;
        invitation_id: string;
        user_id: string;
        owner_email: string;
        business_name: string;
        phone: string;
        requested_subdomain: string;
        logo: string;
        favicon: string;
        default_avatar: string;
        website_color: string;
      }>(
        `SELECT * FROM business_signup_applications
         WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [applicationId],
      );
      const application = applicationResult.rows[0];
      if (!application)
        throw new ConflictException('Application is not pending');
      const assignment = await client.query<{
        subscription_plan_id: string;
        plan_id: string;
        configuration_id: string;
        trial_days: number;
      }>(
        `SELECT subscription_plan.id AS subscription_plan_id,
                subscription_plan.permission_profile_id AS plan_id,
                configuration.id AS configuration_id,
                subscription_plan.trial_days::int AS trial_days
         FROM billing_subscription_plans subscription_plan
         JOIN billing_plan_configurations configuration
           ON configuration.plan_id = subscription_plan.permission_profile_id
         WHERE subscription_plan.id = $1 AND subscription_plan.status = 'active'
         LIMIT 1`,
        [planId],
      );
      if (!assignment.rows[0])
        throw new BadRequestException('Selected plan is unavailable');
      const businessResult = await client.query<{
        id: string;
        username: string;
        name: string;
        phone: string;
        email: string;
        subdomain: string;
        logo?: string;
        favicon?: string;
        default_avatar?: string;
      }>(
        `INSERT INTO businesses
          (username, name, phone, email, subdomain, status,
           onboarding_step, onboarding_completed_at)
         VALUES ($1, $2, $3, $4, $1, 'active', 1, NULL)
         RETURNING id, username, name, phone, email, subdomain`,
        [
          application.requested_subdomain,
          application.business_name,
          application.phone,
          application.owner_email,
        ],
      );
      const business = businessResult.rows[0];
      const plan = assignment.rows[0];
      await client.query(
        `INSERT INTO business_subscriptions
          (business_id, subscription_plan_id, plan_id, plan_configuration_id,
           status, billing_cycle, current_period_start, current_period_end,
           created_by)
         VALUES ($1, $2, $3, $4, $5, 'free', NOW(),
                 CASE WHEN $6 > 0 THEN NOW() + ($6 * INTERVAL '1 day')
                      ELSE NOW() + INTERVAL '1 year' END, $7)
         ON CONFLICT (business_id) DO UPDATE SET
           subscription_plan_id = EXCLUDED.subscription_plan_id,
           plan_id = EXCLUDED.plan_id,
           plan_configuration_id = EXCLUDED.plan_configuration_id,
           status = EXCLUDED.status,
           billing_cycle = EXCLUDED.billing_cycle,
           current_period_start = EXCLUDED.current_period_start,
           current_period_end = EXCLUDED.current_period_end,
           ended_at = NULL,
           created_by = EXCLUDED.created_by`,
        [
          business.id,
          plan.subscription_plan_id,
          plan.plan_id,
          plan.configuration_id,
          plan.trial_days > 0 ? 'trialing' : 'active',
          plan.trial_days,
          adminId,
        ],
      );
      await client.query(
        `INSERT INTO business_branding
          (business_id, logo, favicon, default_avatar, website_color)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          business.id,
          application.logo || '/images/Logo.jpg',
          application.favicon || '/favicon.ico',
          application.default_avatar || '/images/DefaultAvatar.png',
          application.website_color || DEFAULT_MULTITREE_WEBSITE_COLOR,
        ],
      );
      await client.query(
        `INSERT INTO business_defaults
          (business_id, footer_text, footer_phone, template_key,
           background_color, footer_hidden, whatsapp_enabled)
         VALUES ($1, $2, $3, $4, $5, true, false)`,
        [
          business.id,
          application.business_name,
          application.phone,
          DEFAULT_LINKTREE_TEMPLATE_KEY,
          DEFAULT_LINKTREE_BACKGROUND_COLOR,
        ],
      );
      await client.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [business.id, application.user_id],
      );
      await client.query(
        `UPDATE business_signup_applications SET status = 'approved',
           business_id = $1, reviewed_at = NOW(), reviewed_by = $2,
           selected_subscription_plan_id = $3, phone_verified_at = NOW(),
           phone_verification_method = 'admin_review', review_reason = NULL
         WHERE id = $4`,
        [business.id, adminId, planId, application.id],
      );
      await client.query(
        `UPDATE business_signup_invitations SET consumed_at = NOW()
         WHERE id = $1`,
        [application.invitation_id],
      );
      await this.recordReviewEvent(
        application.id,
        adminId,
        'approved',
        undefined,
        client,
      );
      return {
        ...business,
        logo: application.logo,
        favicon: application.favicon,
        default_avatar: application.default_avatar,
      };
    });
  }

  private async recordReviewEvent(
    applicationId: string,
    adminId: string,
    eventType: string,
    reason?: string,
    client?: PoolClient,
  ) {
    const sql = `INSERT INTO business_signup_application_events
        (application_id, actor_type, actor_id, event_type, metadata)
       VALUES ($1, 'platform-admin', $2, $3, $4::jsonb)`;
    const params = [
      applicationId,
      adminId,
      eventType,
      JSON.stringify(reason ? { reason } : {}),
    ];
    if (client) await client.query(sql, params);
    else await this.database.query(sql, params);
  }

  private normalizeSubdomain(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
      throw new BadRequestException('Invalid subdomain');
    }
    const reserved = new Set([
      'www',
      'api',
      'admin',
      'platform',
      'system',
      'join',
      'login',
      'business',
      'auth',
      'legal',
      'images',
      'fonts',
      'cursors',
      'advertising',
      'bio',
      'linktree',
    ]);
    if (reserved.has(normalized))
      throw new BadRequestException('Subdomain is reserved');
    return normalized;
  }
}
