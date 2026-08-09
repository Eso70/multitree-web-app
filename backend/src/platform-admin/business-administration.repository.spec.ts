import { BusinessAdministrationRepository } from './business-administration.repository';

describe('BusinessAdministrationRepository', () => {
  it('keeps filtering and pagination inside the list projection', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new BusinessAdministrationRepository({ query } as never);

    await repository.list({ page: 2, limit: 10, search: 'tenant' });

    expect(query).toHaveBeenCalledTimes(3);
    const calls = query.mock.calls as unknown as Array<[string, unknown[]?]>;
    const listCall = calls.find(([sql]) =>
      String(sql).includes('LEFT JOIN LATERAL'),
    );
    expect(listCall?.[0]).toContain('LIMIT $3 OFFSET $4');
    expect(listCall?.[1]).toEqual(['%tenant%', null, 10, 10]);
  });
});
