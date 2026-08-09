import { ConfigService } from '@nestjs/config';
import { InternalOperationsGuard } from './internal-operations.guard';

describe('InternalOperationsGuard', () => {
  const secret = 'operations-secret-with-at-least-32-characters';

  function context(received?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: received ? { 'x-operations-key': received } : {},
        }),
      }),
    };
  }

  it('accepts the operations secret', () => {
    const config = {
      get: jest.fn((key) => (key === 'OPERATIONS_SECRET' ? secret : undefined)),
    };
    const guard = new InternalOperationsGuard(
      config as unknown as ConfigService,
    );

    expect(guard.canActivate(context(secret) as never)).toBe(true);
  });

  it('rejects missing and incorrect secrets', () => {
    const config = {
      get: jest.fn((key) => (key === 'OPERATIONS_SECRET' ? secret : undefined)),
    };
    const guard = new InternalOperationsGuard(
      config as unknown as ConfigService,
    );

    expect(guard.canActivate(context() as never)).toBe(false);
    expect(guard.canActivate(context('incorrect') as never)).toBe(false);
  });
});
