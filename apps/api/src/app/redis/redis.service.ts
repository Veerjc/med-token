import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    try {
      this.client = new Redis({
        host,
        port,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: times => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.logger.log(`Redis connected at ${host}:${port}`);
      });
      this.client.on('error', err => {
        this.logger.warn(
          `Redis connection warning: ${err.message}. Ensure Redis is running ('npm run docker:db:up').`,
        );
      });

      // // Attempt connection non-blockingly so API bootstrap never crashes

      this.client.connect().catch(err => {
        this.logger.warn(
          `Redis initial connection deferred: ${err.message}. Running in offline fallback mode.`,
        );
      });
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis client: ${(error as Error).message}`);
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      this.logger.warn(`Redis unavailable. Key '${key}' not cached.`);
      return;
    }
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || this.client.status !== 'ready') {
      return null;
    }
    return this.client?.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.client || this.client.status !== 'ready') {
      return;
    }
    await this.client.del(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
