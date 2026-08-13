import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { applyForwardMigrations } from './forward-migrations';

/** Minimal fake of the subset of PoolClient this module calls. */
function createFakeClient() {
  const rows: { filename: string }[] = [];
  const executed: string[] = [];
  const failingSql = new Set<string>();

  const client = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      executed.push(sql);
      if (sql === 'SELECT filename FROM schema_migrations') {
        return { rows: [...rows] };
      }
      if (sql === 'INSERT INTO schema_migrations (filename) VALUES ($1)') {
        rows.push({ filename: (params as string[])[0] });
        return { rows: [] };
      }
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (failingSql.has(sql)) {
        throw new Error('boom');
      }
      return { rows: [] };
    }),
  };

  return { client, rows, executed, failingSql };
}

function makeMigrationsDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forward-migrations-'));
  fs.writeFileSync(path.join(dir, 'full_schema.sql'), '-- baseline\n');
  for (const [name, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), sql);
  }
  return dir;
}

describe('applyForwardMigrations', () => {
  it('applies pending files in ascending filename order and records each one', async () => {
    const dir = makeMigrationsDir({
      '2026-08-11_second.sql': 'SELECT 2;',
      '2026-08-10_first.sql': 'SELECT 1;',
    });
    const { client, rows, executed } = createFakeClient();

    const applied = await applyForwardMigrations(client as never, dir);

    expect(applied).toEqual(['2026-08-10_first.sql', '2026-08-11_second.sql']);
    expect(rows.map((row) => row.filename)).toEqual([
      '2026-08-10_first.sql',
      '2026-08-11_second.sql',
    ]);
    expect(executed).toContain('SELECT 1;');
    expect(executed).toContain('SELECT 2;');
  });

  it('skips full_schema.sql', async () => {
    const dir = makeMigrationsDir({});
    const { client, executed } = createFakeClient();

    await applyForwardMigrations(client as never, dir);

    expect(executed.some((sql) => sql.includes('baseline'))).toBe(false);
  });

  it('never re-applies a migration already recorded in schema_migrations', async () => {
    const dir = makeMigrationsDir({
      '2026-08-10_first.sql': 'SELECT 1;',
    });
    const { client, rows, executed } = createFakeClient();
    rows.push({ filename: '2026-08-10_first.sql' });

    const applied = await applyForwardMigrations(client as never, dir);

    expect(applied).toEqual([]);
    expect(executed).not.toContain('SELECT 1;');
  });

  it('rolls back and stops on the first failure, applying nothing after it', async () => {
    const dir = makeMigrationsDir({
      '2026-08-10_first.sql': 'SELECT 1;',
      '2026-08-11_second.sql': 'SELECT 2;',
    });
    const { client, rows, executed, failingSql } = createFakeClient();
    failingSql.add('SELECT 1;');

    await expect(applyForwardMigrations(client as never, dir)).rejects.toThrow(
      '2026-08-10_first.sql failed and was rolled back',
    );

    expect(rows).toEqual([]);
    expect(executed).not.toContain('SELECT 2;');
  });

  it('returns an empty array when there are no forward migration files', async () => {
    const dir = makeMigrationsDir({});
    const { client, executed } = createFakeClient();

    const applied = await applyForwardMigrations(client as never, dir);

    expect(applied).toEqual([]);
    expect(executed).toEqual([]);
  });
});
