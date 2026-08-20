import { join } from 'path';
import { readBaselineSql } from '../database/baseline';
import {
  DEFAULT_LINKTREE_BACKGROUND_COLOR,
  DEFAULT_LINKTREE_FOOTER_HIDDEN,
  DEFAULT_LINKTREE_TEMPLATE_KEY,
  DEFAULT_LINKTREE_WHATSAPP_ENABLED,
} from './linktree-defaults';

/**
 * The page defaults a new business starts with, and the schema that has to
 * agree with them.
 *
 * `business_defaults` carries a column default for each of these, and a row
 * inserted without the column lands on it. If the SQL and the constants
 * disagree, which values a business gets depends on which code path created
 * the row — which is not a difference anyone would think to look for.
 */

const SCHEMA = readBaselineSql(join(__dirname, '..', 'database', 'migrations'));
function businessDefaultsTable(): string {
  const start = SCHEMA.indexOf('CREATE TABLE public.business_defaults');
  expect(start).toBeGreaterThan(-1);
  return SCHEMA.slice(start, SCHEMA.indexOf(');', start));
}

describe('linktree page defaults', () => {
  it('starts a business on the template every plan includes', () => {
    expect(DEFAULT_LINKTREE_TEMPLATE_KEY).toBe('spectrum');
  });

  it('starts a business on a white canvas', () => {
    expect(DEFAULT_LINKTREE_BACKGROUND_COLOR).toBe('#ffffff');
  });

  it('hides the footer and leaves the WhatsApp modal off', () => {
    expect(DEFAULT_LINKTREE_FOOTER_HIDDEN).toBe(true);
    expect(DEFAULT_LINKTREE_WHATSAPP_ENABLED).toBe(false);
  });

  /**
   * The template rename used to live in a forward migration, so this read the
   * migration for the effective default. The 2026-08-19 rebaseline folded it
   * into `full_schema.sql` and the migration files were deleted, so the
   * baseline is now the only place the default is written.
   */
  it('matches the schema defaults', () => {
    const table = businessDefaultsTable();

    expect(table).toContain(
      `template_key character varying(50) DEFAULT '${DEFAULT_LINKTREE_TEMPLATE_KEY}'`,
    );
    expect(table).toContain(
      `background_color character varying(100) DEFAULT '${DEFAULT_LINKTREE_BACKGROUND_COLOR}'`,
    );
    expect(table).toContain(
      `footer_hidden boolean DEFAULT ${String(DEFAULT_LINKTREE_FOOTER_HIDDEN)}`,
    );
    expect(table).toContain(
      `whatsapp_enabled boolean DEFAULT ${String(
        DEFAULT_LINKTREE_WHATSAPP_ENABLED,
      )}`,
    );
  });

  it('does not define a tenant colour column', () => {
    // The business's own colour themes the dashboard and the public shell and
    // is chosen per business. It is not a page default: `business_branding`
    // owns it, and seeding one from the other would tie them together.
    expect(businessDefaultsTable()).not.toMatch(/^\s*website_color\s/m);
  });
});
