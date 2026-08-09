import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';

jest.mock('pg', () => ({ Pool: jest.fn() }));

describe('DatabaseService', () => {
  it('configures client encoding without issuing a competing connect query', () => {
    const on = jest.fn();
    (Pool as unknown as jest.Mock).mockImplementation(() => ({
      on,
      end: jest.fn(),
    }));
    const config = {
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService;
    const service = new DatabaseService(config);

    service.onModuleInit();

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ options: '-c client_encoding=UTF8' }),
    );
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(on).not.toHaveBeenCalledWith('connect', expect.any(Function));
  });
});
