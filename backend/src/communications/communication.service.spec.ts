import { mockArg } from '../common/test-utils';
import { BadRequestException } from '@nestjs/common';
import { CommunicationService } from './communication.service';

describe('CommunicationService', () => {
  const database = {
    query: jest.fn(),
    transaction: jest.fn(),
  };
  const crypto = {
    encryptJson: jest.fn(() => Buffer.from('encrypted')),
    encryptText: jest.fn(() => Buffer.from('encrypted')),
    decryptJson: jest.fn(() => ({})),
    decryptText: jest.fn((_value: unknown, fallback: string) => fallback),
  };
  const metrics = {
    registerWorker: jest.fn(),
    recordWorkerRun: jest.fn(),
    recordWorkerJob: jest.fn(),
  };
  let service: CommunicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunicationService(
      database as never,
      crypto as never,
      metrics as never,
    );
  });

  it('rejects a targeted announcement without recipients before writing', async () => {
    await expect(
      service.createAnnouncement(
        {
          title: 'Plan update',
          message: 'A useful update for selected plans',
          announcementType: 'feature',
          priority: 'normal',
          audienceType: 'plans',
          audienceValues: [],
          channels: ['business_bell'],
        },
        {
          id: '10000000-0000-4000-8000-000000000001',
          username: 'admin',
          name: 'Admin',
          role: 'platform-admin',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it('marks only the current business notification and delivery as read', async () => {
    database.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            sourceType: 'announcement',
            sourceId: '20000000-0000-4000-8000-000000000002',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await expect(
      service.markNotificationRead(
        {
          id: '30000000-0000-4000-8000-000000000003',
          username: 'business',
          name: 'Business',
          role: 'business',
        },
        '40000000-0000-4000-8000-000000000004',
      ),
    ).resolves.toEqual({
      id: '40000000-0000-4000-8000-000000000004',
      read: true,
    });

    expect(mockArg(database.query, 0, 0)).toContain('business_id=$3::uuid');
    expect(mockArg(database.query, 0, 1)).toEqual([
      '40000000-0000-4000-8000-000000000004',
      'business',
      '30000000-0000-4000-8000-000000000003',
    ]);
    expect(mockArg(database.query, 1, 0)).toContain(
      'communication_announcement_deliveries',
    );
  });

  it('does not allow unsafe announcement action URLs', async () => {
    await expect(
      service.createAnnouncement(
        {
          title: 'Unsafe action',
          message: 'This should never be persisted',
          announcementType: 'general',
          priority: 'normal',
          audienceType: 'all',
          audienceValues: [],
          channels: ['homepage'],
          ctaUrl: 'javascript:alert(1)',
        },
        {
          id: '10000000-0000-4000-8000-000000000001',
          username: 'admin',
          name: 'Admin',
          role: 'platform-admin',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
