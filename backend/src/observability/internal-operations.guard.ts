import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalOperationsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const received = this.firstHeader(request.headers['x-operations-key']);
    const expected =
      this.config.get<string>('OPERATIONS_SECRET') ||
      this.config.get<string>('REQUEST_TRACKING_SECRET') ||
      this.config.get<string>('SESSION_SECRET') ||
      '';
    return secretsMatch(received, expected);
  }

  private firstHeader(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] || '' : value || '';
  }
}

export function secretsMatch(received: string, expected: string): boolean {
  if (!received || !expected) return false;
  const actualBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
