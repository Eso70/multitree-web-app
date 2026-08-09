import type { FastifyRequest } from 'fastify';

export const API_SCOPES = [
  'linktrees:read',
  'linktrees:write',
  'linktrees:publish',
  'linktrees:delete',
  'links:read',
  'links:manage',
  'assets:read',
  'assets:write',
  'slugs:write',
  'schedules:read',
  'schedules:write',
  'templates:read',
  'bulk:write',
  'analytics:read',
  'analytics:export',
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** Narrows an untrusted client-supplied string to a known API scope. */
export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}

export interface ApiPrincipal {
  clientId: string;
  publicClientId: string;
  businessId: string;
  businessName: string;
  subdomain: string;
  environment: 'production' | 'sandbox';
  scopes: ApiScope[];
  monthlyLimit: number;
  requestsPerMinute: number;
}

export type ApiRequest = FastifyRequest & {
  apiPrincipal?: ApiPrincipal;
};
