import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes } from 'crypto';
import type { PoolClient } from 'pg';
import {
  GoogleIdentityService,
  type VerifiedGoogleIdentity,
} from '../auth/google-identity.service';
import { SecurityAuditService } from '../auth/security-audit.service';
import { SessionService } from '../auth/session.service';
import {
  BUSINESS_FAVICON_PLACEHOLDER,
  BUSINESS_LOGO_PLACEHOLDER,
  DEFAULT_AVATAR,
} from '../common/brand-assets';
import {
  DEFAULT_LINKTREE_BACKGROUND_COLOR,
  DEFAULT_LINKTREE_TEMPLATE_KEY,
} from '../common/linktree-defaults';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

const OAUTH_TTL_SECONDS = 10 * 60;

interface CreatorOAuthState {
  intent: 'login' | 'signup';
  nonce: string;
  verifier: string;
  deviceHmac: string;
  ipHmac: string;
}

interface CreatorAccountIdentity {
  userId: string;
  businessId: string;
  username: string;
  name: string;
  status: string;
  created: boolean;
}

@Injectable()
export class CreatorAuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly google: GoogleIdentityService,
    private readonly sessions: SessionService,
    private readonly audit: SecurityAuditService,
    private readonly config: ConfigService,
  ) {}

  isCreatorOAuthState(state: string): boolean {
    return state.startsWith('creator.');
  }

  async beginGoogleAuth(input: {
    intent: 'login' | 'signup';
    ipAddress: string;
    deviceToken: string;
  }): Promise<string> {
    this.assertTemporaryStore();
    if (!this.google.isConfigured()) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }
    const deviceHmac = this.identityHmac(`device:${input.deviceToken}`);
    const ipHmac = this.identityHmac(`ip:${this.ipPrefix(input.ipAddress)}`);
    await Promise.all([
      this.assertRateLimit(`google-device:${deviceHmac}`, 5, 15 * 60),
      this.assertRateLimit(`google-ip:${ipHmac}`, 20, 15 * 60),
    ]);

    const state = `creator.${this.randomToken()}`;
    const nonce = this.randomToken();
    const verifier = this.randomToken();
    const codeChallenge = createHash('sha256')
      .update(verifier)
      .digest('base64url');
    await this.redis.set(
      this.oauthKey(state),
      {
        intent: input.intent,
        nonce,
        verifier,
        deviceHmac,
        ipHmac,
      } satisfies CreatorOAuthState,
      OAUTH_TTL_SECONDS,
    );
    return this.google.authorizationUrl({ state, nonce, codeChallenge });
  }

  async finishGoogleCallback(
    code: string,
    state: string,
    requestContext: { ipAddress: string; userAgent: string },
  ) {
    this.assertTemporaryStore();
    if (!this.isCreatorOAuthState(state) || !code) {
      throw new UnauthorizedException('Google sign-in expired');
    }
    const oauth = await this.redis.consume<CreatorOAuthState>(
      this.oauthKey(state),
    );
    if (!oauth) throw new UnauthorizedException('Google sign-in expired');

    const identity = await this.google.exchangeCode({
      code,
      codeVerifier: oauth.verifier,
      nonce: oauth.nonce,
    });
    const account = await this.resolveAccount({
      identity,
      intent: oauth.intent,
      deviceHmac: oauth.deviceHmac,
    });
    const session = await this.sessions.createBusinessSession({
      businessId: account.businessId,
      userId: account.userId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      rememberDevice: true,
      sessionRole: 'creator',
      sessionUser: {
        username: account.username,
        name: account.name,
        subdomain: account.username,
      },
    });
    await Promise.all([
      this.database.query(
        'UPDATE creator_accounts SET last_login_at = NOW() WHERE business_id = $1',
        [account.businessId],
      ),
      this.audit.record({
        actorType: 'creator',
        actorId: account.businessId,
        businessId: account.businessId,
        eventType: account.created ? 'creator.account.create' : 'creator.login',
        outcome: 'success',
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: { provider: 'google' },
      }),
      this.recordAttempt({
        email: identity.email,
        deviceHmac: oauth.deviceHmac,
        ipHmac: oauth.ipHmac,
        outcome: account.created ? 'account_created' : 'verified',
      }),
    ]);
    return { ...session, redirectUrl: '/account' };
  }

  private async resolveAccount(input: {
    identity: VerifiedGoogleIdentity;
    intent: 'login' | 'signup';
    deviceHmac: string;
  }): Promise<CreatorAccountIdentity> {
    try {
      return await this.database.transaction((client) =>
        this.resolveAccountTransaction(client, input),
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'This verified Google identity already has a Creator account',
        );
      }
      throw error;
    }
  }

  private async resolveAccountTransaction(
    client: PoolClient,
    input: {
      identity: VerifiedGoogleIdentity;
      intent: 'login' | 'signup';
      deviceHmac: string;
    },
  ): Promise<CreatorAccountIdentity> {
    const subjectIdentity = await client.query<{ user_id: string }>(
      `SELECT user_id FROM user_identities
        WHERE provider = 'google' AND provider_subject = $1
        FOR UPDATE`,
      [input.identity.subject],
    );
    const emailUser = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 FOR UPDATE',
      [input.identity.email],
    );
    const subjectUserId = subjectIdentity.rows[0]?.user_id;
    const emailUserId = emailUser.rows[0]?.id;
    if (subjectUserId && emailUserId && subjectUserId !== emailUserId) {
      throw new ConflictException('Google identity does not match this email');
    }
    const userId = subjectUserId || emailUserId;
    const account = userId ? await this.creatorForUser(client, userId) : null;

    if (account) {
      if (account.status === 'suspended' || account.status === 'archived') {
        throw new ForbiddenException('Creator account is unavailable');
      }
      await this.upsertGoogleIdentity(client, userId, input.identity);
      return { ...account, userId, created: false };
    }
    if (input.intent === 'login') {
      throw new ForbiddenException(
        'No Creator account exists for this Google identity',
      );
    }

    const emailHmac = this.identityHmac(`email:${input.identity.email}`);
    const subjectHmac = this.identityHmac(`google:${input.identity.subject}`);
    const claimed = await client.query(
      `SELECT 1 FROM creator_trial_claims
        WHERE email_hmac = $1 OR google_subject_hmac = $2 OR device_hmac = $3`,
      [emailHmac, subjectHmac, input.deviceHmac],
    );
    if (claimed.rows[0]) {
      throw new ConflictException(
        'This verified Google identity already claimed a Creator trial',
      );
    }

    const resolvedUserId =
      userId || (await this.createUser(client, input.identity));
    await this.upsertGoogleIdentity(client, resolvedUserId, input.identity);
    return this.provisionAccount(client, {
      userId: resolvedUserId,
      identity: input.identity,
      emailHmac,
      subjectHmac,
      deviceHmac: input.deviceHmac,
    });
  }

  private async creatorForUser(client: PoolClient, userId: string) {
    const result = await client.query<{
      business_id: string;
      username: string;
      name: string;
      status: string;
    }>(
      `SELECT creator.business_id, business.username, business.name,
              creator.status
         FROM creator_accounts creator
         JOIN businesses business ON business.id = creator.business_id
        WHERE creator.user_id = $1 AND business.account_type = 'creator'`,
      [userId],
    );
    const row = result.rows[0];
    return row
      ? {
          businessId: row.business_id,
          username: row.username,
          name: row.name,
          status: row.status,
        }
      : null;
  }

  private async createUser(
    client: PoolClient,
    identity: VerifiedGoogleIdentity,
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO users (email, display_name, avatar_url)
       VALUES ($1, $2, $3) RETURNING id`,
      [identity.email, identity.name, identity.avatarUrl],
    );
    return result.rows[0].id;
  }

  private async upsertGoogleIdentity(
    client: PoolClient,
    userId: string,
    identity: VerifiedGoogleIdentity,
  ) {
    const linked = await client.query<{ provider_subject: string }>(
      `SELECT provider_subject FROM user_identities
        WHERE user_id = $1 AND provider = 'google' FOR UPDATE`,
      [userId],
    );
    if (
      linked.rows[0] &&
      linked.rows[0].provider_subject !== identity.subject
    ) {
      throw new ConflictException(
        'A different Google identity is already linked',
      );
    }
    await client.query(
      `INSERT INTO user_identities
        (user_id, provider, provider_subject, provider_email, email_verified,
         profile, last_authenticated_at)
       VALUES ($1, 'google', $2, $3, true, $4::jsonb, NOW())
       ON CONFLICT (provider, provider_subject) DO UPDATE SET
         provider_email = EXCLUDED.provider_email,
         email_verified = true,
         profile = EXCLUDED.profile,
         last_authenticated_at = NOW(),
         updated_at = NOW()`,
      [
        userId,
        identity.subject,
        identity.email,
        JSON.stringify({ name: identity.name, avatarUrl: identity.avatarUrl }),
      ],
    );
    await client.query(
      `UPDATE users SET display_name = $2, avatar_url = $3,
              last_login_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [userId, identity.name, identity.avatarUrl],
    );
  }

  private async provisionAccount(
    client: PoolClient,
    input: {
      userId: string;
      identity: VerifiedGoogleIdentity;
      emailHmac: string;
      subjectHmac: string;
      deviceHmac: string;
    },
  ): Promise<CreatorAccountIdentity> {
    const trialDays = this.config.get<number>('CREATOR_TRIAL_DAYS', 7);
    const username = `creator-${randomBytes(12).toString('hex')}`;
    const business = await client.query<{ id: string }>(
      `INSERT INTO businesses
        (username, name, email, phone, subdomain, status, plan,
         max_linktrees, account_type, onboarding_step,
         onboarding_completed_at)
       VALUES ($1, $2, $3, NULL, $1, 'active', 'trial', 1, 'creator', 3, NOW())
       RETURNING id`,
      [username, input.identity.name, input.identity.email],
    );
    const businessId = business.rows[0].id;
    await client.query(
      `INSERT INTO business_branding
        (business_id, logo, favicon, default_avatar, website_color)
       VALUES ($1, $2, $3, $4, '#b6f20d')`,
      [
        businessId,
        BUSINESS_LOGO_PLACEHOLDER,
        BUSINESS_FAVICON_PLACEHOLDER,
        input.identity.avatarUrl || DEFAULT_AVATAR,
      ],
    );
    await client.query(
      `INSERT INTO business_defaults
        (business_id, footer_text, footer_phone, template_key,
         background_color, footer_hidden, whatsapp_enabled)
       VALUES ($1, $2, NULL, $3, $4, true, false)`,
      [
        businessId,
        input.identity.name,
        DEFAULT_LINKTREE_TEMPLATE_KEY,
        DEFAULT_LINKTREE_BACKGROUND_COLOR,
      ],
    );
    await client.query(
      `INSERT INTO business_memberships (business_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [businessId, input.userId],
    );
    const creator = await client.query<{ id: string }>(
      `INSERT INTO creator_accounts (user_id, business_id, trial_days)
       VALUES ($1, $2, $3) RETURNING id`,
      [input.userId, businessId, trialDays],
    );
    await client.query(
      `INSERT INTO creator_trial_claims
        (email_hmac, google_subject_hmac, device_hmac, creator_account_id)
       VALUES ($1, $2, $3, $4)`,
      [
        input.emailHmac,
        input.subjectHmac,
        input.deviceHmac,
        creator.rows[0].id,
      ],
    );
    return {
      userId: input.userId,
      businessId,
      username,
      name: input.identity.name,
      status: 'active',
      created: true,
    };
  }

  private async assertRateLimit(key: string, limit: number, seconds: number) {
    if (await this.redis.isRateLimited(`rl:creator:${key}`, limit, seconds)) {
      throw new HttpException(
        'Too many requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private assertTemporaryStore() {
    if (!this.redis.isAvailable()) {
      throw new ServiceUnavailableException(
        'Creator authentication is temporarily unavailable',
      );
    }
  }

  private oauthKey(state: string) {
    return `creator:oauth:${this.tokenHash(state)}`;
  }

  private randomToken() {
    return randomBytes(32).toString('base64url');
  }

  private tokenHash(value: string) {
    return createHmac('sha256', this.secret()).update(value).digest('hex');
  }

  private identityHmac(value: string) {
    return createHmac('sha256', this.secret())
      .update(`creator:${value}`)
      .digest('hex');
  }

  private secret() {
    return this.config.getOrThrow<string>('SESSION_SECRET');
  }

  private ipPrefix(ip: string) {
    const value = ip.split(',')[0]?.trim() || 'unknown';
    if (value.includes('.')) return value.split('.').slice(0, 3).join('.');
    if (value.includes(':')) return value.split(':').slice(0, 4).join(':');
    return 'unknown';
  }

  private async recordAttempt(input: {
    email: string;
    deviceHmac: string;
    ipHmac: string;
    outcome: 'verified' | 'account_created';
  }) {
    await this.database.query(
      `INSERT INTO creator_registration_attempts
        (email_hmac, masked_email, device_hmac, ip_prefix_hmac, outcome)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        this.identityHmac(`email:${input.email}`),
        this.maskEmail(input.email),
        input.deviceHmac,
        input.ipHmac,
        input.outcome,
      ],
    );
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    return `${local?.slice(0, 1) || '*'}***@${domain || 'unknown'}`.slice(
      0,
      255,
    );
  }
}
