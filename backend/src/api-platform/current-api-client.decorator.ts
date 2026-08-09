import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApiPrincipal, ApiRequest } from './api-platform.types';

export const CurrentApiClient = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ApiPrincipal | undefined =>
    context.switchToHttp().getRequest<ApiRequest>().apiPrincipal,
);
