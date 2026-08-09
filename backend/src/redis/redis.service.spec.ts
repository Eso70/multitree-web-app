import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService one-time values', () => {
  it('atomically reads and deletes values without requiring GETDEL', async () => {
    const service = new RedisService(new ConfigService());
    const redis = {
      eval: jest.fn().mockResolvedValue(JSON.stringify({ state: 'valid' })),
    };
    Object.assign(service, { redis, isRedisAvailable: true });

    await expect(
      service.consume<{ state: string }>('oauth:state:hashed'),
    ).resolves.toEqual({ state: 'valid' });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('DEL', KEYS[1])"),
      1,
      'oauth:state:hashed',
    );
  });

  it('returns null when one-time value is absent', async () => {
    const service = new RedisService(new ConfigService());
    const redis = { eval: jest.fn().mockResolvedValue(null) };
    Object.assign(service, { redis, isRedisAvailable: true });

    await expect(service.consume('missing')).resolves.toBeNull();
  });
});
