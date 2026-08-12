import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION = readFileSync(
  join(__dirname, 'migrations', '2026-08-12_rename_linktree_templates.sql'),
  'utf8',
);

describe('Linktree template key rename migration', () => {
  it('maps every released key to its new catalog identifier', () => {
    expect(MIGRATION).toContain("('colorful-pills', 'spectrum')");
    expect(MIGRATION).toContain("('mobile-spotlight', 'spotlight')");
    expect(MIGRATION).toContain("('frosted-outline', 'frost')");
    expect(MIGRATION).toContain("('aurora-pills', 'aurora')");
    expect(MIGRATION).toContain("('gentle-flow', 'serenity')");
  });

  it('updates every persisted template-key owner and both JSON spellings', () => {
    expect(MIGRATION).toContain('public.billing_plan_templates');
    expect(MIGRATION).toContain('public.template_global_settings');
    expect(MIGRATION).toContain('public.business_defaults');
    expect(MIGRATION).toContain('public.linktrees');
    expect(MIGRATION).toContain("'{templateKey}'");
    expect(MIGRATION).toContain("'{template_key}'");
  });

  it('changes both database defaults to spectrum', () => {
    expect(MIGRATION.match(/SET DEFAULT 'spectrum'/g)).toHaveLength(2);
  });
});
