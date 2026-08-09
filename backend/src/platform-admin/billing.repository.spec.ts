import { BillingRepository } from './billing.repository';

describe('BillingRepository', () => {
  it('owns the active business permission catalog projection', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new BillingRepository({ query } as never);

    await repository.permissionCatalog();

    const [sql] = query.mock.calls[0] as unknown as [string];
    expect(sql).toContain("status='active'");
    expect(sql).toContain("permission_key LIKE 'business:%'");
  });

  it('returns only businesses assigned to the requested subscription plan', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ business_id: 'business-id' }],
    });
    const repository = new BillingRepository({ query } as never);

    await expect(
      repository.businessIdsForSubscriptionPlan('plan-id'),
    ).resolves.toEqual(['business-id']);
    const [, values] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(values).toEqual(['plan-id']);
  });
});
