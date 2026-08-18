import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION = readFileSync(
  join(
    __dirname,
    'migrations',
    '2026-08-17_replace_side_profile_with_studio_grid.sql',
  ),
  'utf8',
);

describe('Studio Grid template migration', () => {
  it('preserves prior alternative-template choices under the new key', () => {
    expect(MIGRATION).toContain("SET template_key = 'studio-grid'");
    expect(MIGRATION).toContain("'side-profile'");
  });

  it('allows exactly Liquid and Studio Grid in the resulting schema', () => {
    expect(MIGRATION).toContain(
      "template_key IN ('liquid-glass', 'studio-grid')",
    );
  });

  it('removes retired catalog rows and grants Studio Grid safely', () => {
    expect(MIGRATION).toContain('DELETE FROM public.billing_plan_templates');
    expect(MIGRATION).toContain('DELETE FROM public.template_global_settings');
    expect(MIGRATION).toContain("SELECT configuration.id, 'studio-grid'");
    expect(MIGRATION).toContain(
      'ON CONFLICT (plan_configuration_id, template_key) DO NOTHING',
    );
  });
});
