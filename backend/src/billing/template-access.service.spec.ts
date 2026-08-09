import { ForbiddenException } from '@nestjs/common';
import { TemplateAccessService } from './template-access.service';

describe('TemplateAccessService', () => {
  const database = { query: jest.fn() };
  const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const service = new TemplateAccessService(database as never, redis as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns only templates assigned to the business plan', async () => {
    redis.get.mockResolvedValue(null);
    database.query.mockResolvedValue({
      rows: [
        { template_key: 'colorful-pills' },
        { template_key: 'aurora-pills' },
      ],
    });

    await expect(service.getEffectiveKeys('business-id')).resolves.toEqual([
      'colorful-pills',
      'aurora-pills',
    ]);
    expect(redis.set).toHaveBeenCalledWith(
      'templates:business:business-id',
      { keys: ['colorful-pills', 'aurora-pills'] },
      60,
    );
  });

  it('rejects a template outside the assigned plan', async () => {
    redis.get.mockResolvedValue({ keys: ['colorful-pills'] });

    await expect(
      service.assertAllowed('business-id', 'dark-card'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
