import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { baselineDir, baselineFiles } from './baseline';

/**
 * The numbered baseline was rebaselined on 2026-08-20 to include every dated
 * forward migration then present. Those files were deleted because this
 * project explicitly recreates its disposable database from the baseline.
 *
 * `db:reset` applies the baseline and nothing else — `db-reset.ts` never calls
 * `applyForwardMigrations` and asserts the ledger holds exactly one row — so
 * anything missing from this file is missing from every freshly reset
 * database. Before the rebaseline a reset still produced the password columns,
 * the pre-rename template keys and MultiTree's own logo as the business
 * default.
 *
 * The authoritative check is the differential one: apply the old baseline plus
 * every migration to one scratch database, the new baseline alone to another,
 * and diff the catalogs and seeded rows. That needs a live PostgreSQL, so it
 * is run by hand at rebaseline time. These assertions are the cheap standing
 * guard against the folded state being edited back out.
 */
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const BASELINE_DIR = baselineDir(MIGRATIONS_DIR);
const PARTS = baselineFiles(MIGRATIONS_DIR);

const readPart = (name: string) =>
  readFileSync(join(BASELINE_DIR, name), 'utf8');

/** Catalog rows the application cannot boot without. */
const DATA = readPart('99_data.sql');
/** Every structural part concatenated: tables, constraints, indexes, triggers. */
const SCHEMA = PARTS.filter((name) => name !== '99_data.sql')
  .map(readPart)
  .join('\n');

function tableBlock(name: string): string {
  const match = SCHEMA.match(
    new RegExp(
      `CREATE TABLE (?:IF NOT EXISTS )?public\\.${name} \\(([\\s\\S]*?)\\n\\);`,
    ),
  );
  if (!match) throw new Error(`no CREATE TABLE for ${name}`);
  return match[1];
}

