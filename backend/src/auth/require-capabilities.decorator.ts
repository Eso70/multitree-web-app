import { SetMetadata } from '@nestjs/common';
import type { Capability } from './capabilities';

export const REQUIRED_CAPABILITIES = 'auth:required-capabilities';

export const RequireCapabilities = (...capabilities: Capability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES, capabilities);
