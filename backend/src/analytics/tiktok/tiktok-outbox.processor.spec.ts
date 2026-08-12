import { ConfigService } from '@nestjs/config';
import { SecretCryptoService } from '../../auth/secret-crypto.service';
import { DatabaseService } from '../../database/database.service';
import { TikTokOutboxProcessor } from './tiktok-outbox.processor';

describe('TikTokOutboxProcessor', () => {
  const originalFetch = global.fetch;
  const database = {} as DatabaseService;
  const secrets = {
    decryptJson: jest.fn(() => ({ events_token: 'test-token' })),
  } as unknown as SecretCryptoService;
  const config = {
    get: jest.fn(() => 'test'),
  } as unknown as ConfigService;
  const metrics = {
    registerWorker: jest.fn(),
    recordWorkerRun: jest.fn(),
    recordWorkerJob: jest.fn(),
  };
  const communications = {
    notifyPlatformOfTikTokFailure: jest.fn().mockResolvedValue(undefined),
  };

  const job = {
    id: '4a99ddda-789c-47a7-b27b-48b8d735774e',
    attempt_count: 1,
    business_id: 'd0f1a2b3-4c5d-4e6f-8a9b-0c1d2e3f4a5b',
    destination_id: '8542ca4c-8483-4c97-a449-5bc4f0da0209',
    pixel_id: 'pixel-code',
    encrypted_events_token: Buffer.from('encrypted'),
    payload: {
      event: 'Contact',
      event_time: 1_700_000_000,
      event_id: '7661599e-ec6b-4580-b29c-502cab6f34de',
    },
  };

  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      Reflect.deleteProperty(global, 'fetch');
    }
  });

  it('does not mark an HTTP 200 provider rejection as delivered', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 40002,
          message: 'Invalid access token',
          request_id: 'provider-request',
        }),
        { status: 200 },
      ),
    );
    const processor = new TikTokOutboxProcessor(
      database,
      secrets,
      config,
      metrics as never,
      communications as never,
    );

    const result = await processor['send']([job]);

    expect(result).toMatchObject({
      success: false,
      retryable: false,
      statusCode: 200,
      requestId: 'provider-request',
      summary: 'Invalid access token',
    });
  });

  it('accepts an HTTP 200 response only when TikTok returns code zero', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, message: 'OK', request_id: 'accepted' }),
        { status: 200 },
      ),
    );
    const processor = new TikTokOutboxProcessor(
      database,
      secrets,
      config,
      metrics as never,
      communications as never,
    );

    const result = await processor['send']([job]);

    expect(result).toMatchObject({
      success: true,
      retryable: false,
      statusCode: 200,
      requestId: 'accepted',
    });
  });
});
