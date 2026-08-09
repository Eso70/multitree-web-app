import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import type { SessionUser } from './session.service';
import type { FastifyRequest } from 'fastify';
import { requestIp } from '../common/request-context';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';

type BusinessRequest = FastifyRequest & {
  user?: SessionUser;
  sessionToken?: string;
};

@Injectable()
export class BusinessGuard implements CanActivate {
  private readonly rootDomain: string;

  constructor(
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {
    this.rootDomain = this.configService.get<string>(
      'ROOT_DOMAIN',
      'localhost',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BusinessRequest>();
    const sessionToken = request.cookies?.business_session;

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    const user = await this.sessionService.getSessionUser(sessionToken);

    if (!user || user.role !== 'business') {
      throw new UnauthorizedException('Invalid business session');
    }

    const requestSubdomain = this.extractSubdomain(request);
    const sessionSubdomain = this.normalizeSubdomain(user.subdomain);

    // A valid business session is tenant-scoped. The cookie being valid is not
    // sufficient: it must only authorize requests for the business subdomain
    // stored in that session.
    if (
      !sessionSubdomain ||
      !requestSubdomain ||
      sessionSubdomain !== requestSubdomain
    ) {
      throw new UnauthorizedException('Invalid business session');
    }

    // Attach user and session token to request for decorators
    request.user = user;
    request.sessionToken = sessionToken;

    await this.accessRules.assertAllowed(requestIp(request), [
      { scope: 'business', businessId: user.id },
      { scope: 'business_admin', businessId: user.id },
    ]);

    return true;
  }

  /**
   * Extract subdomain from the request.
   * Priority: x-subdomain header > host header parsing.
   * Returns null/empty string if no subdomain can be determined (root domain).
   */
  private extractSubdomain(request: BusinessRequest): string | null {
    // Check x-subdomain header first (set by Next.js middleware)
    const xSubdomain = this.firstHeaderValue(request.headers?.['x-subdomain']);
    const normalizedHeader = this.normalizeSubdomain(xSubdomain);
    if (normalizedHeader) {
      return normalizedHeader;
    }

    // Fallback: parse from host header
    const host = this.firstHeaderValue(
      request.headers?.['x-forwarded-host'] || request.headers?.['host'],
    );

    // Remove port if present
    const hostWithoutPort = host.split(':')[0].toLowerCase().replace(/\.$/, '');
    const rootDomain = this.rootDomain
      .split(':')[0]
      .toLowerCase()
      .replace(/\.$/, '');

    // Check if host ends with the root domain
    const rootDomainSuffix = `.${rootDomain}`;
    if (hostWithoutPort.endsWith(rootDomainSuffix)) {
      const subdomain = hostWithoutPort
        .slice(0, -rootDomainSuffix.length)
        .split('.')[0];
      return this.normalizeSubdomain(subdomain);
    }

    // Host is the root domain itself or doesn't match — no subdomain
    return null;
  }

  private firstHeaderValue(value: unknown): string {
    const raw: unknown = Array.isArray(value) ? (value as unknown[])[0] : value;
    return typeof raw === 'string' ? raw.split(',')[0].trim() : '';
  }

  private normalizeSubdomain(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)
      ? normalized
      : null;
  }
}
