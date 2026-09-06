--
-- 2026-09-05_add_linktree_is_campaign_active.sql
--
-- Adds an is_campaign_active boolean flag to linktrees so businesses can
-- mark pages actively used in ad campaigns and pin them to the top of the list.
-- This does not disable or take down public pages when false.
--

ALTER TABLE public.linktrees
    ADD COLUMN IF NOT EXISTS is_campaign_active boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.linktrees.is_campaign_active IS
    'Indicates whether this linktree is currently actively used in a live ad campaign. Pinned to top of dashboard when true.';

CREATE INDEX IF NOT EXISTS idx_linktrees_business_campaign_active
    ON public.linktrees (business_id, is_campaign_active DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_linktrees_business_default_campaign
    ON public.linktrees (business_id, is_default DESC, is_campaign_active DESC, created_at DESC);

-- Register is_campaign_active in auth_permissions field_schema for business:linktrees:update
UPDATE public.auth_permissions
SET field_schema = field_schema || '{"is_campaign_active": "Campaign active status"}'::jsonb
WHERE permission_key = 'business:linktrees:update'
  AND NOT (field_schema ? 'is_campaign_active');

