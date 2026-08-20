--
-- 90_onboarding_identity.sql
--
-- Invite-only Google onboarding: users, identities, memberships, applications.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- ============================================================================
-- INVITE-ONLY GOOGLE BUSINESS ONBOARDING
-- Permanent identity and application state lives in PostgreSQL. OAuth state,
-- signup sessions, and tenant handoff codes are short-lived Redis records.
-- ============================================================================

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email character varying(255) NOT NULL,
    display_name character varying(150) NOT NULL,
    avatar_url text,
    status character varying(20) DEFAULT 'active' NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_email_normalized_check CHECK (email = lower(btrim(email))),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended')),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE public.user_identities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider character varying(20) NOT NULL,
    provider_subject character varying(255) NOT NULL,
    provider_email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    profile jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_authenticated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_identities_provider_check CHECK (provider IN ('google')),
    CONSTRAINT user_identities_profile_check CHECK (jsonb_typeof(profile) = 'object'),
    CONSTRAINT user_identities_subject_key UNIQUE (provider, provider_subject)
);

CREATE TABLE public.business_memberships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role character varying(20) DEFAULT 'owner' NOT NULL,
    status character varying(20) DEFAULT 'active' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_memberships_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT business_memberships_status_check CHECK (status IN ('active', 'suspended')),
    CONSTRAINT business_memberships_user_business_key UNIQUE (business_id, user_id)
);

CREATE UNIQUE INDEX business_memberships_one_owner_idx
ON public.business_memberships (business_id) WHERE role = 'owner' AND status = 'active';

CREATE TABLE public.business_signup_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash character(64) NOT NULL UNIQUE,
    email character varying(255),
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_by uuid NOT NULL REFERENCES public.platform_admins(id) ON DELETE RESTRICT,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_signup_invitations_email_check CHECK (email IS NULL OR email = lower(btrim(email)))
);

CREATE TABLE public.business_signup_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id uuid NOT NULL UNIQUE REFERENCES public.business_signup_invitations(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
    status character varying(24) DEFAULT 'draft' NOT NULL,
    owner_name character varying(150) NOT NULL,
    owner_email character varying(255) NOT NULL,
    google_avatar_url text,
    business_name character varying(150),
    phone character varying(30),
    country character varying(100),
    city character varying(100),
    requested_subdomain character varying(100),
    social_profiles jsonb DEFAULT '{}'::jsonb NOT NULL,
    logo text,
    favicon text,
    default_avatar text,
    website_color character varying(255) DEFAULT '#b6f20d' NOT NULL,
    terms_version character varying(40),
    privacy_version character varying(40),
    terms_accepted_at timestamp with time zone,
    privacy_accepted_at timestamp with time zone,
    phone_verified_at timestamp with time zone,
    phone_verification_method character varying(30),
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    review_reason text,
    selected_subscription_plan_id uuid REFERENCES public.billing_subscription_plans(id) ON DELETE RESTRICT,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_signup_applications_user_key UNIQUE (user_id),
    CONSTRAINT business_signup_applications_status_check CHECK (status IN ('draft', 'pending', 'changes_requested', 'approved', 'rejected')),
    CONSTRAINT business_signup_applications_socials_check CHECK (jsonb_typeof(social_profiles) = 'object'),
    CONSTRAINT business_signup_applications_subdomain_check CHECK (requested_subdomain IS NULL OR (requested_subdomain = lower(requested_subdomain) AND requested_subdomain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'))
);

CREATE UNIQUE INDEX business_signup_applications_reserved_subdomain_idx
ON public.business_signup_applications (requested_subdomain)
WHERE requested_subdomain IS NOT NULL AND status IN ('draft', 'pending', 'changes_requested', 'approved');

CREATE TABLE public.business_signup_application_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES public.business_signup_applications(id) ON DELETE CASCADE,
    actor_type character varying(24) NOT NULL,
    actor_id uuid,
    event_type character varying(60) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_signup_events_actor_check CHECK (actor_type IN ('applicant', 'platform-admin', 'system')),
    CONSTRAINT business_signup_events_metadata_check CHECK (jsonb_typeof(metadata) = 'object')
);

ALTER TABLE public.business_sessions
    ADD CONSTRAINT business_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_user_identities_user ON public.user_identities(user_id);
CREATE INDEX idx_business_memberships_user ON public.business_memberships(user_id, status);
CREATE INDEX idx_signup_invitations_expiry ON public.business_signup_invitations(expires_at) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX idx_signup_applications_status ON public.business_signup_applications(status, submitted_at DESC);
CREATE INDEX idx_signup_application_events_application ON public.business_signup_application_events(application_id, created_at);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_user_identities_updated_at BEFORE UPDATE ON public.user_identities
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_business_memberships_updated_at BEFORE UPDATE ON public.business_memberships
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_business_signup_applications_updated_at BEFORE UPDATE ON public.business_signup_applications
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


