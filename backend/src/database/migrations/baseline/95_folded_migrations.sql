--
-- 95_folded_migrations.sql
--
-- Statements that must keep migration form so their generated names match.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- FORWARD MIGRATIONS FOLDED INTO THIS BASELINE
--
-- `pnpm db:reset` applies this file and nothing else -- it never runs the
-- forward migrations -- so a reset used to produce a schema that still had the
-- password columns, the pre-rename template keys and MultiTree's own logo as
-- the business default. Everything through the 2026-08-20 Creator Google
-- authentication change is now folded in, so a fresh database carries the
-- complete current schema.
--
-- This is the "separate, periodic maintenance step" described in
-- `forward-migrations.ts`, not a schema change shipped against the baseline.
-- AGENTS.md's "never edit the baseline" rule is about the latter.
--
-- The absorbed migration files are deliberately removed. This repository now
-- recreates disposable databases from the baseline; valuable databases need
-- an explicit backup-and-replacement procedure before adopting this baseline.
--
-- Most of the folding is done in place above: dropped columns are simply
-- absent, added columns and changed defaults are declared in their own
-- `CREATE TABLE`, and the seeded catalog rows are written in their post-
-- migration form. Only the statements below have to stay in migration form,
-- because they must reproduce constraint and index names exactly as the
-- migrations produced them.
--
-- Three migrations are NOT represented here because they have nothing to act
-- on in an empty database, which the rebaseline differential check confirms:
--   * 2026-08-18_recover_orphaned_link_click_history.sql (repairs existing rollups)
--   * 2026-08-18_retire_website_link_platform.sql        (rewrites existing links)
--   * 2026-08-18_fill_default_linktree_page_copy.sql     (backfills existing pages)
--

-- From 2026-08-12_add_business_session_impersonation.sql. The columns are
-- declared on the table above; the foreign key and the partial index are here
-- so their names match what the migration created.
ALTER TABLE public.business_sessions
    ADD CONSTRAINT business_sessions_impersonated_by_fkey
    FOREIGN KEY (impersonated_by_platform_admin_id)
    REFERENCES public.platform_admins(id) ON DELETE SET NULL;

CREATE INDEX business_sessions_impersonated_by_idx
    ON public.business_sessions (impersonated_by_platform_admin_id)
    WHERE impersonated_by_platform_admin_id IS NOT NULL;

-- From 2026-08-13_profile_change_cooldown.sql.
COMMENT ON COLUMN public.businesses.profile_changed_at IS
  'Last time any business profile field actually changed value. Drives the 30-day profile change cooldown; NULL means the profile has never been changed.';
