import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION = readFileSync(
  join(
    __dirname,
    'migrations',
    '2026-08-18_retire_soft_horizon_mini_website_template.sql',
  ),
  'utf8',
);

describe('Soft Horizon retirement migration', () => {
  it('declares no transaction of its own, because the runner supplies one', () => {
    expect(MIGRATION).not.toMatch(/^\s*BEGIN;/m);
    expect(MIGRATION).not.toMatch(/^\s*COMMIT;/m);
  });

  /**
   * Moving every selection rather than clearing it is what keeps a mini website
   * that was on Soft Horizon rendering instead of failing its template lookup.
   */
  it('moves every surviving selection to liquid-glass', () => {
    expect(MIGRATION).toContain('UPDATE public.mini_websites');
    expect(MIGRATION).toContain("SET template_key = 'liquid-glass'");
    expect(MIGRATION).toContain("WHERE template_key <> 'liquid-glass'");
  });

  it('narrows the live constraint to the single remaining template', () => {
    expect(MIGRATION).toContain(
      'DROP CONSTRAINT IF EXISTS mini_websites_template_key_check',
    );
    expect(MIGRATION).toContain("template_key IN ('liquid-glass')");
    expect(MIGRATION).not.toContain("'soft-horizon'\n  );");
  });

  it('clears the retired template from the plan catalog and global settings', () => {
    expect(MIGRATION).toContain('DELETE FROM public.billing_plan_templates');
    expect(MIGRATION).toContain('DELETE FROM public.template_global_settings');
    expect(MIGRATION).toMatch(/template_key = 'soft-horizon'/);
  });

  /**
   * A plan whose only mini-website grant was Soft Horizon would otherwise be
   * left with no mini-website template at all.
   */
  it('grants liquid-glass to every active plan', () => {
    expect(MIGRATION).toContain(
      'INSERT INTO public.billing_plan_templates',
    );
    expect(MIGRATION).toContain("SELECT configuration.id, 'liquid-glass'");
    expect(MIGRATION).toContain(
      'ON CONFLICT (plan_configuration_id, template_key) DO NOTHING',
    );
  });

  it('never edits the consolidated baseline', () => {
    expect(MIGRATION).not.toContain('full_schema');
    expect(MIGRATION).not.toMatch(/CREATE TABLE public\./);
  });
});
