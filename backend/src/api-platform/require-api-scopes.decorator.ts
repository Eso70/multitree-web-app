import { SetMetadata } from '@nestjs/common';
import type { ApiScope } from './api-platform.types';

export const API_SCOPES_METADATA = 'api-scopes';
export const RequireApiScopes = (...scopes: ApiScope[]) =>
  SetMetadata(API_SCOPES_METADATA, scopes);
