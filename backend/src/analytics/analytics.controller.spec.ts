import { PATH_METADATA } from '@nestjs/common/constants';
import type { FastifyRequest } from 'fastify';
import { PublicUnifiedAnalyticsController } from './unified-analytics.controller';

describe('PublicUnifiedAnalyticsController', () => {
  it('exposes only the canonical events endpoint', () => {
    const eventsHandler = Object.getOwnPropertyDescriptor(
      PublicUnifiedAnalyticsController.prototype,
      'events',
    )?.value as object;
    const path: unknown = Reflect.getMetadata(PATH_METADATA, eventsHandler);

    expect(path).toBe('events');
  });

  it('rate limits public analytics by client IP', async () => {
    const isRateLimited = jest.fn().mockResolvedValue(false);
    const assertForPublicPages = jest.fn().mockResolvedValue(undefined);
    const controller = new PublicUnifiedAnalyticsController(
      { ingest: jest.fn() } as never,
      { isRateLimited } as never,
      { assertForPublicPages } as never,
    );
    const request = {
      headers: { 'x-forwarded-for': '203.0.113.10' },
      ip: '127.0.0.1',
    } as unknown as FastifyRequest;

    await controller.events({ events: [] }, request);

    expect(isRateLimited).toHaveBeenCalledWith(
      'rl:analytics-v2:203.0.113.10',
      180,
      60,
    );
    expect(assertForPublicPages).toHaveBeenCalledWith('203.0.113.10', []);
  });

  it('rejects public analytics when the IP limit is exceeded', async () => {
    const ingest = jest.fn();
    const controller = new PublicUnifiedAnalyticsController(
      { ingest } as never,
      { isRateLimited: jest.fn().mockResolvedValue(true) } as never,
      { assertForPublicPages: jest.fn() } as never,
    );
    const request = {
      headers: {},
      ip: '203.0.113.11',
    } as unknown as FastifyRequest;

    await expect(
      controller.events({ events: [] }, request),
    ).rejects.toMatchObject({ status: 429 });
    expect(ingest).not.toHaveBeenCalled();
  });
});
