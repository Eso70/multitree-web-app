ALTER TABLE public.platform_admins
  ALTER COLUMN name SET DEFAULT 'Sponsor.krd',
  ALTER COLUMN accent_color SET DEFAULT 'gradient:to-r:#25F4EE:#FE2C55';

ALTER TABLE public.business_signup_applications
  ALTER COLUMN website_color SET DEFAULT 'gradient:to-r:#25F4EE:#FE2C55';

UPDATE public.platform_admins
SET name = CASE WHEN name = 'MultiTree' THEN 'Sponsor.krd' ELSE name END,
    accent_color = CASE
      WHEN accent_color = '#b6f20d' THEN 'gradient:to-r:#25F4EE:#FE2C55'
      ELSE accent_color
    END,
    accent_ink_color = CASE
      WHEN accent_color = '#b6f20d' THEN '#111827'
      ELSE accent_ink_color
    END,
    updated_at = NOW()
WHERE name = 'MultiTree' OR accent_color = '#b6f20d';

UPDATE public.businesses
SET name = 'Sponsor.krd', updated_at = NOW()
WHERE account_type = 'platform' AND name = 'MultiTree';

UPDATE public.business_branding branding
SET website_color = 'gradient:to-r:#25F4EE:#FE2C55', updated_at = NOW()
FROM public.businesses business
WHERE branding.business_id = business.id
  AND business.account_type = 'platform'
  AND branding.website_color = '#b6f20d';

UPDATE public.business_defaults
SET footer_text = 'Sponsor.krd', updated_at = NOW()
WHERE footer_text = 'MultiTree';

UPDATE public.linktrees
SET footer_text = 'Sponsor.krd', updated_at = NOW()
WHERE footer_text = 'MultiTree';

UPDATE public.platform_admins
SET username = 'sponsor-krd-admin', updated_at = NOW()
WHERE username = 'multitree-admin';

UPDATE public.businesses
SET username = 'sponsor-krd-platform',
    subdomain = 'sponsor-krd-platform',
    updated_at = NOW()
WHERE account_type = 'platform'
  AND (username = 'multitree-platform' OR subdomain = 'multitree-platform');

UPDATE public.business_branding branding
SET logo = CASE
      WHEN branding.logo = '/images/multitree-logo-mark.png'
        THEN '/images/sponsor-krd-logo-mark.png'
      ELSE branding.logo
    END,
    favicon = CASE
      WHEN branding.favicon = '/images/multitree-logo-mark.png'
        THEN '/favicon.ico'
      ELSE branding.favicon
    END,
    updated_at = NOW()
FROM public.businesses business
WHERE branding.business_id = business.id
  AND business.account_type = 'platform'
  AND (
    branding.logo = '/images/multitree-logo-mark.png'
    OR branding.favicon = '/images/multitree-logo-mark.png'
  );

ALTER TABLE public.access_rules DROP CONSTRAINT access_rules_scope_check;
UPDATE public.access_rules SET scope = 'sponsor_krd' WHERE scope = 'multitree';
ALTER TABLE public.access_rules
  ADD CONSTRAINT access_rules_scope_check CHECK (
    scope IN ('sponsor_krd', 'platform_admin', 'business', 'business_admin', 'public_linktree', 'business_api')
  );

ALTER TABLE public.http_request_events DROP CONSTRAINT chk_http_request_actor;
UPDATE public.http_request_events
SET actor_type = 'sponsor_krd'
WHERE actor_type = 'multitree';
ALTER TABLE public.http_request_events
  ADD CONSTRAINT chk_http_request_actor CHECK (
    actor_type IN ('anonymous', 'business', 'creator', 'platform-admin', 'sponsor_krd')
  );

ALTER TABLE public.security_audit_events DROP CONSTRAINT chk_security_actor_type;
UPDATE public.security_audit_events
SET actor_type = 'sponsor_krd'
WHERE actor_type = 'multitree';
ALTER TABLE public.security_audit_events
  ADD CONSTRAINT chk_security_actor_type CHECK (
    actor_type IN ('anonymous', 'business', 'creator', 'platform-admin', 'sponsor_krd')
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'communication_conversations'
      AND column_name = 'multitree_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'communication_conversations'
      AND column_name = 'sponsor_krd_key'
  ) THEN
    ALTER TABLE public.communication_conversations
      RENAME COLUMN multitree_key TO sponsor_krd_key;
  END IF;

  IF to_regclass('public.idx_communication_conversations_multitree_key') IS NOT NULL
     AND to_regclass('public.idx_communication_conversations_sponsor_krd_key') IS NULL THEN
    ALTER INDEX public.idx_communication_conversations_multitree_key
      RENAME TO idx_communication_conversations_sponsor_krd_key;
  END IF;
END $$;

UPDATE public.uploaded_media_assets
SET scope = 'sponsor_krd'
WHERE scope = 'multitree';
