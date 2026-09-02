--
-- 2026-09-02_add_linktree_subtitle_color.sql
--
-- Adds an optional subtitle_color column to the linktrees table so business
-- owners can customise the colour of the short description ("ناونیشانی کورت")
-- displayed on their public Linktree page.
--
-- The column is nullable with no default: NULL means "use the template's
-- inherited text colour", so existing pages are unaffected and no backfill
-- is needed.
--
-- Safe to apply on a live database: adding a nullable column without a
-- DEFAULT is a metadata-only operation in PostgreSQL and does not rewrite
-- any existing rows.
--

ALTER TABLE public.linktrees
    ADD COLUMN IF NOT EXISTS subtitle_color character varying(50);

COMMENT ON COLUMN public.linktrees.subtitle_color IS
    'Optional CSS colour value (hex, rgb, hsl) for the short-description subtitle shown on the public Linktree page. NULL inherits the template default text colour.';
