import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DataRetentionService } from './data-retention.service';

describe('DataRetentionService', () => {
  const policy = {
    request_log_days: 30,
    api_history_days: 90,
    communication_history_days: 365,
    automatic_cleanup: false,
    cleanup_hour_utc: 2,
    batch_size: 1000,
    updated_at: new Date().toISOString(),
  };

  it('returns the stored policy, eligible counts, and latest run', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [policy] })
      .mockResolvedValueOnce({
        rows: [
          {
            request_logs: '3',
            api_history: '4',
            communications: '5',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const service = new DataRetentionService({
      query,
    } as unknown as DatabaseService);

    await expect(service.getStatus()).resolves.toMatchObject({
      policy,
      eligible: {
        request_logs: 3,
        api_history: 4,
        communications: 5,
      },
      last_run: null,
    });
  });

  it('requires explicit confirmation before a manual cleanup', async () => {
    const service = new DataRetentionService({} as DatabaseService);
    await expect(service.runManual('admin-id', false)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
