import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from './session.service';
import type { SessionUser } from './session.service';
import type { FastifyRequest } from 'fastify';
import { requestIp } from '../common/request-context';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';

type PlatformAdminRequest = FastifyRequest & {
  user?: SessionUser;
  sessionToken?: string;
};

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformAdminRequest>();
    const sessionToken = request.cookies?.platform_admin_session;

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    const user = await this.sessionService.getSessionUser(sessionToken);

    if (!user || user.role !== 'platform-admin') {
      throw new UnauthorizedException('Invalid platform administrator session');
    }

    request.user = user;
    request.sessionToken = sessionToken;

    await this.accessRules.assertAllowed(requestIp(request), [
      { scope: 'platform_admin' },
    ]);

    return true;
  }
}