describe('full_schema.sql baseline', () => {
  describe('2026-08-13_remove_password_authentication', () => {
    it('creates no password columns anywhere', () => {
      expect(SCHEMA).not.toMatch(/\bpassword_hash\b/);
      expect(SCHEMA).not.toMatch(/\bpassword_changed_at\b/);
    });

    it('seeds the renamed session-revocation permissions', () => {
      expect(DATA).not.toContain("'business:security:password-change'");
      expect(DATA).not.toContain("'platform:businesses:password-reset'");
      expect(DATA).not.toContain("'platform:settings:password-change'");
      expect(DATA).toContain("'business:security:sessions-revoke'");
      expect(DATA).toContain("'platform:businesses:sessions-revoke'");
      expect(DATA).toContain("'platform:settings:sessions-revoke'");
    });
  });

  describe('2026-08-12_add_business_session_impersonation', () => {
    it('declares the impersonation columns on business_sessions', () => {
      const block = tableBlock('business_sessions');
      expect(block).toContain('impersonated_by_platform_admin_id uuid');
      expect(block).toContain('impersonation_reason text');
      expect(block).toContain(
        'impersonation_started_at timestamp with time zone',
      );
    });

    it('carries the foreign key and the partial index under their migrated names', () => {
      expect(SCHEMA).toContain('business_sessions_impersonated_by_fkey');
      expect(SCHEMA).toContain('business_sessions_impersonated_by_idx');
    });

    it('registers the impersonation permission, which the app boots against', () => {
      expect(DATA).toContain("'platform:businesses:impersonate'");
    });
  });

  describe('2026-08-13_profile_change_cooldown', () => {
    it('declares profile_changed_at and its comment', () => {
      expect(tableBlock('businesses')).toContain(
        'profile_changed_at timestamp with time zone',
      );
      expect(SCHEMA).toContain(
        'COMMENT ON COLUMN public.businesses.profile_changed_at',
      );
    });

    /** `access_mode = 'approval'` would send every profile save to a reviewer that no longer exists. */
    it('grants business:profile:update directly rather than by approval', () => {
      const grant = DATA.match(
        /INSERT INTO public\.billing_plan_permissions[^\n]*'dc4467b8-45d0-4672-a1ae-962670c4ea10'[^\n]*/,
      )?.[0];
      expect(grant).toBeDefined();
      expect(grant).toContain("'direct'");
      expect(grant).not.toContain("'approval'");
    });
  });

  describe('2026-08-12_rename_linktree_templates', () => {
    it('defaults both template_key columns to the renamed key', () => {
      expect(tableBlock('business_defaults')).toContain(
        "template_key character varying(50) DEFAULT 'spectrum'",
      );
      expect(tableBlock('linktrees')).toContain(
        "template_key character varying(50) DEFAULT 'spectrum'",
      );
    });

    it('seeds no pre-rename or retired linktree template grants', () => {
      for (const retired of [
        'colorful-pills',
        'mobile-spotlight',
        'frosted-outline',
        'aurora-pills',
        'gentle-flow',
        'hero-image',
        'dark-card',
      ]) {
        expect(SCHEMA).not.toContain(`'${retired}'`);
        expect(DATA).not.toContain(`'${retired}'`);
      }
    });
  });

  describe('2026-08-13_neutral_business_brand_placeholders', () => {
    it('defaults business branding to the neutral placeholders', () => {
      const block = tableBlock('business_branding');
      expect(block).toContain(
        "logo text DEFAULT '/images/business-logo-placeholder.png'",
      );
      expect(block).toContain(
        "favicon text DEFAULT '/images/business-favicon-placeholder.png'",
      );
      // The avatar path is a sentinel other SQL compares against, so it stays.
      expect(block).toContain(
        "default_avatar text DEFAULT '/images/DefaultAvatar.png'",
      );
    });
  });

  describe('mini-website template retirement', () => {
    it('leaves liquid-glass as the only permitted template', () => {
      expect(SCHEMA).toContain('mini_websites_template_key_check');
      expect(SCHEMA).toContain("template_key IN ('liquid-glass')");
    });

    /**
     * Forward migrations apply in filename order, and
     * `2026-08-17_rename_studio_grid_...` sorts before
     * `2026-08-17_replace_..._with_studio_grid`, so the replace re-inserted
     * grants the rename had just cleared. Nothing later removed them until
     * `2026-08-19_remove_orphaned_studio_grid_grants.sql`.
     */
    it('seeds none of the retired mini-website template keys', () => {
      for (const retired of [
        'studio-grid',
        'soft-horizon',
        'side-profile',
        'editorial',
        'business-pro',
        'sidebar-canvas',
      ]) {
        expect(SCHEMA).not.toContain(`'${retired}'`);
        expect(DATA).not.toContain(`'${retired}'`);
      }
    });
  });

  /**
   * The folded migrations were deleted with the rebaseline: every database is
   * recreated from this baseline, so the files had no upgrade path left to
   * serve. The runner stays — `applyForwardMigrations` simply finds nothing
   * until the next dated migration is added.
   *
   * A `.sql` file reappearing here is not a failure of this rebaseline; it is
   * the next schema change, and it must be dated so it sorts after this
   * baseline. This assertion exists to make that a deliberate act.
   */
  it('has no dated forward migrations after the current rebaseline', () => {
    expect(readdirSync(MIGRATIONS_DIR)).toEqual(['baseline']);
  });

  /**
   * Filename order is apply order, so a part that must run late needs a higher
   * prefix. The two that carry a real ordering requirement are asserted here:
   * foreign keys after every core table, and the catalog rows last of all,
   * once the keys exist to validate them.
   */
  it('orders the parts so dependencies resolve', () => {
    expect(PARTS.every((name) => /^\d{2}_.+\.sql$/.test(name))).toBe(true);
    expect(PARTS).toEqual([...PARTS].sort());
    expect(PARTS.indexOf('14_core_foreign_keys.sql')).toBeGreaterThan(
      PARTS.indexOf('10_core_tables.sql'),
    );
    expect(PARTS).toContain('92_creator_accounts.sql');
    expect(PARTS[PARTS.length - 1]).toBe('99_data.sql');
  });

  /**
   * Structure and data must not leak back into each other: an `INSERT` in the
   * structure file is what put 500 lines of seed rows between the tables and
   * their constraints in the first place.
   */
  it('keeps structure and catalog data in their own files', () => {
    // Two singleton bootstraps stay with their sections; they are "ensure one
    // row exists", not catalog data.
    const seedInserts =
      SCHEMA.match(/^INSERT INTO public\.\w+ \([^)]*\) VALUES/gm) ?? [];
    expect(seedInserts).toHaveLength(2);
    expect(SCHEMA).toContain(
      'platform_data_retention_settings (id) VALUES (1)',
    );
    expect(SCHEMA).toContain('platform_media_settings (id) VALUES (1)');

    expect(DATA).not.toContain('CREATE TABLE');
    expect(DATA).not.toContain('ALTER TABLE');
    expect(DATA).not.toContain('CREATE INDEX');
  });

  /**
   * `IF NOT EXISTS` on a baseline that only ever runs against an empty
   * database hides a real name collision instead of failing on it. The two
   * extensions are the exception: a template database may already carry them.
   */
  it('does not paper over collisions with IF NOT EXISTS', () => {
    expect(SCHEMA).not.toContain('CREATE TABLE IF NOT EXISTS');
    expect(SCHEMA).not.toContain('CREATE INDEX IF NOT EXISTS');
    expect(SCHEMA).not.toContain('CREATE UNIQUE INDEX IF NOT EXISTS');
    expect(SCHEMA).toContain('CREATE EXTENSION IF NOT EXISTS');
  });

  /**
   * These were migration residue: every column and CHECK they re-applied is
   * already declared in the `CREATE TABLE` above them, so on an empty database
   * they did nothing but mislead.
   */
  it('carries no post-table column or constraint patch-ups', () => {
    expect(SCHEMA).not.toContain('ADD COLUMN IF NOT EXISTS');
    expect(SCHEMA).not.toContain('DROP COLUMN IF EXISTS');
    expect(SCHEMA).not.toContain('DROP CONSTRAINT IF EXISTS');
  });
});
