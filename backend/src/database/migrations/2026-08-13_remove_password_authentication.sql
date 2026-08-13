-- Remove business and platform-administrator password authentication.
--
-- Sign-in has been invite-only Google OAuth or an emailed code for some time:
-- `POST /api/auth/login` and `POST /api/platform/auth/login` were never routed,
-- manual account provisioning and administrator password reset were never
-- routed, and businesses created through onboarding always stored a NULL
-- `password_hash`. Nothing in the application reads or writes any of these
-- columns, so they are dropped rather than left as an unused credential store.
--
-- `full_schema.sql` is deliberately left untouched: it is the frozen baseline,
-- and `db:migrate` runs the forward migrations after it on fresh databases too,
-- so both fresh and existing databases converge on these columns being absent.
-- For the same reason these are NOT added to `OBSOLETE_COLUMNS` in
-- `migration-compatibility.ts` — that check runs against a fresh database
-- before forward migrations are applied and would reject the baseline.

ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS password_changed_at;

ALTER TABLE public.platform_admins
  DROP COLUMN IF EXISTS password_hash;

-- Three capabilities were named for password operations but have guarded
-- session revocation since the password routes were withdrawn. Renaming the
-- rows in place keeps their `id`, so every `billing_plan_permissions`,
-- `permission_approval_requests`, and `platform_permission_denies` row that
-- references them survives the rename. `AuthorizationService.onModuleInit`
-- fails closed when a catalog key is missing from this table, so the rename
-- ships in the same change as the code that expects the new keys.
UPDATE public.auth_permissions
   SET permission_key = 'business:security:sessions-revoke',
       action = 'sessions-revoke',
       description = 'Revoke business login sessions',
       updated_at = NOW()
 WHERE permission_key = 'business:security:password-change';

UPDATE public.auth_permissions
   SET permission_key = 'platform:businesses:sessions-revoke',
       action = 'sessions-revoke',
       description = 'Revoke login sessions for a business',
       updated_at = NOW()
 WHERE permission_key = 'platform:businesses:password-reset';

UPDATE public.auth_permissions
   SET permission_key = 'platform:settings:sessions-revoke',
       action = 'sessions-revoke',
       description = 'Manage platform administrator login sessions',
       updated_at = NOW()
 WHERE permission_key = 'platform:settings:password-change';

-- A database that predates the permission catalog would not have the old rows
-- to rename, so insert the new keys when the rename matched nothing. The
-- application refuses to boot when a catalog permission is missing.
INSERT INTO public.auth_permissions (
  permission_key, resource, action, description,
  risk_level, category, display_order, field_schema, supports_approval, status
) VALUES
  ('business:security:sessions-revoke', 'business.security', 'sessions-revoke',
   'Revoke business login sessions', 'critical', 'Business account', 80,
   '{}', false, 'active'),
  ('platform:businesses:sessions-revoke', 'platform.businesses', 'sessions-revoke',
   'Revoke login sessions for a business', 'critical', 'Business administration', 540,
   '{}', false, 'active'),
  ('platform:settings:sessions-revoke', 'platform.settings', 'sessions-revoke',
   'Manage platform administrator login sessions', 'critical', 'Platform settings', 720,
   '{}', false, 'active')
ON CONFLICT (permission_key) DO NOTHING;
