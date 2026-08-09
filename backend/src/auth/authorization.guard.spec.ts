import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard';
import { Capability } from './capabilities';

describe('AuthorizationGuard', () => {
  const authorization = {
    authorize: jest.fn(),
  };
  const createContext = (role?: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role
            ? { id: '00000000-0000-4000-8000-000000000001', role }
            : undefined,
          headers: {},
          ip: '127.0.0.1',
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => authorization.authorize.mockReset());

  it('allows endpoints that do not declare capabilities', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new AuthorizationGuard(reflector, authorization as any);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('allows a business capability for a business session', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([Capability.BusinessLinktreesCreate]),
    } as unknown as Reflector;
    authorization.authorize.mockResolvedValue({
      outcome: 'allow',
      reasonCode: 'GRANTED',
      deniedFields: [],
      approvalFields: [],
      source: 'plan',
    });
    const guard = new AuthorizationGuard(reflector, authorization as any);

    await expect(guard.canActivate(createContext('business'))).resolves.toBe(
      true,
    );
  });

  it('rejects permissions not granted by the principal role', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([Capability.PlatformBusinessesDelete]),
    } as unknown as Reflector;
    authorization.authorize.mockResolvedValue({
      outcome: 'deny',
      reasonCode: 'NO_PERMISSION',
      deniedFields: [],
      approvalFields: [],
      source: 'plan',
    });
    const guard = new AuthorizationGuard(reflector, authorization as any);

    await expect(
      guard.canActivate(createContext('business')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a platform administrator without permission evaluation', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([Capability.PlatformBusinessesDelete]),
    } as unknown as Reflector;
    const guard = new AuthorizationGuard(reflector, authorization as any);

    await expect(
      guard.canActivate(createContext('platform-admin')),
    ).resolves.toBe(true);
    expect(authorization.authorize).not.toHaveBeenCalled();
  });

  it('rejects a missing authenticated principal', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([Capability.BusinessAnalyticsTotalsRead]),
    } as unknown as Reflector;
    const guard = new AuthorizationGuard(reflector, authorization as any);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
