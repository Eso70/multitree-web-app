--
-- 92_creator_accounts.sql
--
-- Root-domain self-service Creator ownership, Google-backed trial claims, and
-- the global route locks shared by platform and Creator public pages.
--

CREATE TABLE public.creator_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'expired', 'archived')),
  phone_hmac character(64) UNIQUE,
  phone_last_four character(4),
  phone_verified_at timestamptz,
  page_type varchar(20) CHECK (page_type IN ('linktree', 'mini_website')),
  linktree_id uuid UNIQUE REFERENCES public.linktrees(id) ON DELETE SET NULL,
  mini_website_id uuid UNIQUE REFERENCES public.mini_websites(id) ON DELETE SET NULL,
  page_reservation_token uuid,
  page_reservation_expires_at timestamptz,
  trial_days smallint NOT NULL DEFAULT 7 CHECK (trial_days IN (7, 30)),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  paid_started_at timestamptz,
  last_login_at timestamptz,
  risk_level varchar(12) NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (page_type IS NULL AND linktree_id IS NULL AND mini_website_id IS NULL)
    OR (page_type = 'linktree' AND mini_website_id IS NULL)
    OR (page_type = 'mini_website' AND linktree_id IS NULL)
  ),
  CHECK (
    (page_reservation_token IS NULL AND page_reservation_expires_at IS NULL)
    OR (page_reservation_token IS NOT NULL
      AND page_reservation_expires_at IS NOT NULL
      AND linktree_id IS NULL AND mini_website_id IS NULL)
  ),
  CHECK (
    (trial_started_at IS NULL AND trial_ends_at IS NULL AND grace_ends_at IS NULL)
    OR (trial_started_at IS NOT NULL AND trial_ends_at > trial_started_at
      AND grace_ends_at >= trial_ends_at)
  )
);

CREATE TABLE public.creator_trial_claims (
  creator_account_id uuid PRIMARY KEY
    REFERENCES public.creator_accounts(id) ON DELETE RESTRICT,
  phone_hmac character(64),
  email_hmac character(64) NOT NULL UNIQUE,
  google_subject_hmac character(64),
  device_hmac character(64),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_trial_claims_verified_identity_check
    CHECK (phone_hmac IS NOT NULL OR google_subject_hmac IS NOT NULL)
);

CREATE UNIQUE INDEX creator_trial_claims_phone_hmac_idx
  ON public.creator_trial_claims (phone_hmac)
  WHERE phone_hmac IS NOT NULL;
CREATE UNIQUE INDEX creator_trial_claims_google_subject_hmac_idx
  ON public.creator_trial_claims (google_subject_hmac)
  WHERE google_subject_hmac IS NOT NULL;
CREATE UNIQUE INDEX creator_trial_claims_device_hmac_idx
  ON public.creator_trial_claims (device_hmac)
  WHERE device_hmac IS NOT NULL;

CREATE TABLE public.creator_registration_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_hmac character(64) NOT NULL,
  masked_email varchar(255) NOT NULL,
  phone_hmac character(64),
  device_hmac character(64),
  ip_prefix_hmac character(64),
  outcome varchar(24) NOT NULL
    CHECK (outcome IN ('code_sent', 'verified', 'failed', 'rate_limited',
                       'duplicate_trial', 'account_created')),
  risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(risk_reasons) = 'array'),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creator_registration_attempts_email
  ON public.creator_registration_attempts(email_hmac, created_at DESC);
CREATE INDEX idx_creator_registration_attempts_device
  ON public.creator_registration_attempts(device_hmac, created_at DESC)
  WHERE device_hmac IS NOT NULL;
CREATE INDEX idx_creator_registration_attempts_expiry
  ON public.creator_registration_attempts(expires_at);

CREATE TABLE public.root_public_slugs (
  page_type varchar(20) NOT NULL CHECK (page_type IN ('linktree', 'mini_website')),
  slug varchar(255) NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  linktree_id uuid UNIQUE REFERENCES public.linktrees(id) ON DELETE CASCADE,
  mini_website_id uuid UNIQUE REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_type, slug),
  CHECK (
    (page_type = 'linktree' AND linktree_id IS NOT NULL AND mini_website_id IS NULL)
    OR (page_type = 'mini_website' AND mini_website_id IS NOT NULL AND linktree_id IS NULL)
  )
);

CREATE OR REPLACE FUNCTION public.fn_sync_root_linktree_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_type varchar(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.root_public_slugs WHERE linktree_id = OLD.id;
    RETURN OLD;
  END IF;
  SELECT account_type INTO owner_type
    FROM public.businesses WHERE id = NEW.business_id;
  IF owner_type IN ('platform', 'creator') THEN
    DELETE FROM public.root_public_slugs WHERE linktree_id = NEW.id;
    INSERT INTO public.root_public_slugs
      (page_type, slug, business_id, linktree_id)
    VALUES ('linktree', NEW.seo_name, NEW.business_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_root_mini_website_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_type varchar(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.root_public_slugs WHERE mini_website_id = OLD.id;
    RETURN OLD;
  END IF;
  SELECT account_type INTO owner_type
    FROM public.businesses WHERE id = NEW.business_id;
  IF owner_type IN ('platform', 'creator') THEN
    DELETE FROM public.root_public_slugs WHERE mini_website_id = NEW.id;
    INSERT INTO public.root_public_slugs
      (page_type, slug, business_id, mini_website_id)
    VALUES ('mini_website', NEW.slug, NEW.business_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_root_linktree_slug
AFTER INSERT OR DELETE OR UPDATE OF seo_name, business_id ON public.linktrees
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_root_linktree_slug();

CREATE TRIGGER trg_sync_root_mini_website_slug
AFTER INSERT OR DELETE OR UPDATE OF slug, business_id ON public.mini_websites
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_root_mini_website_slug();

CREATE TRIGGER trg_creator_accounts_updated_at
BEFORE UPDATE ON public.creator_accounts
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_root_public_slugs_updated_at
BEFORE UPDATE ON public.root_public_slugs
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
