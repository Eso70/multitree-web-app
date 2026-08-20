/**
 * Database Migration Script
 * Applies the consolidated baseline (migrations/baseline/*.sql) to an empty database.
 * Existing databases are baselined only when they already match that schema,
 * then any dated forward migrations are applied in order.
 * Usage: pnpm db:migrate
 */

import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { seedDefaultCommunications } from './seed-communications';
import { encryptPrivateCommunications } from './encrypt-communications';
import { ensureApiPlatform } from './ensure-api-platform';
import { ensurePlatformRetention } from './ensure-platform-retention';
import { ensurePlatformMedia } from './ensure-platform-media';
import { ensureAdvertisingPages } from './ensure-advertising-pages';
import { seedPlatformAdmin } from './seed-platform-admin';
import { assertSupportedSchema } from '../src/database/migration-compatibility';
import { applyForwardMigrations } from '../src/database/forward-migrations';
import {
  applyBaseline,
  baselineDir,
  baselineFiles,
  BASELINE_LEDGER_NAME,
} from '../src/database/baseline';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function migrate() {
  const dbName = process.env.DB_NAME || 'multitree';
  if (
    !/^[A-Za-z_][A-Za-z0-9_-]{0,62}$/.test(dbName) ||
    ['postgres', 'template0', 'template1'].includes(dbName.toLowerCase())
  ) {
    throw new Error(`Refusing to migrate unsafe database name: ${dbName}`);
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
  const maintenanceClient = await maintenancePool.connect();
  try {
    const existing = await maintenanceClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (!existing.rowCount) {
      const quotedDatabase = `"${dbName.replace(/"/g, '""')}"`;
      try {
        await maintenanceClient.query(
          `CREATE DATABASE ${quotedDatabase} WITH TEMPLATE template0 ENCODING 'UTF8'`,
        );
        console.log(`Created missing database: ${dbName}\n`);
      } catch (error) {
        if ((error as { code?: string }).code !== '42P04') throw error;
      }
    }
  } finally {
    maintenanceClient.release();
    await maintenancePool.end();
  }

  const pool = new Pool({ ...connection, database: dbName });

  const client = await pool.connect();
  const schemaFile = BASELINE_LEDGER_NAME;
  let appliedCount = 0;
  const migrationLockKey = 'multitree:schema-migrations';

  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [
      migrationLockKey,
    ]);
    console.log('Running database migration baseline...\n');

    const migrationsDir = path.resolve(__dirname, '../src/database/migrations');
    // Throws with the offending path when the baseline is missing or empty.
    baselineFiles(migrationsDir);

    const ledger = await client.query<{ exists: string | null }>(
      `SELECT to_regclass('public.schema_migrations')::text AS exists`,
    );
    if (!ledger.rows[0]?.exists) {
      const existingTables = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      if (Number(existingTables.rows[0]?.count || 0) > 0) {
        throw new Error(
          'Cannot infer migration history: schema_migrations is missing from a non-empty database. Restore a supported backup or provide an explicit legacy migration marker; no schema was changed.',
        );
      }

      console.log(`  Applying baseline from ${baselineDir(migrationsDir)}`);
      await client.query('BEGIN');
      await applyBaseline(client, migrationsDir);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [schemaFile],
      );
      await client.query('COMMIT');
      appliedCount += 1;
      console.log(`  OK ${schemaFile} applied`);
      await assertSupportedSchema(client);
    } else {
      const check = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [schemaFile],
      );
      if (check.rows.length > 0) {
        await assertSupportedSchema(client);
        console.log(`  OK ${schemaFile} already applied`);
      } else {
        const legacyCheck = await client.query(
          'SELECT filename FROM schema_migrations WHERE filename <> $1 LIMIT 1',
          [schemaFile],
        );
        const existingTables = await client.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name <> 'schema_migrations'
      `);

        if (legacyCheck.rows.length > 0) {
          throw new Error(
            `Cannot infer migration history: schema_migrations contains rows but no ${schemaFile} baseline. Restore a supported backup or provide an explicit legacy migration marker; no schema was changed.`,
          );
        }

        if (Number(existingTables.rows[0]?.count || 0) > 0) {
          await assertSupportedSchema(client);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
            [schemaFile],
          );
          console.log(`  OK ${schemaFile} baselined for existing schema`);
        } else {
          console.log(`  Applying baseline from ${baselineDir(migrationsDir)}`);
          await client.query('BEGIN');
          await applyBaseline(client, migrationsDir);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [schemaFile],
          );
          await client.query('COMMIT');
          appliedCount += 1;
          console.log(`  OK ${schemaFile} applied`);
        }
        await assertSupportedSchema(client);
      }
    }

    const forwardMigrations = await applyForwardMigrations(
      client,
      migrationsDir,
    );
    appliedCount += forwardMigrations.length;
    if (forwardMigrations.length) {
      await assertSupportedSchema(client);
    }

    await seedPlatformAdmin(client);
    await ensureApiPlatform(client);
    await ensurePlatformRetention(client);
    await ensurePlatformMedia(client);
    await ensureAdvertisingPages(client);
    await encryptPrivateCommunications(client);
    await seedDefaultCommunications(client);
    await encryptPrivateCommunications(client);

    console.log(`\nDone. ${appliedCount} schema baseline(s) applied.`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection may not currently have an active transaction.
    }
    console.error('\nMigration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [
        migrationLockKey,
      ]);
    } catch {
      // The connection may not have acquired the lock.
    }
    client.release();
    await pool.end();
  }
}

void migrate();
