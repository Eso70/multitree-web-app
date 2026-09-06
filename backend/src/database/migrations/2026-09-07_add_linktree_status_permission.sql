--
-- 2026-09-07_add_linktree_status_permission.sql
--
-- Registers status in auth_permissions field_schema for business:linktrees:update.
--

UPDATE public.auth_permissions
SET field_schema = field_schema || '{"status": "Page status"}'::jsonb
WHERE permission_key = 'business:linktrees:update'
  AND NOT (field_schema ? 'status');
