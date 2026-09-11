import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SecretCryptoService } from './secret-crypto.service';
import { TikTokPixelConfigService } from './tiktok-pixel-config.service';

describe('TikTokPixelConfigService', () => {
  const database = { query: jest.fn() } as unknown as DatabaseService;
  const secrets = { encryptJson: jest.fn() } as unknown as SecretCryptoService;
  const service = new TikTokPixelConfigService(database, secrets);

  beforeEach(() => jest.clearAllMocks());

  it('enforces the shared three-group and unique-pixel policy', () => {
    expect(() =>
      service.normalize([
        { pixel_id: 'PIXEL_001' },
        { pixel_id: 'PIXEL_002' },
        { pixel_id: 'PIXEL_003' },
        { pixel_id: 'PIXEL_004' },
      ]),
    ).toThrow(BadRequestException);
    expect(() =>
      service.normalize([{ pixel_id: 'PIXEL_001' }, { pixel_id: 'PIXEL_001' }]),
    ).toThrow('TikTok Pixel IDs must be unique');
  });

  it('supports callers that enforce a stricter one-group policy', () => {
    expect(() =>
      service.normalize(
        [{ pixel_id: 'PIXEL_001' }, { pixel_id: 'PIXEL_002' }],
        1,
      ),
    ).toThrow('At most 1 TikTok Pixel group is allowed');
  });

  it('never returns an Events API token from the list projection', async () => {
    (database.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 'pixel-id',
          pixel_id: 'PIXEL_001',
          token_last_four: '1234',
          status: 'active',
          encrypted_events_token: Buffer.from('must-not-escape'),
        },
      ],
    });

    await expect(service.list('owner-id')).resolves.toEqual([
      {
        id: 'pixel-id',
        pixel_id: 'PIXEL_001',
        token_last_four: '1234',
        has_events_token: true,
        status: 'active',
      },
    ]);
  });

  describe('testEventsApi', () => {
    const mockSecrets = {
      encryptJson: jest.fn(),
      decryptJson: jest.fn(),
    } as unknown as SecretCryptoService;
    const testService = new TikTokPixelConfigService(database, mockSecrets);

    it('requires test_event_code', async () => {
      await expect(
        testService.testEventsApi('owner-1', { test_event_code: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns 404 when no active pixel is found', async () => {
      (database.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await testService.testEventsApi('owner-1', {
        test_event_code: 'TEST77408',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.testEventCode).toBe('TEST77408');
    });

    it('returns 400 when pixel has no events token', async () => {
      (database.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'pixel-uuid',
            pixel_id: 'PIXEL_001',
            encrypted_events_token: null,
          },
        ],
      });

      const result = await testService.testEventsApi('owner-1', {
        test_event_code: 'TEST77408',
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Events API token');
    });

    it('successfully calls TikTok Events API with test_event_code and returns response', async () => {
      (database.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'pixel-uuid',
            pixel_id: 'PIXEL_TEST',
            encrypted_events_token: Buffer.from('encrypted'),
          },
        ],
      });
      (mockSecrets.decryptJson as jest.Mock).mockReturnValue({
        events_token: 'valid-secret-token',
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            code: 0,
            message: 'OK',
            request_id: 'tiktok-req-12345',
          }),
        ),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const result = await testService.testEventsApi(
          'owner-1',
          {
            test_event_code: 'TEST77408',
            event_name: 'ViewContent',
          },
          { ip: '1.2.3.4', userAgent: 'Jest-Agent' },
        );

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url, options] = mockFetch.mock.calls[0] as [
          string,
          { headers: Record<string, string>; body: string },
        ];
        expect(url).toBe(
          'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        );
        expect(options.headers['Access-Token']).toBe('valid-secret-token');

        const body = JSON.parse(options.body) as {
          event_source: string;
          event_source_id: string;
          test_event_code: string;
          data: Array<{ event: string; user: { ip: string } }>;
        };
        expect(body.event_source).toBe('web');
        expect(body.event_source_id).toBe('PIXEL_TEST');
        expect(body.test_event_code).toBe('TEST77408');
        expect(body.data).toHaveLength(1);
        expect(body.data[0]?.event).toBe('ViewContent');
        expect(body.data[0]?.user.ip).toBe('1.2.3.4');

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.tiktokCode).toBe(0);
        expect(result.requestId).toBe('tiktok-req-12345');
        expect(result.pixelId).toBe('PIXEL_TEST');
        expect(result.testEventCode).toBe('TEST77408');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('returns error result when TikTok rejects the test payload', async () => {
      (database.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'pixel-uuid',
            pixel_id: 'PIXEL_TEST',
            encrypted_events_token: Buffer.from('encrypted'),
          },
        ],
      });
      (mockSecrets.decryptJson as jest.Mock).mockReturnValue({
        events_token: 'invalid-token',
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            code: 40100,
            message: 'Access token is invalid',
            request_id: 'tiktok-err-999',
          }),
        ),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const result = await testService.testEventsApi('owner-1', {
          test_event_code: 'TEST77408',
        });

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(401);
        expect(result.tiktokCode).toBe(40100);
        expect(result.message).toBe('Access token is invalid');
        expect(result.requestId).toBe('tiktok-err-999');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('retrieves and decrypts Events API secret token', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            encrypted_events_token: Buffer.from('enc-data'),
            token_last_four: '5678',
          },
        ],
      });
      (mockSecrets.decryptJson as jest.Mock).mockReturnValueOnce({
        events_token: 'decrypted-token-value',
      });

      const secret = await testService.getSecret('owner-1', 'pixel-uuid');
      expect(secret).toEqual({
        events_token: 'decrypted-token-value',
        token_last_four: '5678',
      });
    });
  });
});
