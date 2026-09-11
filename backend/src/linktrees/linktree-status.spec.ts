import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LinktreesService } from './linktrees.service';

describe('LinktreesService.toggleStatus', () => {
  function buildService() {
    const query = jest.fn();
    const redis = {
      del: jest.fn().mockResolvedValue(1),
    };
    const database = { query };
    const service = new LinktreesService(
      database as never,
      redis as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, query, redis };
  }

  it('toggles a non-default linktree status to inactive and casts parameters explicitly', async () => {
    const { service, query, redis } = buildService();

    // 1. Check existing
    query.mockResolvedValueOnce({
      rows: [{ is_default: false }],
    });

    // 2. Update query
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'lt-1',
          name: 'Page 1',
          uid: 'page-1',
          seo_name: 'page-1',
          status: 'inactive',
          is_campaign_active: false,
          is_default: false,
          template_config: {},
          template_key: 'spectrum',
          whatsapp_modal_enabled: false,
        },
      ],
    });

    // 3. Questions query for mapLinktreeRow
    query.mockResolvedValueOnce({
      rows: [],
    });

    // 4. Business query for clearLinktreeCache
    query.mockResolvedValueOnce({
      rows: [{ subdomain: 'mybiz' }],
    });

    const result = await service.toggleStatus('lt-1', 'biz-1', 'inactive');

    expect(result.status).toBe('inactive');
    expect(result.is_campaign_active).toBe(false);

    // Verify the query contains the explicit casts
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SET status = $1::varchar'),
      ['inactive', 'lt-1', 'biz-1'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("CASE WHEN $1::varchar = 'inactive'"),
      ['inactive', 'lt-1', 'biz-1'],
    );

    // Verify cache was cleared
    expect(redis.del).toHaveBeenCalled();
  });

  it('rejects toggling default linktree to inactive', async () => {
    const { service, query } = buildService();

    query.mockResolvedValueOnce({
      rows: [{ is_default: true }],
    });

    await expect(
      service.toggleStatus('lt-default', 'biz-1', 'inactive'),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows toggling default linktree to active', async () => {
    const { service, query } = buildService();

    query.mockResolvedValueOnce({
      rows: [{ is_default: true }],
    });
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'lt-default',
          name: 'Default Page',
          uid: 'default-page',
          seo_name: 'default-page',
          status: 'active',
          is_campaign_active: false,
          is_default: true,
          template_config: {},
          template_key: 'spectrum',
          whatsapp_modal_enabled: false,
        },
      ],
    });
    query.mockResolvedValueOnce({
      rows: [],
    });
    query.mockResolvedValueOnce({
      rows: [{ subdomain: 'default-sub' }],
    });

    const result = await service.toggleStatus('lt-default', 'biz-1', 'active');
    expect(result.status).toBe('active');
  });

  it('throws NotFoundException when linktree does not exist', async () => {
    const { service, query } = buildService();

    query.mockResolvedValueOnce({
      rows: [],
    });

    await expect(
      service.toggleStatus('non-existent', 'biz-1', 'inactive'),
    ).rejects.toThrow(NotFoundException);
  });
});
