import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DatabaseService } from '../database/database.service';
import { SessionService, type SessionUser } from '../auth/session.service';
import {
  INTERNAL_PROXY_KEY_HEADER,
  isTrustedInternalProxy,
} from '../common/internal-proxy-trust';

export interface CreatorAccessState {
  id: string;
  businessId: string;
  status: 'active' | 'suspended' | 'expired' | 'archived';
  canWrite: boolean;
}

export type CreatorRequest = FastifyRequest & {
  user?: SessionUser;
  sessionToken?: string;
  creator?: CreatorAccessState;
};

@Injectable()
export class CreatorGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CreatorRequest>();
    if (this.hasSubdomain(request)) {
      throw new UnauthorizedException(
        'Creator accounts are available only on the main domain',
      );
    }
    const token = request.cookies?.creator_session;
    if (!token) throw new UnauthorizedException('Creator session required');
    const user = await this.sessions.getSessionUser(token);
    if (!user || user.role !== 'creator') {
      throw new UnauthorizedException('Invalid Creator session');
    }
    const result = await this.database.query<{
      id: string;
      business_id: string;
      status: CreatorAccessState['status'];
      can_write: boolean;
    }>(
      `SELECT creator.id, creator.business_id, creator.status,
              (creator.status = 'active' AND (
                creator.paid_started_at IS NOT NULL
                OR creator.trial_started_at IS NULL
                OR creator.trial_ends_at > NOW()
              )) AS can_write
         FROM creator_accounts creator
         JOIN businesses business ON business.id = creator.business_id
        WHERE creator.business_id = $1
          AND business.account_type = 'creator'
          AND business.status = 'active'`,
      [user.id],
    );
    const account = result.rows[0];
    if (!account || account.status === 'archived') {
      throw new UnauthorizedException('Creator account unavailable');
    }
    if (account.status === 'suspended') {
      throw new ForbiddenException('Creator account is suspended');
    }
    request.user = user;
    request.sessionToken = token;
    request.creator = {
      id: account.id,
      businessId: account.business_id,
      status: account.status,
      canWrite: account.can_write,
    };
    return true;
  }

  private hasSubdomain(request: CreatorRequest): boolean {
    if (isTrustedInternalProxy(request.headers[INTERNAL_PROXY_KEY_HEADER])) {
      const forwarded = request.headers['x-subdomain'];
      if (typeof forwarded === 'string' && forwarded.trim()) return true;
    }
    const hostValue =
      request.headers['x-forwarded-host'] || request.headers.host;
    const host = String(
      Array.isArray(hostValue) ? hostValue[0] : hostValue || '',
    )
      .split(',')[0]
      .trim()
      .split(':')[0]
      .toLowerCase();
    return host.split('.').filter(Boolean).length > 2;
  }
}
