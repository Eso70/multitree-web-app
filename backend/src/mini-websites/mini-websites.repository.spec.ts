import { MiniWebsitesRepository } from './mini-websites.repository';

describe('MiniWebsitesRepository', () => {
  it('binds both resource and tenant identifiers for business reads', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new MiniWebsitesRepository({ query } as never);

    await repository.findForBusiness('website-id', 'business-id');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('website.id=$1 AND website.business_id=$2'),
      ['website-id', 'business-id'],
    );
  });

  it('constrains public reads to subdomain, slug, and published status', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new MiniWebsitesRepository({ query } as never);

    await repository.findPublished('tenant', 'page');

    const [sql, values] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain('lower(business.subdomain)=lower($1)');
    expect(sql).toContain("business.account_type='business'");
    expect(sql).toContain('website.slug=$2');
    expect(sql).toContain("website.status='published'");
    expect(values).toEqual(['tenant', 'page']);
  });

  it('resolves root-domain pages only from the platform workspace', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new MiniWebsitesRepository({ query } as never);

    await repository.findPublishedForPlatform('campaign');

    const [sql, values] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("business.account_type='platform'");
    expect(sql).toContain('website.slug=$1');
    expect(sql).toContain("website.status='published'");
    expect(values).toEqual(['campaign']);
  });
});
