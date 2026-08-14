-- Replace platform-administrator approval of business profile changes with a
-- 30-day cooldown the business enforces on itself.
--
-- Before this change `business:profile:update` was held at `access_mode =
-- 'approval'` for the Ultra plan configuration -- the only plan that carries
-- the permission at all -- so every profile save waited on a platform
-- administrator. A profile edit now applies immediately and locks the whole
-- profile section for 30 days instead.
--
-- The cooldown covers every field the section owns: name, username, phone,
-- logo, favicon, default_avatar and website_color. `field_modes` is cleared
-- rather than used to keep some fields on approval, because nothing in the
-- section is reviewed any more.
--
-- `access_mode` must move off 'approval' for this to take effect at all:
-- `AuthorizationService.evaluate` treats `access_mode = 'approval'` as
-- approval-required for the whole permission regardless of `field_modes`.
--
-- `full_schema.sql` is deliberately left untouched: it is the frozen baseline,
-- and `db:migrate` runs the forward migrations after it on fresh databases too.
--
-- Profile approval is removed outright, not just switched off by configuration:
-- the review routes, the platform-console panel, and the approval branch in
-- `AuthService`/`AuthController` are gone. Requests still sitting in the queue
-- are therefore cancelled below rather than left pending -- nothing can review
-- them any more, so leaving them would strand rows that display as "waiting"
-- forever. Cancelling discards only the request; the business keeps its current
-- profile and can re-apply the change immediately, subject to the cooldown.

-- When the profile was last actually changed. NULL means never, so a business
-- that has not edited its profile is not locked out on the day this ships.
-- It lives on `businesses` rather than `business_branding` because the window
-- now covers name, username and phone as well as the branding columns.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS profile_changed_at timestamp with time zone;

COMMENT ON COLUMN public.businesses.profile_changed_at IS
  'Last time any business profile field actually changed value. Drives the 30-day profile change cooldown; NULL means the profile has never been changed.';

UPDATE public.billing_plan_permissions AS grant_row
   SET access_mode = 'direct',
       field_modes = '{}'::jsonb,
       updated_at = NOW()
  FROM public.auth_permissions AS permission
 WHERE permission.id = grant_row.permission_id
   AND permission.permission_key = 'business:profile:update'
   AND grant_row.access_mode = 'approval';

-- Nothing can review these any more, so they would otherwise sit as "waiting"
-- forever in a console that no longer lists them.
UPDATE public.business_profile_change_requests
   SET status = 'rejected',
       reviewed_at = NOW()
 WHERE status = 'pending';

-- `canceled` rather than `rejected`: the request was withdrawn by the platform,
-- not judged. `business_profile_change_requests` has no such status, so that
-- table uses `rejected` above.
UPDATE public.permission_approval_requests AS request
   SET status = 'canceled',
       reviewed_at = NOW()
  FROM public.auth_permissions AS permission
 WHERE permission.id = request.permission_id
   AND permission.permission_key = 'business:profile:update'
   AND request.status = 'pending';
