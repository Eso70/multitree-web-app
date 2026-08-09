import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminListQueryDto, pageMetadata } from './admin-list-query.dto';

describe('AdminListQueryDto', () => {
  it('transforms bounded pagination values', async () => {
    const query = plainToInstance(AdminListQueryDto, {
      page: '2',
      limit: '50',
      search: 'tenant',
    });
    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, limit: 50, search: 'tenant' });
  });

  it('rejects excessive limits', async () => {
    const query = plainToInstance(AdminListQueryDto, { limit: '101' });
    await expect(validate(query)).resolves.not.toHaveLength(0);
  });

  it('builds stable pagination metadata for empty results', () => {
    expect(pageMetadata(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });
  });
});
