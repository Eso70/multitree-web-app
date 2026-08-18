import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION = readFileSync(
  join(
    __dirname,
    'migrations',
    '2026-08-16_reduce_mini_website_visual_templates.sql',
  ),
  'utf8',
);

describe('mini-website template reduction migration', () => {
  it('migrates every retired layout to Side Profile', () => {
    expect(MIGRATION).toContain("SET template_key = 'side-profile'");
    expect(MIGRATION).toContain(
      "template_key IN ('editorial', 'business-pro', 'sidebar-canvas')",
    );
  });

  it('leaves exactly Liquid and Side Profile in the live constraint', () => {
    expect(MIGRATION).toContain('ADD COLUMN IF NOT EXISTS template_key');
    expect(MIGRATION).toContain(
      "template_key IN ('liquid-glass', 'side-profile')",
    );
  });

  it('removes retired entitlements and grants both live templates safely', () => {
    expect(MIGRATION).toContain('DELETE FROM public.billing_plan_templates');
    expect(MIGRATION).toContain('DELETE FROM public.template_global_settings');
    expect(MIGRATION).toContain(
      "unnest(ARRAY['liquid-glass', 'side-profile']::text[])",
    );
    expect(MIGRATION).toContain(
      'ON CONFLICT (plan_configuration_id, template_key) DO NOTHING',
    );
  });
});
