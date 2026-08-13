import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { GoogleBusinessAuthController } from './business-onboarding.controller';
import type { BusinessOnboardingService } from './business-onboarding.service';

/**
 * Business sign-in is Google OAuth or a tenant-bound email code; there is no
 * password route. These are the cookie-attribute and subdomain-binding checks
 * for the two endpoints that actually mint a business session, and they cover
 * what the withdrawn password-login tests used to assert.
 *
 * The properties that matter here are security properties, not shape:
 * `httpOnly` keeps the token out of scripts, `sameSite=lax` survives Google's
 * top-level callback redirect, `secure` follows the real request scheme rather
 * than being hardcoded, and — most importantly — no `domain` is set, so the
 * cookie stays host-only and a tenant session is never offered to a sibling
 * subdomain.
 */
describe('Business session cookie', () => {
  const HALF_HOUR_IN_SECONDS = 30 * 60;
  const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

  let controller: GoogleBusinessAuthController;
  let onboarding: jest.Mocked<BusinessOnboardingService>;
  let setCookie: jest.Mock;
  let reply: FastifyReply;

  function request(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
    return {
      headers: { 'user-agent': 'jest' },
      protocol: 'http',
      ip: '203.0.113.10',
      ...overrides,
    } as unknown as FastifyRequest;
  }

  interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
    path?: string;
    maxAge?: number;
    domain?: string;
  }

  function businessCookieOptions(): CookieOptions {
    const call = (
      setCookie.mock.calls as [string, string, CookieOptions][]
    ).find(([name]) => name === 'business_session');
    if (!call) throw new Error('No business_session cookie was set');
    return call[2];
  }

  beforeEach(() => {
    setCookie = jest.fn();
    reply = { setCookie } as unknown as FastifyReply;
    onboarding = {
      verifyBusinessEmailCode: jest.fn().mockResolvedValue({
        sessionToken: 'a2f1c7e09b4d4e6a8c1f2d5b7a9e0c31',
        ttlSeconds: HALF_HOUR_IN_SECONDS,
      }),
      consumeHandoff: jest.fn().mockResolvedValue({
        sessionToken: 'b3e2d8f10c5e5f7b9d2a3e6c8b0f1d42',
        ttlSeconds: YEAR_IN_SECONDS,
      }),
      assertRateLimit: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BusinessOnboardingService>;
    controller = new GoogleBusinessAuthController(onboarding);
  });

  describe('email-code sign-in', () => {
    it('sets a host-only, httpOnly, lax cookie scoped to the whole tenant', async () => {
      await controller.verifyEmailCode(
        { challengeId: 'challenge-1', code: '123456' },
        'subdomain',
        request(),
        reply,
      );

      const options = businessCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      // No domain attribute: the cookie must not be sent to sibling subdomains.
      expect(options.domain).toBeUndefined();
    });

    it('marks the cookie secure for an HTTPS request behind a proxy', async () => {
      await controller.verifyEmailCode(
        { challengeId: 'challenge-1', code: '123456' },
        'subdomain',
        request({
          headers: { 'user-agent': 'jest', 'x-forwarded-proto': 'https' },
        }),
        reply,
      );

      expect(businessCookieOptions().secure).toBe(true);
    });

    it('leaves the cookie non-secure for a plain HTTP request', async () => {
      await controller.verifyEmailCode(
        { challengeId: 'challenge-1', code: '123456' },
        'subdomain',
        request(),
        reply,
      );

      expect(businessCookieOptions().secure).toBe(false);
    });

    it('rejects sign-in on the root domain and never sets a cookie', async () => {
      await expect(
        controller.verifyEmailCode(
          { challengeId: 'challenge-1', code: '123456' },
          '',
          request(),
          reply,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(onboarding.verifyBusinessEmailCode).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
    });
  });

  describe('Google handoff consume', () => {
    it('sets the same host-only cookie and honours the remembered TTL', async () => {
      await controller.consumeHandoff(
        { code: 'handoff-code' },
        'subdomain',
        request(),
        reply,
      );

      const options = businessCookieOptions();
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.domain).toBeUndefined();
      expect(options.maxAge).toBe(YEAR_IN_SECONDS);
    });

    it('rejects a handoff without a subdomain and never sets a cookie', async () => {
      await expect(
        controller.consumeHandoff(
          { code: 'handoff-code' },
          '',
          request(),
          reply,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(onboarding.consumeHandoff).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
    });
  });
});
