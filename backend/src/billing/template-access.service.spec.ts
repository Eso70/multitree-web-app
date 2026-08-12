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
      rows: [{ template_key: 'spectrum' }, { template_key: 'aurora' }],
    });

    await expect(service.getEffectiveKeys('business-id')).resolves.toEqual([
      'spectrum',
      'aurora',
    ]);
    expect(redis.set).toHaveBeenCalledWith(
      'templates:business:business-id',
      { keys: ['spectrum', 'aurora'] },
      60,
    );
  });

  it('rejects a template outside the assigned plan', async () => {
    redis.get.mockResolvedValue({ keys: ['spectrum'] });

    await expect(
      service.assertAllowed('business-id', 'dark-card'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
