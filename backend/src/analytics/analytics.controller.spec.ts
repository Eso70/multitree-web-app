import { PATH_METADATA } from '@nestjs/common/constants';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PublicUnifiedAnalyticsController } from './unified-analytics.controller';

describe('PublicUnifiedAnalyticsController', () => {
  afterEach(() => jest.useRealTimers());

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

  it('commits a tracked navigation at server time before redirecting', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-24T01:33:18.000Z'));
    const pageId = '22222222-2222-4222-8222-222222222222';
    const actionId = '33333333-3333-4333-8333-333333333333';
    const eventId = '11111111-1111-4111-8111-111111111111';
    const ingest = jest.fn().mockResolvedValue({
      accepted: true,
      deduplicated: false,
      eventId,
    });
    const resolveRedirectDestination = jest
      .fn()
      .mockResolvedValue('https://wa.me/9647500000000');
    const controller = new PublicUnifiedAnalyticsController(
      { ingest, resolveRedirectDestination } as never,
      { isRateLimited: jest.fn().mockResolvedValue(false) } as never,
      { assertForPublicPages: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const request = {
      headers: {},
      ip: '203.0.113.20',
    } as unknown as FastifyRequest;
    const header = jest.fn();
    const redirect = jest.fn();
    const reply = { header, redirect } as unknown as FastifyReply;

    await controller.open(
      pageId,
      actionId,
      {
        eventId,
        eventName: 'whatsapp_click',
        visitorId: 'visitor-valid-1',
        sessionId: 'session-valid-1',
        // A random visitor's device clock is far in the future. The verified
        // navigation itself is still current according to the server.
        occurredAt: '2099-01-01T00:00:00.000Z',
        consentState: 'granted',
        browserDispatched: 'true',
        browserEventName: 'Contact',
      },
      request,
      reply,
    );

    expect(resolveRedirectDestination).toHaveBeenCalledWith(
      pageId,
      actionId,
      undefined,
    );
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        pageId,
        actionId,
        eventId,
        occurredAt: '2026-08-24T01:33:18.000Z',
        browserDispatched: true,
        browserEventName: 'Contact',
      }),
      expect.objectContaining({ ip: '203.0.113.20' }),
    );
    expect(redirect).toHaveBeenCalledWith('https://wa.me/9647500000000', 302);
  });

  it('fails analytics open so visitors still reach WhatsApp', async () => {
    const controller = new PublicUnifiedAnalyticsController(
      {
        resolveRedirectDestination: jest
          .fn()
          .mockResolvedValue('https://wa.me/9647500000000'),
        ingest: jest.fn().mockRejectedValue(new Error('database unavailable')),
      } as never,
      { isRateLimited: jest.fn().mockResolvedValue(false) } as never,
      { assertForPublicPages: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const redirect = jest.fn();
    const reply = {
      header: jest.fn(),
      redirect,
    } as unknown as FastifyReply;

    await controller.open(
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      {
        eventId: '11111111-1111-4111-8111-111111111111',
        eventName: 'whatsapp_click',
        visitorId: 'visitor-valid-1',
        sessionId: 'session-valid-1',
        occurredAt: new Date().toISOString(),
      },
      { headers: {}, ip: '203.0.113.21' } as unknown as FastifyRequest,
      reply,
    );

    expect(redirect).toHaveBeenCalledWith('https://wa.me/9647500000000', 302);
  });

  it('redirects when the handoff query is invalid instead of returning 400', async () => {
    const ingest = jest.fn();
    const controller = new PublicUnifiedAnalyticsController(
      {
        resolveRedirectDestination: jest
          .fn()
          .mockResolvedValue('https://wa.me/9647500000000'),
        ingest,
      } as never,
      { isRateLimited: jest.fn() } as never,
      { assertForPublicPages: jest.fn() } as never,
    );
    const redirect = jest.fn();
    const reply = {
      header: jest.fn(),
      redirect,
    } as unknown as FastifyReply;

    await controller.open(
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      { eventId: 'not-a-uuid', visitorId: ['unexpected-array'] },
      { headers: {}, ip: '203.0.113.22' } as unknown as FastifyRequest,
      reply,
    );

    expect(ingest).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('https://wa.me/9647500000000', 302);
  });

  it('bounds oversized attribution and still records the tracked click', async () => {
    const pageId = '22222222-2222-4222-8222-222222222222';
    const actionId = '33333333-3333-4333-8333-333333333333';
    const eventId = '11111111-1111-4111-8111-111111111111';
    const ingest = jest.fn().mockResolvedValue({
      accepted: true,
      deduplicated: false,
      eventId,
    });
    const resolveRedirectDestination = jest
      .fn()
      .mockResolvedValue('https://wa.me/9647500000000');
    const controller = new PublicUnifiedAnalyticsController(
      { ingest, resolveRedirectDestination } as never,
      { isRateLimited: jest.fn().mockResolvedValue(false) } as never,
      { assertForPublicPages: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const reply = {
      header: jest.fn(),
      redirect: jest.fn(),
    } as unknown as FastifyReply;

    await controller.open(
      pageId,
      actionId,
      {
        eventId,
        eventName: 'whatsapp_click',
        visitorId: 'visitor-valid-1',
        sessionId: 'session-valid-1',
        occurredAt: new Date().toISOString(),
        consentState: 'granted',
        browserDispatched: 'true',
        browserEventName: 'Contact',
        pageUrl: `https://example.com/?ttclid=${'a'.repeat(3000)}`,
        referrer: `https://www.tiktok.com/${'b'.repeat(3000)}`,
        ttclid: 'c'.repeat(500),
        ttp: 'd'.repeat(500),
        message: 'e'.repeat(2500),
      },
      { headers: {}, ip: '203.0.113.23' } as unknown as FastifyRequest,
      reply,
    );

    expect(resolveRedirectDestination).toHaveBeenCalledWith(
      pageId,
      actionId,
      'e'.repeat(2000),
    );
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        pageUrl: `https://example.com/?ttclid=${'a'.repeat(3000)}`.slice(
          0,
          2048,
        ),
        referrer: `https://www.tiktok.com/${'b'.repeat(3000)}`.slice(0, 2048),
        ttclid: 'c'.repeat(255),
        ttp: 'd'.repeat(255),
      }),
      expect.any(Object),
    );
    expect(reply.redirect).toHaveBeenCalledWith(
      'https://wa.me/9647500000000',
      302,
    );
  });
});
