import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const GET_AND_DELETE_SCRIPT = `
local value = redis.call('GET', KEYS[1])
if value then
  redis.call('DEL', KEYS[1])
end
return value
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private isRedisAvailable = false;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    try {
      this.redis = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        reconnectOnError: () => true,
      });

      this.redis.on('connect', () => {
        this.logger.log(`📡 Redis connected successfully to ${host}:${port}`);
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`⚠️ Redis client connection error: ${err.message}`);
        this.isRedisAvailable = false;
      });
    } catch (error) {
      this.logger.error('❌ Failed to initialize Redis client', error);
      this.isRedisAvailable = false;
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  isAvailable(): boolean {
    return this.isRedisAvailable && !!this.redis;
  }

  async ping(): Promise<void> {
    if (!this.redis) throw new Error('Redis is unavailable');
    const response = await this.redis.ping();
    if (response !== 'PONG') throw new Error('Redis health check failed');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.warn(`⚠️ Redis cache get error for key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 7200): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Redis cache set error for key "${key}":`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Redis cache delete error for key "${key}":`, error);
      return false;
    }
  }

  async consume<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;
    try {
      const raw = await this.redis.eval(GET_AND_DELETE_SCRIPT, 1, key);
      if (typeof raw !== 'string') return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Redis one-time consume error for key "${key}":`, error);
      return null;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) return 0;
    let cursor = '0';
    let deleted = 0;
    try {
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          250,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await this.redis.del(...keys);
        }
      } while (cursor !== '0');
      return deleted;
    } catch (error) {
      this.logger.warn(
        `⚠️ Redis cache deletion error for pattern "${pattern}":`,
        error,
      );
      return deleted;
    }
  }

  async trackBusinessSession(
    businessId: string,
    sessionToken: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const key = `business:sessions:${businessId}`;
      await this.redis.sadd(key, sessionToken);
      await this.redis.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      this.logger.warn(
        `⚠️ Redis error tracking session for business "${businessId}":`,
        error,
      );
      return false;
    }
  }

  async untrackBusinessSession(
    businessId: string,
    sessionToken: string,
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const key = `business:sessions:${businessId}`;
      await this.redis.srem(key, sessionToken);
      return true;
    } catch (error) {
      this.logger.warn(
        `⚠️ Redis error untracking session for business "${businessId}":`,
        error,
      );
      return false;
    }
  }

  async clearBusinessSessions(businessId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const key = `business:sessions:${businessId}`;
      const tokens = await this.redis.smembers(key);
      const pipeline = this.redis.pipeline();
      for (const token of tokens) {
        pipeline.del(`session:${token}`);
      }
      pipeline.del(key);
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.warn(
        `⚠️ Redis error clearing sessions for business "${businessId}":`,
        error,
      );
      return false;
    }
  }

  async isRateLimited(
    key: string,
    limit = 60,
    windowSeconds = 60,
  ): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return current > limit;
    } catch (error) {
      this.logger.warn(`⚠️ Redis rate limit error for key "${key}":`, error);
      return false;
    }
  }
}
