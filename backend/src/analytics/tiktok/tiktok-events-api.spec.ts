import { TikTokOutboxProcessor } from './tiktok-outbox.processor';

/**
 * The wire format the Events API 2.0 endpoint (v1.3) accepts.
 *
 * These assertions are about the contract, not our own preferences: the
 * endpoint replaced `pixel_code` + `context` with `event_source` /
 * `event_source_id` and a `user` object, and rejects the older shape as a
 * parameter error. A regression here means every server-side event silently
 * stops landing, which looks identical to having no traffic.
 */
type RequestBodyBuilder = {
  requestBody: (
    jobs: Array<{
      pixel_id: string;
      payload: Record<string, unknown>;
    }>,
  ) => Record<string, unknown>;
};

function builder(): RequestBodyBuilder {
  // Built straight off the prototype: the shape of the request is pure, and
  // standing up the processor would drag in a database and a scheduler that
  // have nothing to do with it.
  return Object.create(TikTokOutboxProcessor.prototype) as RequestBodyBuilder;
}

function bodyFor(
  ...payloads: Array<Record<string, unknown>>
): Record<string, unknown> {
  return builder().requestBody(
    payloads.map((payload) => ({ pixel_id: 'PIXEL123', payload })),
  );
}

const basePayload = {
  event: 'Lead',
  event_time: 1_767_225_600,
  event_id: 'e1b9c0de-0000-4000-8000-000000000001',
  url: 'https://acme.example/bio/page',
  referrer: 'https://www.tiktok.com/',
  content_id: 'action-1',
  content_ids: ['action-1'],
  content_type: 'form',
  content_name: 'Enquiry',
  ip: '203.0.113.9',
  user_agent: 'Mozilla/5.0',
  ttclid: 'ttclid-value',
  ttp: 'ttp-value',
  email: 'a'.repeat(64),
  phone: 'b'.repeat(64),
  external_id: 'c'.repeat(64),
};

describe('TikTok Events API request body', () => {
  it('identifies the destination the way v1.3 requires', () => {
    const body = bodyFor(basePayload);

    expect(body.event_source).toBe('web');
    expect(body.event_source_id).toBe('PIXEL123');
    // The v1.2 field. Sending it to this endpoint is a parameter error.
    expect(body.pixel_code).toBeUndefined();
  });

  it('carries every event claimed for one destination in a single call', () => {
    const second = {
      ...basePayload,
      event: 'Contact',
      event_id: 'e1b9c0de-0000-4000-8000-000000000002',
    };
    const body = bodyFor(basePayload, second);
    const data = body.data as Array<Record<string, unknown>>;

    // One request per event multiplied the round trips and the rate-limit
    // pressure by the batch size for nothing; `data` has always been an array.
    expect(data).toHaveLength(2);
    expect(data.map((event) => event.event)).toEqual(['Lead', 'Contact']);
    expect(body.event_source_id).toBe('PIXEL123');
  });

  it('sends the documented `contents` array alongside the flat ids', () => {
    const [event] = bodyFor(basePayload).data as Array<Record<string, unknown>>;
    const properties = event.properties as Record<string, unknown>;

    expect(properties.contents).toEqual([
      {
        content_id: 'action-1',
        content_type: 'form',
        content_name: 'Enquiry',
      },
    ]);
    expect(properties.content_id).toBe('action-1');
  });

  it('puts identity in `user`, not the retired `context`', () => {
    const [event] = bodyFor(basePayload).data as Array<Record<string, unknown>>;

    expect(event.context).toBeUndefined();
    expect(event.user).toEqual({
      ttclid: 'ttclid-value',
      ttp: 'ttp-value',
      external_id: 'c'.repeat(64),
      email: 'a'.repeat(64),
      phone: 'b'.repeat(64),
      ip: '203.0.113.9',
      user_agent: 'Mozilla/5.0',
    });
  });

  it('passes hashed identity through untouched', () => {
    const [event] = bodyFor(basePayload).data as Array<Record<string, unknown>>;
    const user = event.user as Record<string, string>;

    // Hashed once at ingest. Hashing again here would produce a digest that
    // matches nothing on TikTok's side and quietly destroy match quality.
    expect(user.email).toHaveLength(64);
    expect(user.phone).toHaveLength(64);
    expect(user.email).toBe('a'.repeat(64));
  });

  it('carries the page address in its own object', () => {
    const [event] = bodyFor(basePayload).data as Array<Record<string, unknown>>;

    expect(event.page).toEqual({
      url: 'https://acme.example/bio/page',
      referrer: 'https://www.tiktok.com/',
    });
  });

  it('keeps the event id, which is what deduplication matches on', () => {
    const [event] = bodyFor(basePayload).data as Array<Record<string, unknown>>;

    expect(event.event).toBe('Lead');
    expect(event.event_id).toBe('e1b9c0de-0000-4000-8000-000000000001');
    expect(event.event_time).toBe(1_767_225_600);
  });

  it('omits what it does not have rather than sending blanks', () => {
    const [event] = bodyFor({
      event: 'ViewContent',
      event_time: 1_767_225_600,
      event_id: 'e1b9c0de-0000-4000-8000-000000000002',
      url: 'https://acme.example/bio/page',
      ip: '203.0.113.9',
      user_agent: 'Mozilla/5.0',
      ttclid: undefined,
      ttp: null,
      email: '',
      value: undefined,
    }).data as Array<Record<string, unknown>>;
    const user = event.user as Record<string, unknown>;

    // TikTok validates the fields it is given, so an absent cookie sent as
    // null is rejected where leaving it out is accepted.
    expect('ttclid' in user).toBe(false);
    expect('ttp' in user).toBe(false);
    expect('email' in user).toBe(false);
    expect(user.ip).toBe('203.0.113.9');
    expect((event.page as Record<string, unknown>).referrer).toBeUndefined();
  });
});
