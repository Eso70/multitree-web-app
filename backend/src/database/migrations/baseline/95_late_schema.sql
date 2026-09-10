--
-- 95_late_schema.sql
--
-- Late schema objects whose dependencies are created by earlier baseline parts.
--
-- Part of the Sponsor.krd baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- LATE BASELINE OBJECTS
--
-- Columns and ordinary indexes are declared directly with their owning tables
-- and index sections. This part is reserved for objects that must be created
-- after those domains, while catalog rows remain in 99_data.sql.
--

-- From 2026-08-12_add_business_session_impersonation.sql. The columns are
-- declared on the table above; the foreign key and the partial index are here
-- so their names match what the migration created.
ALTER TABLE public.business_sessions
    ADD CONSTRAINT business_sessions_impersonated_by_fkey
    FOREIGN KEY (impersonated_by_platform_admin_id)
    REFERENCES public.platform_admins(id) ON DELETE SET NULL;

CREATE INDEX business_sessions_impersonated_by_idx
    ON public.business_sessions (impersonated_by_platform_admin_id)
    WHERE impersonated_by_platform_admin_id IS NOT NULL;

-- From 2026-08-13_profile_change_cooldown.sql.
COMMENT ON COLUMN public.businesses.profile_changed_at IS
  'Last time any business profile field actually changed value. Drives the 30-day profile change cooldown; NULL means the profile has never been changed.';

-- From 2026-08-29_client_linktree_access.sql.
-- Secure, business-issued access for a client to create exactly one Linktree.
-- Raw invitation and session tokens are never persisted; only SHA-256 hashes
-- are stored. Expiring access intentionally does not delete the Linktree.

CREATE TABLE public.client_linktree_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_label character varying(100) NOT NULL,
    token_hash character(64) NOT NULL UNIQUE,
    pin_hash character(64) NOT NULL,
    status character varying(12) DEFAULT 'active'::character varying NOT NULL,
    failed_pin_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    expired_at timestamp with time zone,
    CONSTRAINT client_linktree_invitations_label_check
      CHECK (char_length(btrim(client_label::text)) BETWEEN 2 AND 100),
    CONSTRAINT client_linktree_invitations_status_check
      CHECK (status::text = ANY (ARRAY['active'::text, 'submitted'::text, 'expired'::text])),
    CONSTRAINT client_linktree_invitations_attempts_check
      CHECK (failed_pin_attempts >= 0)
);

CREATE INDEX client_linktree_invitations_business_created_idx
    ON public.client_linktree_invitations (business_id, created_at DESC);

CREATE TABLE public.client_linktree_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id uuid NOT NULL REFERENCES public.client_linktree_invitations(id) ON DELETE CASCADE,
    session_token_hash character(64) NOT NULL UNIQUE,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT client_linktree_sessions_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX client_linktree_sessions_invitation_idx
    ON public.client_linktree_sessions (invitation_id, expires_at DESC);

CREATE INDEX client_linktree_sessions_active_expiry_idx
    ON public.client_linktree_sessions (expires_at)
    WHERE revoked_at IS NULL;

ALTER TABLE public.linktrees
    ADD COLUMN client_invitation_id uuid;

ALTER TABLE public.linktrees
    ADD CONSTRAINT linktrees_client_invitation_id_fkey
    FOREIGN KEY (client_invitation_id)
    REFERENCES public.client_linktree_invitations(id)
    ON DELETE SET NULL;

ALTER TABLE public.linktrees
    ADD CONSTRAINT linktrees_client_invitation_id_key UNIQUE (client_invitation_id);

COMMENT ON COLUMN public.linktrees.client_invitation_id IS
    'Invitation that created this page. Unique for exactly-once client submission; access revocation never deletes the page.';

COMMENT ON COLUMN public.linktrees.subtitle_color IS
    'Optional CSS colour value for the subtitle shown on the public Linktree page. NULL inherits the template text colour.';

COMMENT ON COLUMN public.linktrees.is_campaign_active IS
    'Indicates whether this Linktree is actively used in an advertising campaign.';

COMMENT ON COLUMN public.linktrees.is_archived IS
    'Indicates whether this Linktree is hidden from the active dashboard view.';

COMMENT ON COLUMN public.linktrees.archived_at IS
    'Timestamp when the Linktree was archived, or NULL while active.';
