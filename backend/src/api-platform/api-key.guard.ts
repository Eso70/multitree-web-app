import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyReply } from 'fastify';
import { DatabaseService } from '../database/database.service';
import { toText } from '../common/coerce';
import { EntitlementService } from '../billing/entitlement.service';
import { RedisService } from '../redis/redis.service';
import type { ApiRequest, ApiScope } from './api-platform.types';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';

interface ClientRow {
  id: string;
  public_client_id: string;
  business_id: string;
  business_name: string;
  subdomain: string;
  environment: 'production' | 'sandbox';
  scopes: ApiScope[];
  key_hash: string;
  ip_allowlist: string[];
  policy_rpm: number | null;
  policy_monthly: number | null;
  policy_auto_suspend: boolean | null;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly pepper: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly entitlements: EntitlementService,
    private readonly accessRules: AccessRuleEnforcementService,
    config: ConfigService,
  ) {
    this.pepper =
      config.get<string>('API_KEY_PEPPER') ||
      config.get<string>('SESSION_SECRET') ||
      '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const authorization = this.header(request.headers.authorization);
    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'missing_api_key',
        message: 'Bearer API key is required',
      });
    }
    const rawKey = authorization.slice(7).trim();
    const separator = rawKey.indexOf('.');
    const prefix = separator > 0 ? rawKey.slice(0, separator) : '';
    if (!prefix || rawKey.length < 40) {
      throw new UnauthorizedException({
        code: 'invalid_api_key',
        message: 'API key is invalid',
      });
    }

    const result = await this.database.query<ClientRow>(
      `SELECT client.id::text, client.client_id AS public_client_id,
              client.business_id::text, business.name AS business_name,
              business.subdomain, client.environment, client.scopes,
              client.key_hash, client.ip_allowlist::text[],
              policy.requests_per_minute AS policy_rpm,
              policy.requests_monthly AS policy_monthly,
              policy.auto_suspend AS policy_auto_suspend
       FROM api_clients client
       JOIN businesses business ON business.id=client.business_id
       LEFT JOIN api_rate_limit_policies policy ON policy.business_id=client.business_id
       WHERE client.key_prefix=$1 AND client.status='active'
         AND client.expires_at > now() AND business.status='active'
       LIMIT 1`,
      [prefix],
    );
    const row = result.rows[0];
    if (!row || !this.matches(rawKey, row.key_hash)) {
      throw new UnauthorizedException({
        code: 'invalid_api_key',
        message: 'API key is invalid or expired',
      });
    }
    if (
      !(await this.entitlements.hasFeature(
        row.business_id,
        'feature.api_access',
      ))
    ) {
      throw new ForbiddenException({
        code: 'api_access_not_in_plan',
        message: 'Business plan does not include API access',
      });
    }

    const remoteIp = this.clientIp(request);
    await this.accessRules.assertAllowed(remoteIp, [
      { scope: 'business', businessId: row.business_id },
      { scope: 'business_api', businessId: row.business_id },
    ]);
    if (row.ip_allowlist.length && !row.ip_allowlist.includes(remoteIp)) {
      throw new ForbiddenException({
        code: 'ip_not_allowed',
        message: 'Request IP is not allowed for this API client',
      });
    }
    const requestsPerMinute = row.policy_rpm || 60;
    const monthlyLimit =
      row.policy_monthly ??
      (await this.entitlements.getInteger(
        row.business_id,
        'limit.api_requests_monthly',
        0,
      ));
    const minuteKey = `api:rate:${row.id}:${new Date().toISOString().slice(0, 16)}`;
    const secondsUntilNextMinute = 60 - new Date().getUTCSeconds();
    if (
      await this.redis.isRateLimited(
        minuteKey,
        requestsPerMinute,
        secondsUntilNextMinute,
      )
    ) {
      throw new HttpException(
        {
          code: 'rate_limit_exceeded',
          message: 'Per-minute API rate limit exceeded',
          retryAfter: secondsUntilNextMinute,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (monthlyLimit !== -1) {
      const usage = await this.database.query<{ count: string }>(
        `SELECT COALESCE(SUM(request_count),0)::bigint AS count FROM api_usage_daily
         WHERE business_id=$1 AND usage_date >= date_trunc('month', CURRENT_DATE)::date`,
        [row.business_id],
      );
      if (Number(usage.rows[0]?.count || 0) >= monthlyLimit) {
        if (row.policy_auto_suspend) {
          await this.database.query(
            `UPDATE api_clients SET status='suspended',updated_at=now()
             WHERE business_id=$1 AND status='active'`,
            [row.business_id],
          );
        }
        throw new HttpException(
          {
            code: 'monthly_quota_exceeded',
            message: 'Monthly API quota exceeded',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    request.apiPrincipal = {
      clientId: row.id,
      publicClientId: row.public_client_id,
      businessId: row.business_id,
      businessName: row.business_name,
      subdomain: row.subdomain,
      environment: row.environment,
      scopes: row.scopes || [],
      monthlyLimit,
      requestsPerMinute,
    };
    reply.header('X-RateLimit-Limit', String(requestsPerMinute));
    void this.database.query(
      'UPDATE api_clients SET last_used_at=now(), updated_at=now() WHERE id=$1',
      [row.id],
    );
    return true;
  }

  private matches(rawKey: string, storedHash: string): boolean {
    const actual = Buffer.from(
      createHmac('sha256', this.pepper).update(rawKey).digest('hex'),
    );
    const expected = Buffer.from(storedHash);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }

  private header(value: unknown): string {
    return Array.isArray(value) ? toText(value[0]) : toText(value);
  }

  private clientIp(request: ApiRequest): string {
    return (request.ip || '').replace(/^::ffff:/, '');
  }
}
