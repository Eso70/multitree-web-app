-- Platform-administrator impersonation ("open business dashboard").
--
-- A business session created by an administrator is marked here rather than
-- being indistinguishable from a real owner sign-in. The marker is what lets
-- the session lookup, the audit trail, the dashboard banner, and the
-- impersonation restriction policy all recognise the session for what it is.

ALTER TABLE public.business_sessions
  ADD COLUMN IF NOT EXISTS impersonated_by_platform_admin_id uuid,
  ADD COLUMN IF NOT EXISTS impersonation_reason text,
  ADD COLUMN IF NOT EXISTS impersonation_started_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'business_sessions_impersonated_by_fkey'
  ) THEN
    ALTER TABLE public.business_sessions
      ADD CONSTRAINT business_sessions_impersonated_by_fkey
      FOREIGN KEY (impersonated_by_platform_admin_id)
      REFERENCES public.platform_admins(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Impersonated rows are excluded from the per-business session cap and are
-- listed separately in business security screens, so both paths filter on
-- this column.
CREATE INDEX IF NOT EXISTS business_sessions_impersonated_by_idx
  ON public.business_sessions (impersonated_by_platform_admin_id)
  WHERE impersonated_by_platform_admin_id IS NOT NULL;

-- The application refuses to boot when a catalog permission is missing, so the
-- new capability is registered in the same migration that ships it.
INSERT INTO public.auth_permissions (
  permission_key,
  resource,
  action,
  description,
  risk_level,
  category,
  display_order,
  field_schema,
  supports_approval,
  status
) VALUES (
  'platform:businesses:impersonate',
  'platform.businesses',
  'impersonate',
  'Open a business dashboard as that business',
  'critical',
  'Business administration',
  600,
  '{}',
  false,
  'active'
)
ON CONFLICT (permission_key) DO NOTHING;
