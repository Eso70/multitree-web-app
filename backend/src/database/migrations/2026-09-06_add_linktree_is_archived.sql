--
-- 2026-09-06_add_linktree_is_archived.sql
--
-- Adds is_archived and archived_at columns to linktrees for manual archiving
-- so businesses can declutter their dashboard while keeping public pages working.
--

ALTER TABLE public.linktrees
    ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

COMMENT ON COLUMN public.linktrees.is_archived IS
    'Indicates whether this linktree is manually archived by the business to hide it from the active dashboard view.';

COMMENT ON COLUMN public.linktrees.archived_at IS
    'Timestamp when the linktree was manually archived, or null if active.';

CREATE INDEX IF NOT EXISTS idx_linktrees_business_archived
    ON public.linktrees (business_id, is_archived, is_default DESC, is_campaign_active DESC, created_at DESC);

-- Register is_archived in auth_permissions field_schema for business:linktrees:update
UPDATE public.auth_permissions
SET field_schema = field_schema || '{"is_archived": "Archive status"}'::jsonb
WHERE permission_key = 'business:linktrees:update'
  AND NOT (field_schema ? 'is_archived');
