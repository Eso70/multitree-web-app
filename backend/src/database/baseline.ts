import type { PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * The consolidated baseline a fresh database is built from.
 *
 * It is one schema split across numbered parts in `migrations/baseline/`, not
 * a set of independent scripts: the parts are concatenated in filename order
 * and applied inside a single transaction, so a failure anywhere leaves the
 * database untouched.
 *
 * The split is sequential — no statement was reordered when it was made — so
 * concatenating the parts reproduces the single file they came from. That is
 * what makes the ordering safe to reason about: the core tables come before
 * their constraints, every foreign key comes after every table it references,
 * and the catalog rows in `99_data.sql` come last, once the keys exist to
 * validate them.
 *
 * Numbering leaves gaps on purpose. A new domain goes in at its own tens place
 * rather than forcing a renumber.
 */
const BASELINE_DIR = 'baseline';

/**
 * A baseline part. Prefixed with two digits so filename order is apply order,
 * exactly like the dated forward migrations.
 */
const BASELINE_PART = /^\d{2}_.+\.sql$/;

/**
 * The name the baseline is recorded under in `schema_migrations`.
 *
 * Deliberately unchanged by the split into parts. The ledger records *which
 * baseline* a database was built from, not which files carried it, and
 * `db-migrate.ts` recognises an already-baselined database by this exact
 * string — renaming it would make every existing database look un-baselined.
 * `db-reset.ts` asserts the ledger holds only this one row.
 */
export const BASELINE_LEDGER_NAME = 'full_schema.sql';

/** Absolute path of the directory holding the baseline parts. */
export function baselineDir(migrationsDir: string): string {
  return path.join(migrationsDir, BASELINE_DIR);
}

/**
 * The baseline parts, in apply order.
 *
 * Read from disk rather than hard-coded, so adding a part is adding a file.
 * The numbering is what orders them, so a part that must run late needs a
 * higher prefix — nothing here infers dependencies.
 */
export function baselineFiles(migrationsDir: string): string[] {
  const dir = baselineDir(migrationsDir);
  if (!fs.existsSync(dir)) {
    throw new Error(`Baseline directory missing: ${dir}`);
  }
  const files = fs.readdirSync(dir).filter((name) => BASELINE_PART.test(name));
  if (files.length === 0) {
    throw new Error(`Baseline directory has no parts: ${dir}`);
  }
  return files.sort();
}

function readPart(filePath: string): string {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Strip a leading byte-order mark: Postgres rejects it as syntax.
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

/** Every baseline part concatenated, for callers that want the whole schema. */
export function readBaselineSql(migrationsDir: string): string {
  const dir = baselineDir(migrationsDir);
  return baselineFiles(migrationsDir)
    .map((file) => readPart(path.join(dir, file)))
    .join('\n');
}

/**
 * Applies every baseline part, in order, on the caller's open transaction.
 *
 * The caller owns the transaction because both scripts wrap the baseline and
 * its ledger row together: a database that has the schema but not the ledger
 * row cannot be told apart from a legacy one on the next run.
 *
 * Parts are sent as separate statements rather than one concatenated blob so a
 * failure names the file it came from.
 */
export async function applyBaseline(
  client: PoolClient,
  migrationsDir: string,
): Promise<void> {
  const dir = baselineDir(migrationsDir);
  for (const file of baselineFiles(migrationsDir)) {
    try {
      await client.query(readPart(path.join(dir, file)));
    } catch (error) {
      throw new Error(
        `Baseline part ${file} failed to apply: ${(error as Error).message}`,
      );
    }
  }
}
