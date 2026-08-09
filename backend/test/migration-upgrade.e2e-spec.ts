import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const DATABASE_PREFIX = 'multitree_migration_e2e_';
const fixtureDatabase = `${DATABASE_PREFIX}${process.pid}`;

function connection(database: string) {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
  };
}

function quotedDatabase(name: string): string {
  if (!name.startsWith(DATABASE_PREFIX) || !/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe migration fixture database name: ${name}`);
  }
  return `"${name}"`;
}

describe('consolidated database schema commands (e2e)', () => {
  jest.setTimeout(120_000);
  let maintenance: Pool;
  let fixture: Pool;

  beforeAll(async () => {
    const sourceDatabase = process.env.DB_NAME || '';
    if (!/(?:^|[_-])(e2e|test)(?:[_-]|$)/i.test(sourceDatabase)) {
      throw new Error(
        `Refusing migration E2E setup for DB_NAME=${sourceDatabase || '<empty>'}`,
      );
    }
    maintenance = new Pool(
      connection(process.env.DB_MAINTENANCE_NAME || 'postgres'),
    );
    await maintenance.query(
      `DROP DATABASE IF EXISTS ${quotedDatabase(fixtureDatabase)}`,
    );
    await maintenance.query(
      `CREATE DATABASE ${quotedDatabase(fixtureDatabase)}`,
    );
    fixture = new Pool(connection(fixtureDatabase));

    // A supported pre-ledger installation has the application structure but
    // no schema_migrations history. Removing this optional session setting
    // keeps the fixture usable with older disposable developer databases too.
    const baseline = readFileSync(
      join(__dirname, '../src/database/migrations/full_schema.sql'),
      'utf8',
    ).replace(/^SET transaction_timeout = 0;\r?\n/m, '');
    await fixture.query(baseline);
    await fixture.query('TRUNCATE schema_migrations');
  });

  afterAll(async () => {
    if (fixture) await fixture.end();
    if (maintenance) {
      await maintenance.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE datname=$1 AND pid<>pg_backend_pid()`,
        [fixtureDatabase],
      );
      await maintenance.query(
        `DROP DATABASE IF EXISTS ${quotedDatabase(fixtureDatabase)}`,
      );
      await maintenance.end();
    }
  });

  it('baselines a complete unledgered schema without replaying it', async () => {
    const runner = join(__dirname, '../node_modules/ts-node/dist/bin.js');
    const result = spawnSync(
      process.execPath,
      [runner, 'scripts/db-migrate.ts'],
      {
        cwd: join(__dirname, '..'),
        env: {
          ...process.env,
          DB_NAME: fixtureDatabase,
          DB_MAINTENANCE_NAME: process.env.DB_MAINTENANCE_NAME || 'postgres',
          PLATFORM_ADMIN_USERNAME: '',
          PLATFORM_ADMIN_PASSWORD: '',
        },
        encoding: 'utf8',
        timeout: 90_000,
      },
    );

    if (result.status !== 0) {
      throw new Error(
        `Migration runner failed:\n${result.stdout || ''}\n${result.stderr || ''}`,
      );
    }
    const ledger = await fixture.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    expect(ledger.rows.map((row) => row.filename)).toEqual(['full_schema.sql']);
    const retainedBusinessTable = await fixture.query<{ exists: boolean }>(
      `SELECT to_regclass('public.businesses') IS NOT NULL AS exists`,
    );
    expect(retainedBusinessTable.rows[0].exists).toBe(true);
  });

  it('drops the entire database and recreates only the consolidated schema', async () => {
    await fixture.query('CREATE TABLE reset_sentinel (id integer PRIMARY KEY)');
    await fixture.query('INSERT INTO reset_sentinel (id) VALUES (1)');
    await fixture.end();

    const runner = join(__dirname, '../node_modules/ts-node/dist/bin.js');
    const result = spawnSync(
      process.execPath,
      [runner, 'scripts/db-reset.ts'],
      {
        cwd: join(__dirname, '..'),
        env: {
          ...process.env,
          DB_NAME: fixtureDatabase,
          DB_MAINTENANCE_NAME: process.env.DB_MAINTENANCE_NAME || 'postgres',
          DB_RESET_REQUIRE_STOPPED_BACKEND: 'false',
          PLATFORM_ADMIN_USERNAME: '',
          PLATFORM_ADMIN_PASSWORD: '',
        },
        encoding: 'utf8',
        timeout: 90_000,
      },
    );

    if (result.status !== 0) {
      throw new Error(
        `Reset runner failed:\n${result.stdout || ''}\n${result.stderr || ''}`,
      );
    }

    fixture = new Pool(connection(fixtureDatabase));
    const state = await fixture.query<{
      sentinel_exists: boolean;
      businesses_exists: boolean;
      obsolete_audit_column_exists: boolean;
      mini_website_permission_exists: boolean;
    }>(`
      SELECT
        to_regclass('public.reset_sentinel') IS NOT NULL AS sentinel_exists,
        to_regclass('public.businesses') IS NOT NULL AS businesses_exists,
        EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'platform_data_retention_settings'
             AND column_name = 'audit_log_days'
        ) AS obsolete_audit_column_exists,
        EXISTS (
          SELECT 1 FROM auth_permissions
           WHERE permission_key = 'business:mini-websites:create'
        ) AS mini_website_permission_exists
    `);
    expect(state.rows[0]).toEqual({
      sentinel_exists: false,
      businesses_exists: true,
      obsolete_audit_column_exists: false,
      mini_website_permission_exists: true,
    });

    const ledger = await fixture.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    expect(ledger.rows.map((row) => row.filename)).toEqual(['full_schema.sql']);
  });
});
