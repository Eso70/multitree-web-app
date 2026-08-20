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
});
