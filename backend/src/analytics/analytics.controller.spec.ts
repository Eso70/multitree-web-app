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
      'rl:analytics-v2:203.0.113.10:invalid',
      180,
      60,
    );
    expect(isRateLimited).toHaveBeenCalledWith(
      'rl:analytics-v2-ip:203.0.113.10',
      5_000,
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

  it('isolates an invalid event while accepting its valid neighbor', async () => {
    const pageId = '22222222-2222-4222-8222-222222222222';
    const eventId = '11111111-1111-4111-8111-111111111111';
    const ingest = jest.fn().mockResolvedValue({
      accepted: true,
      deduplicated: false,
      eventId,
    });
    const assertForPublicPages = jest.fn().mockResolvedValue(undefined);
    const controller = new PublicUnifiedAnalyticsController(
      { ingest } as never,
      { isRateLimited: jest.fn().mockResolvedValue(false) } as never,
      { assertForPublicPages } as never,
    );
    const request = {
      headers: {},
      ip: '203.0.113.12',
    } as unknown as FastifyRequest;

    const result = await controller.events(
      {
        events: [
          {
            eventId,
            pageId,
            eventName: 'page_view',
            visitorId: 'visitor-valid-1',
            sessionId: 'session-valid-1',
            occurredAt: new Date().toISOString(),
          },
          {
            eventId: '33333333-3333-4333-8333-333333333333',
            pageId: 'not-a-uuid',
            eventName: 'page_view',
            visitorId: 'x',
            sessionId: 'session-valid-2',
            occurredAt: new Date().toISOString(),
          },
        ],
      },
      request,
    );

    expect(assertForPublicPages).toHaveBeenCalledWith('203.0.113.12', [pageId]);
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(result.data.accepted).toBe(1);
    expect(result.data.events).toEqual([
      { accepted: true, deduplicated: false, eventId },
      {
        accepted: false,
        deduplicated: false,
        eventId: '33333333-3333-4333-8333-333333333333',
      },
    ]);
  });
});
