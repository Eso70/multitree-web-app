import type { PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Applies dated forward migration files from `backend/src/database/migrations`
 * that are not yet recorded in `schema_migrations`.
 *
 * The numbered baseline is applied and recorded separately by `db-migrate.ts`
 * under `full_schema.sql` and is never replayed here. A dated
 * `YYYY-MM-DD_description.sql` file is a forward migration: a small, additive,
 * idempotent-where-possible change delivered against an already-baselined
 * database.
 *
 * `db-migrate.ts` calls this after applying or verifying the baseline.
 * `db-reset.ts` never calls it: a reset always recreates the database from
 * the numbered baseline and asserts the ledger contains only that one row by
 * design, so it only ever represents a database's current baseline, not the
 * accumulated history a live database goes through. The numbered baseline is
 * refreshed to match that accumulated state as a separate, periodic
 * maintenance step, never as part of shipping an individual forward
 * migration.
 *
 * Ordering and identity both come from the filename. Files are applied in
 * ascending filename order, so the `YYYY-MM-DD_description.sql` convention
 * documented in docs/database.md is what determines apply order — not
 * directory listing order, which is not guaranteed across platforms. Each
 * file is applied in its own transaction and recorded in `schema_migrations`
 * by that exact filename, matching the same ledger `full_schema.sql` uses, so
 * a file already recorded is skipped on every future run: adding a new
 * migration file and rerunning `pnpm db:migrate` is always safe, including on
 * a live database that already has some earlier migrations applied.
 *
 * A failed migration rolls back that one file's transaction and stops the
 * run immediately — later files are never applied out of order, and nothing
 * is recorded for the failed file.
 */
/**
 * A forward migration is a dated file, and only a dated file.
 *
 * The baseline is carried by `migrations/baseline/`. Requiring the documented
 * `YYYY-MM-DD_description.sql` shape makes a migration structurally distinct
 * from a baseline file instead of distinguishing them by exclusion.
 */
const DATED_MIGRATION = /^\d{4}-\d{2}-\d{2}_.+\.sql$/;

export async function applyForwardMigrations(
  client: PoolClient,
  migrationsDir: string,
): Promise<string[]> {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => DATED_MIGRATION.test(name))
    .sort();

  if (files.length === 0) return [];

  const applied = await client.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations',
  );
  const appliedNames = new Set(applied.rows.map((row) => row.filename));

  const pending = files.filter((file) => !appliedNames.has(file));
  const appliedNow: string[] = [];

  for (const file of pending) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');

    console.log(`  Applying forward migration: ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(
        `Forward migration ${file} failed and was rolled back: ${(error as Error).message}`,
      );
    }
    console.log(`  OK ${file} applied`);
    appliedNow.push(file);
  }

  return appliedNow;
}
