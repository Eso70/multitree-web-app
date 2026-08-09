import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_SCOPES_METADATA } from './require-api-scopes.decorator';
import type { ApiRequest, ApiScope } from './api-platform.types';

@Injectable()
export class ApiScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ApiScope[]>(
      API_SCOPES_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const principal = context
      .switchToHttp()
      .getRequest<ApiRequest>().apiPrincipal;
    if (
      !principal ||
      !required.every((scope) => principal.scopes.includes(scope))
    ) {
      throw new ForbiddenException({
        code: 'insufficient_scope',
        message: 'API client does not have the required scope',
        requiredScopes: required,
      });
    }
    return true;
  }
}
