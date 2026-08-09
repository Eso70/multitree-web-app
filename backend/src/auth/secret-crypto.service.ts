import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

@Injectable()
export class SecretCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret =
      config.get<string>('APP_ENCRYPTION_KEY') ||
      config.get<string>('SESSION_SECRET') ||
      '';
    this.key = createHash('sha256').update(secret).digest();
  }

  encryptJson(value: Record<string, unknown>): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([
      Buffer.from([1]),
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]);
  }

  decryptJson(payload: Buffer): Record<string, unknown> {
    if (payload[0] !== 1 || payload.length < 30) {
      return { legacyValue: payload.toString('utf8') };
    }
    const iv = payload.subarray(1, 13);
    const tag = payload.subarray(13, 29);
    const encrypted = payload.subarray(29);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const parsed: unknown = JSON.parse(decrypted.toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  }

  encryptText(value: string): Buffer {
    return this.encryptJson({ value });
  }

  decryptText(payload: Buffer | null | undefined, fallback = ''): string {
    if (!payload) return fallback;
    const decrypted = this.decryptJson(payload);
    const value = decrypted.value ?? decrypted.legacyValue;
    return typeof value === 'string' ? value : fallback;
  }
}
