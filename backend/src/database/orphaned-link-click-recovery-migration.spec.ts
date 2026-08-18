import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION = readFileSync(
  join(
    __dirname,
    'migrations',
    '2026-08-18_recover_orphaned_link_click_history.sql',
  ),
  'utf8',
);

describe('Orphaned link click recovery migration', () => {
  it('declares no transaction of its own, because the runner supplies one', () => {
    expect(MIGRATION).not.toMatch(/^\s*BEGIN;/m);
    expect(MIGRATION).not.toMatch(/^\s*COMMIT;/m);
  });

  it('only considers archived, detached link actions', () => {
    expect(MIGRATION).toContain("archived.status = 'archived'");
    expect(MIGRATION).toContain('archived.source_link_id IS NULL');
    expect(MIGRATION).toContain("archived.action_key LIKE 'link:%'");
  });

  it('resolves a replacement only when it is unambiguous', () => {
    // One live action on the same page with the same destination, or nothing.
    expect(MIGRATION).toContain('HAVING COUNT(*) = 1');
    expect(MIGRATION).toContain('live.destination = orphan.destination');
    expect(MIGRATION).toContain('live.public_page_id = orphan.public_page_id');
    expect(MIGRATION).toContain("live.status = 'active'");
  });

  it('adds recovered counters to the surviving row rather than overwriting', () => {
    expect(MIGRATION).toContain(
      'total_clicks = public.analytics_action_daily.total_clicks + EXCLUDED.total_clicks',
    );
    expect(MIGRATION).toContain(
      'conversions = public.analytics_action_daily.conversions + EXCLUDED.conversions',
    );
    expect(MIGRATION).toContain(
      'ON CONFLICT (public_page_action_id, day, timezone) DO UPDATE SET',
    );
  });

  it('removes the orphan rows it folded in, so a second run is a no-op', () => {
    expect(MIGRATION).toContain('DELETE FROM public.analytics_action_daily');
    expect(MIGRATION).toContain('recovered.orphan_action_id');
  });

  it('re-points the event log to match the rollup it repaired', () => {
    expect(MIGRATION).toContain('UPDATE public.analytics_events');
    expect(MIGRATION).toContain(
      'SET public_page_action_id = recovered.live_action_id',
    );
  });

  it('never edits the consolidated baseline', () => {
    expect(MIGRATION).not.toContain('full_schema');
    expect(MIGRATION).not.toMatch(/CREATE TABLE public\./);
  });
});
