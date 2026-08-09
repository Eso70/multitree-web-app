import type { FastifyRequest } from 'fastify';

/**
 * Where a public request actually came from, and what the edge knows about it.
 *
 * Shared rather than copied per controller: every public endpoint that records
 * a visitor has to read the address, the TikTok cookie and the geo headers the
 * same way, or the same person is attributed differently depending on which
 * endpoint they reached first.
 */

/** The caller's address, preferring what the proxy in front of us reports. */
export function requestIp(request: FastifyRequest): string {
  const forwarded = String(request.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const real = String(request.headers['x-real-ip'] || '').trim();
  return (forwarded || real || request.ip || '0.0.0.0')
    .replace(/^::ffff:/, '')
    .slice(0, 64);
}

export function requestCookie(
  request: FastifyRequest,
  name: string,
): string | undefined {
  const cookies = String(request.headers.cookie || '');
  const match = cookies.match(
    new RegExp(
      `(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]+)`,
    ),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** The first of several header spellings that carries a value. */
export function requestHeader(
  request: FastifyRequest,
  names: string[],
): string | undefined {
  for (const name of names) {
    const value = request.headers[name];
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized && String(normalized).trim()) {
      return String(normalized).trim();
    }
  }
  return undefined;
}

/**
 * The request context the analytics ingest expects, read once from the edge
 * headers so a submission and a page view describe the same visit identically.
 */
export function analyticsRequestContext(request: FastifyRequest): {
  ip: string;
  userAgent: string;
  referrer?: string;
  ttp?: string;
  countryCode?: string;
  region?: string;
  city?: string;
} {
  return {
    ip: requestIp(request),
    userAgent: String(request.headers['user-agent'] || ''),
    referrer: String(request.headers.referer || '') || undefined,
    ttp: requestCookie(request, '_ttp'),
    countryCode: requestHeader(request, [
      'cf-ipcountry',
      'x-vercel-ip-country',
      'x-country-code',
    ])
      ?.toUpperCase()
      .slice(0, 2),
    region: requestHeader(request, [
      'x-vercel-ip-country-region',
      'x-region',
    ])?.slice(0, 120),
    city: requestHeader(request, ['x-vercel-ip-city', 'x-city'])?.slice(0, 120),
  };
}
