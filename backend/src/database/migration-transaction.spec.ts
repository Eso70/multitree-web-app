import { inTransaction } from './migration-transaction';

describe('migration helper transactions', () => {
  it('commits successful helper work', async () => {
    const client = { query: jest.fn().mockResolvedValue({}) } as never;
    await expect(inTransaction(client, async () => 'ok')).resolves.toBe('ok');
    expect((client as { query: jest.Mock }).query.mock.calls).toEqual([
      ['BEGIN'],
      ['COMMIT'],
    ]);
  });

  it('rolls back failed helper work', async () => {
    const client = { query: jest.fn().mockResolvedValue({}) } as never;
    await expect(
      inTransaction(client, async () => {
        throw new Error('failure');
      }),
    ).rejects.toThrow('failure');
    expect((client as { query: jest.Mock }).query.mock.calls).toEqual([
      ['BEGIN'],
      ['ROLLBACK'],
    ]);
  });
});
