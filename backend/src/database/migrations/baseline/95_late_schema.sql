--
-- 95_late_schema.sql
--
-- Late schema objects whose dependencies are created by earlier baseline parts.
--
-- Part of the Sponsor.krd baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- LATE BASELINE OBJECTS
--
-- Columns and ordinary indexes are declared directly with their owning tables
-- and index sections. This part is reserved for objects that must be created
-- after those domains, while catalog rows remain in 99_data.sql.
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

COMMENT ON COLUMN public.linktrees.subtitle_color IS
    'Optional CSS colour value for the subtitle shown on the public Linktree page. NULL inherits the template text colour.';

COMMENT ON COLUMN public.linktrees.is_campaign_active IS
    'Indicates whether this Linktree is actively used in an advertising campaign.';

COMMENT ON COLUMN public.linktrees.is_archived IS
    'Indicates whether this Linktree is hidden from the active dashboard view.';

COMMENT ON COLUMN public.linktrees.archived_at IS
    'Timestamp when the Linktree was archived, or NULL while active.';
