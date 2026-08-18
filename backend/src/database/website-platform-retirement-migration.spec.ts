import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION = readFileSync(
  join(
    __dirname,
    'migrations',
    '2026-08-18_retire_website_link_platform.sql',
  ),
  'utf8',
);

describe('Website link platform retirement migration', () => {
  it('declares no transaction of its own, because the runner supplies one', () => {
    expect(MIGRATION).not.toMatch(/^\s*BEGIN;/m);
    expect(MIGRATION).not.toMatch(/^\s*COMMIT;/m);
  });

  it('moves every website link to custom, case-insensitively', () => {
    expect(MIGRATION).toContain('UPDATE public.links');
    expect(MIGRATION).toContain("SET platform = 'custom'");
    expect(MIGRATION).toContain("WHERE lower(platform) = 'website'");
  });

  /**
   * The destination is what `LinksService.syncLinks` matches a saved link on.
   * Rewriting it here would make every one of these links look new on the
   * owner's next save and retire the action row holding its clicks.
   */
  it('never touches the destination url', () => {
    expect(MIGRATION).not.toMatch(/SET[\s\S]{0,80}\burl\s*=/);
  });

  it('keeps the recorded platform label on the action row in step', () => {
    expect(MIGRATION).toContain('UPDATE public.public_page_actions');
    expect(MIGRATION).toContain("metadata ->> 'platform' = 'website'");
  });

  it('never edits the consolidated baseline', () => {
    expect(MIGRATION).not.toContain('full_schema');
    expect(MIGRATION).not.toMatch(/CREATE TABLE public\./);
  });
});
