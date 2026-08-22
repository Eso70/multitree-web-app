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

describe('RedisService rate limiting', () => {
  function limiter(incrResult: number) {
    const service = new RedisService(new ConfigService());
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(incrResult),
      expire: jest.fn(),
    };
    Object.assign(service, { redis, isRedisAvailable: true });
    return { service, redis };
  }

  /**
   * `INCR` then a conditional `EXPIRE` leaves a window: a process that stops
   * between them abandons a counter with no expiry, which Redis never reclaims
   * and which rate limits that identity permanently. Seeding the window first
   * means an interrupted call leaves behind a key that still expires.
   */
  it('gives the window its expiry before counting against it', async () => {
    const { service, redis } = limiter(1);

    await expect(
      service.isRateLimited('rl:login:1.2.3.4', 5, 60),
    ).resolves.toBe(false);

    expect(redis.set).toHaveBeenCalledWith(
      'rl:login:1.2.3.4',
      '0',
      'EX',
      60,
      'NX',
    );
    expect(redis.set.mock.invocationCallOrder[0]).toBeLessThan(
      redis.incr.mock.invocationCallOrder[0],
    );
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('never re-arms the expiry of a window already open', async () => {
    const { service, redis } = limiter(4);

    await service.isRateLimited('rl:login:1.2.3.4', 5, 60);

    // `NX` is what keeps a busy caller from sliding its own window forward.
    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(redis.set.mock.calls[0]).toContain('NX');
  });

  it('reports a caller over the limit', async () => {
    const { service } = limiter(6);

    await expect(
      service.isRateLimited('rl:login:1.2.3.4', 5, 60),
    ).resolves.toBe(true);
  });

  it('fails open when Redis is unavailable', async () => {
    const service = new RedisService(new ConfigService());
    Object.assign(service, { isRedisAvailable: false });

    await expect(
      service.isRateLimited('rl:login:1.2.3.4', 5, 60),
    ).resolves.toBe(false);
  });
});
