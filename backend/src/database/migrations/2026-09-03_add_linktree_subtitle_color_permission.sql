--
-- 2026-09-03_add_linktree_subtitle_color_permission.sql
--
-- Registers subtitle_color in auth_permissions field_schema for business:linktrees:update.
--

UPDATE public.auth_permissions
SET field_schema = field_schema || '{"subtitle_color": "Subtitle color"}'::jsonb
WHERE permission_key = 'business:linktrees:update'
  AND NOT (field_schema ? 'subtitle_color');
