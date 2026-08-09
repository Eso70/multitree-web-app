import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { FastifyRequest } from 'fastify';

export const Subdomain = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();

    // Check for Next.js header
    const headerValue = request.headers?.['x-subdomain'];
    const xSubdomain = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;
    if (typeof xSubdomain === 'string') {
      const normalized = xSubdomain.trim().toLowerCase();
      if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
        return normalized;
      }
    }

    // Fallback: parse host header
    const hostValue =
      request.headers?.['x-forwarded-host'] || request.headers?.['host'] || '';
    const rawHost = Array.isArray(hostValue) ? hostValue[0] : String(hostValue);
    const host = rawHost
      .split(',')[0]
      .trim()
      .split(':')[0]
      .toLowerCase()
      .replace(/\.$/, '');
    const parts = host.split('.').filter(Boolean);
    if (parts.length > 2) {
      const candidate = parts[0];
      if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(candidate)) {
        return candidate;
      }
    }
    return '';
  },
);
