import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('keeps liveness independent from downstream services', () => {
    const controller = new HealthController({} as never, {} as never);

    expect(controller.liveness()).toEqual({ status: 'alive' });
  });

  it('returns a service-unavailable response when readiness fails', async () => {
    const result = {
      status: 'not_ready' as const,
      components: { database: { status: 'down' } },
    };
    const controller = new HealthController(
      { readiness: jest.fn().mockResolvedValue(result) } as never,
      {} as never,
    );

    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
