import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { requestIp } from '../common/request-context';
import {
  ClientLinktreeAccessService,
  type ClientLinktreeSession,
} from './client-linktree-access.service';

export type ClientLinktreeRequest = FastifyRequest & {
  clientLinktreeSession?: ClientLinktreeSession;
};

@Injectable()
export class ClientLinktreeSessionGuard implements CanActivate {
  constructor(private readonly access: ClientLinktreeAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClientLinktreeRequest>();
    const rawToken = request.cookies?.client_linktree_session;
    if (!rawToken) throw new UnauthorizedException('Client access is required');

    request.clientLinktreeSession = await this.access.requireSession(
      rawToken,
      requestIp(request),
    );
    return true;
  }
}
