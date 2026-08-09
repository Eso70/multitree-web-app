import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, verify } from 'crypto';
import type { JsonWebKey } from 'crypto';

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

interface GoogleClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nonce?: string;
}

interface GoogleJwk {
  kid?: string;
  [key: string]: unknown;
}

@Injectable()
export class GoogleIdentityService {
  private keys: GoogleJwk[] = [];
  private keysExpireAt = 0;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_CLIENT_ID') &&
      this.config.get<string>('GOOGLE_CLIENT_SECRET') &&
      this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI'),
    );
  }

  authorizationUrl(input: {
    state: string;
    nonce: string;
    codeChallenge: string;
  }): string {
    const clientId = this.required('GOOGLE_CLIENT_ID');
    const redirectUri = this.required('GOOGLE_OAUTH_REDIRECT_URI');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: input.state,
      nonce: input.nonce,
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    nonce: string;
  }): Promise<VerifiedGoogleIdentity> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: input.code,
        client_id: this.required('GOOGLE_CLIENT_ID'),
        client_secret: this.required('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.required('GOOGLE_OAUTH_REDIRECT_URI'),
        grant_type: 'authorization_code',
        code_verifier: input.codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new UnauthorizedException('Google sign-in failed');
    const token = (await response.json()) as { id_token?: string };
    if (!token.id_token)
      throw new UnauthorizedException('Google sign-in failed');
    return this.verifyIdToken(token.id_token, input.nonce);
  }

  private async verifyIdToken(
    token: string,
    expectedNonce: string,
  ): Promise<VerifiedGoogleIdentity> {
    const parts = token.split('.');
    if (parts.length !== 3)
      throw new UnauthorizedException('Invalid Google identity');
    const header = this.decodePart<{ alg?: string; kid?: string }>(parts[0]);
    const claims = this.decodePart<GoogleClaims>(parts[1]);
    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Invalid Google identity');
    }
    const key = (await this.googleKeys()).find(
      (item) => item.kid === header.kid,
    );
    if (!key) {
      this.keysExpireAt = 0;
      const refreshed = (await this.googleKeys()).find(
        (item) => item.kid === header.kid,
      );
      if (!refreshed || !this.validSignature(parts, refreshed)) {
        throw new UnauthorizedException('Invalid Google identity');
      }
    } else if (!this.validSignature(parts, key)) {
      throw new UnauthorizedException('Invalid Google identity');
    }

    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      !claims.sub ||
      !claims.email ||
      claims.email_verified !== true ||
      !claims.exp ||
      claims.exp <= now ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(
        claims.iss || '',
      ) ||
      !audiences.includes(this.required('GOOGLE_CLIENT_ID')) ||
      claims.nonce !== expectedNonce
    ) {
      throw new UnauthorizedException('Invalid Google identity');
    }
    return {
      subject: claims.sub,
      email: claims.email.trim().toLowerCase(),
      name: (claims.name || claims.email.split('@')[0]).trim().slice(0, 150),
      avatarUrl: claims.picture || null,
      emailVerified: true,
    };
  }

  private validSignature(parts: string[], jwk: GoogleJwk): boolean {
    const key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
    return verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      key,
      Buffer.from(parts[2], 'base64url'),
    );
  }

  private async googleKeys(): Promise<GoogleJwk[]> {
    if (this.keys.length && Date.now() < this.keysExpireAt) return this.keys;
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Google sign-in is unavailable');
    }
    const payload = (await response.json()) as { keys?: GoogleJwk[] };
    this.keys = payload.keys || [];
    const maxAge = /max-age=(\d+)/i.exec(
      response.headers.get('cache-control') || '',
    )?.[1];
    this.keysExpireAt = Date.now() + Number(maxAge || 300) * 1000;
    return this.keys;
  }

  private decodePart<T>(part: string): T {
    try {
      return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid Google identity');
    }
  }

  private required(key: string): string {
    const value = this.config.get<string>(key)?.trim();
    if (!value) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }
    return value;
  }
}
