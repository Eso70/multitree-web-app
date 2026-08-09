import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const maxConnections = this.configService.get<number>('DB_POOL_MAX', 20);
    const idleTimeoutMillis = this.configService.get<number>(
      'DB_IDLE_TIMEOUT_MS',
      30000,
    );
    const connectionTimeoutMillis = this.configService.get<number>(
      'DB_CONNECTION_TIMEOUT_MS',
      10000,
    );
    const queryTimeoutMillis = this.configService.get<number>(
      'DB_QUERY_TIMEOUT_MS',
      30000,
    );
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      database: this.configService.get<string>('DB_NAME'),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      max: maxConnections,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      query_timeout: queryTimeoutMillis,
      statement_timeout: queryTimeoutMillis,
      application_name: 'multitree-backend',
      options: '-c client_encoding=UTF8',
      maxUses: 7500,
    });

    this.pool.on('error', (err) => {
      this.logger.error(
        `Unexpected error on idle PostgreSQL client: ${err.message}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(queryText, params);
    } catch (error) {
      this.logger.error(`Database query error: ${queryText}`, error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
