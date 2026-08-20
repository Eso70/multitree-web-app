/**
 * Database Reset Script
 * Drops and recreates the entire configured database, then applies the single
 * consolidated baseline (migrations/baseline/*.sql) from scratch.
 * WARNING: This permanently deletes ALL data.
 * Usage: pnpm db:reset
 */

import { Pool, PoolClient } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { seedDefaultCommunications } from './seed-communications';
import { encryptPrivateCommunications } from './encrypt-communications';
import { ensureApiPlatform } from './ensure-api-platform';
import { ensurePlatformRetention } from './ensure-platform-retention';
import { ensurePlatformMedia } from './ensure-platform-media';
import { ensureAdvertisingPages } from './ensure-advertising-pages';
import { seedPlatformAdmin } from './seed-platform-admin';
import { assertSupportedSchema } from '../src/database/migration-compatibility';
import {
  applyBaseline,
  baselineDir,
  baselineFiles,
  BASELINE_LEDGER_NAME,
} from '../src/database/baseline';

// Load env from root first, then backend-local overrides if present.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function reset() {
  const dbName = process.env.DB_NAME || 'multitree';
  if (
    !/^[A-Za-z_][A-Za-z0-9_-]{0,62}$/.test(dbName) ||
    ['postgres', 'template0', 'template1'].includes(dbName.toLowerCase())
  ) {
    throw new Error(`Refusing to reset unsafe database name: ${dbName}`);
  }

  const connection = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
  const maintenanceName = process.env.DB_MAINTENANCE_NAME?.trim() || 'postgres';
  if (maintenanceName.toLowerCase() === dbName.toLowerCase()) {
    throw new Error('DB_MAINTENANCE_NAME must be different from DB_NAME');
  }
  const maintenancePool = new Pool({
    ...connection,
    database: maintenanceName,
  });
  let maintenanceClosed = false;
  let pool: Pool | null = null;
  let client: PoolClient | null = null;
  const migrationsDir = path.resolve(__dirname, '../src/database/migrations');

  try {
    console.log(`Recreating entire database: ${dbName}\n`);
    const maintenanceClient = await maintenancePool.connect();
    try {
      const activeBackendConnections = await maintenanceClient.query<{
        count: string;
      }>(
        `SELECT COUNT(*)::text AS count
         FROM pg_stat_activity
         WHERE datname = $1
           AND application_name = 'multitree-backend'
           AND pid <> pg_backend_pid()`,
        [dbName],
      );
      const backendConnectionCount = Number(
        activeBackendConnections.rows[0]?.count || 0,
      );
      if (backendConnectionCount > 0) {
        if (process.env.DB_RESET_REQUIRE_STOPPED_BACKEND === 'true') {
          throw new Error(
            `Refusing to reset ${dbName} while ${backendConnectionCount} backend connection(s) are active because DB_RESET_REQUIRE_STOPPED_BACKEND is enabled.`,
          );
        }
        console.warn(
          `  WARNING Terminating ${backendConnectionCount} active backend database connection(s) for this reset.`,
        );
      }

      const quotedDatabase = `"${dbName.replace(/"/g, '""')}"`;
      await maintenanceClient.query(
        `DROP DATABASE IF EXISTS ${quotedDatabase} WITH (FORCE)`,
      );
      await maintenanceClient.query(
        `CREATE DATABASE ${quotedDatabase} WITH TEMPLATE template0 ENCODING 'UTF8'`,
      );
    } finally {
      maintenanceClient.release();
    }
    await maintenancePool.end();
    maintenanceClosed = true;
    console.log('  OK Database dropped and recreated\n');

    console.log('Applying consolidated schema...\n');
    pool = new Pool({ ...connection, database: dbName });
    client = await pool.connect();

    const parts = baselineFiles(migrationsDir);
    console.log(
      `  Applying ${parts.length} baseline part(s) from ${baselineDir(migrationsDir)}`,
    );

    await client.query('BEGIN');
    await applyBaseline(client, migrationsDir);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [
      BASELINE_LEDGER_NAME,
    ]);
    await client.query('COMMIT');

    console.log('  OK baseline applied');
    await assertSupportedSchema(client);
    const ledger = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    if (
      ledger.rows.length !== 1 ||
      ledger.rows[0]?.filename !== BASELINE_LEDGER_NAME
    ) {
      throw new Error(
        `Reset verification failed: the migration ledger must contain only ${BASELINE_LEDGER_NAME}.`,
      );
    }
    console.log('  OK Consolidated schema verified');

    console.log('\nSeeding MultiTree...');
    await seedPlatformAdmin(client);
    await ensureApiPlatform(client);
    await ensurePlatformRetention(client);
    await ensurePlatformMedia(client);
    await ensureAdvertisingPages(client);
    await encryptPrivateCommunications(client);
    await seedDefaultCommunications(client);
    await encryptPrivateCommunications(client);

    console.log('\nFlushing Redis cache...');
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });
    await redis.flushall();
    await redis.quit();
    console.log('  OK Redis cache flushed');

    console.log(
      '\nDatabase reset complete. Fresh schema with MultiTree seed ready.',
    );
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The database or connection may already be gone.
      }
    }
    console.error('\nReset failed:', (error as Error).message);
    process.exit(1);
  } finally {
    client?.release();
    if (pool) await pool.end();
    if (!maintenanceClosed) await maintenancePool.end();
  }
}

void reset();
