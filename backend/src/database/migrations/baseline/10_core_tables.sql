--
-- 10_core_tables.sql
--
-- Core tables: identity, authorization, billing, linktrees and operations.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

--
-- Name: access_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    effect character varying(5) NOT NULL,
    scope character varying(30) NOT NULL,
    ip_network cidr NOT NULL,
    business_id uuid,
    linktree_id uuid,
    reason character varying(500) NOT NULL,
    status character varying(10) DEFAULT 'active'::character varying NOT NULL,
    expires_at timestamp with time zone,
    match_count bigint DEFAULT 0 NOT NULL,
    last_matched_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT access_rules_check CHECK ((((scope)::text <> ALL (ARRAY[('business'::character varying)::text, ('business_admin'::character varying)::text, ('public_linktree'::character varying)::text, ('business_api'::character varying)::text])) OR (business_id IS NOT NULL))),
    CONSTRAINT access_rules_check1 CHECK ((((scope)::text <> 'public_linktree'::text) OR (linktree_id IS NOT NULL))),
    CONSTRAINT access_rules_effect_check CHECK (((effect)::text = ANY (ARRAY[('deny'::character varying)::text, ('allow'::character varying)::text]))),
    CONSTRAINT access_rules_match_count_check CHECK ((match_count >= 0)),
    CONSTRAINT access_rules_scope_check CHECK (((scope)::text = ANY (ARRAY[('multitree'::character varying)::text, ('platform_admin'::character varying)::text, ('business'::character varying)::text, ('business_admin'::character varying)::text, ('public_linktree'::character varying)::text, ('business_api'::character varying)::text]))),
    CONSTRAINT access_rules_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


--
-- Name: auth_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_key character varying(120) NOT NULL,
    resource character varying(80) NOT NULL,
    action character varying(40) NOT NULL,
    description character varying(300) DEFAULT ''::character varying NOT NULL,
    risk_level character varying(12) DEFAULT 'standard'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category character varying(80) DEFAULT 'General'::character varying NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    field_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    supports_approval boolean DEFAULT false NOT NULL,
    status character varying(12) DEFAULT 'active'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_permissions_field_schema_check CHECK ((jsonb_typeof(field_schema) = 'object'::text)),
    CONSTRAINT auth_permissions_permission_key_check CHECK (((permission_key)::text ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'::text)),
    CONSTRAINT auth_permissions_risk_level_check CHECK (((risk_level)::text = ANY (ARRAY[('standard'::character varying)::text, ('sensitive'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT auth_permissions_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


--
-- Name: billing_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entitlement_key character varying(120) NOT NULL,
    name character varying(120) NOT NULL,
    description character varying(500) DEFAULT ''::character varying NOT NULL,
    value_type character varying(16) NOT NULL,
    unit character varying(40),
    category character varying(40) DEFAULT 'general'::character varying NOT NULL,
    status character varying(12) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_entitlements_entitlement_key_check CHECK (((entitlement_key)::text ~ '^(feature|limit|retention|service)\.[a-z][a-z0-9._-]*$'::text)),
    CONSTRAINT billing_entitlements_name_check CHECK ((btrim((name)::text) <> ''::text)),
    CONSTRAINT billing_entitlements_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text]))),
    CONSTRAINT billing_entitlements_value_type_check CHECK (((value_type)::text = ANY (ARRAY[('boolean'::character varying)::text, ('integer'::character varying)::text, ('string'::character varying)::text])))
);


--
-- Name: billing_plan_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plan_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_plan_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plan_entitlements (
    plan_configuration_id uuid NOT NULL,
    entitlement_id uuid NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_plan_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plan_permissions (
    plan_configuration_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    access_mode character varying(12) NOT NULL,
    field_modes jsonb DEFAULT '{}'::jsonb NOT NULL,
    resource_scope jsonb DEFAULT '{"type": "all"}'::jsonb NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_plan_permissions_access_mode_check CHECK (((access_mode)::text = ANY (ARRAY[('direct'::character varying)::text, ('approval'::character varying)::text, ('deny'::character varying)::text]))),
    CONSTRAINT billing_plan_permissions_conditions_check CHECK ((jsonb_typeof(conditions) = 'object'::text)),
    CONSTRAINT billing_plan_permissions_field_modes_check CHECK ((jsonb_typeof(field_modes) = 'object'::text)),
    CONSTRAINT billing_plan_permissions_resource_scope_check CHECK ((jsonb_typeof(resource_scope) = 'object'::text))
);


--
-- Name: billing_plan_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plan_templates (
    plan_configuration_id uuid NOT NULL,
    template_key character varying(80) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_plan_templates_template_key_check CHECK ((btrim((template_key)::text) <> ''::text))
);


--
-- Name: billing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(60) NOT NULL,
    name character varying(120) NOT NULL,
    description character varying(500) DEFAULT ''::character varying NOT NULL,
    status character varying(12) DEFAULT 'active'::character varying NOT NULL,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    monthly_price_minor bigint DEFAULT 0 NOT NULL,
    yearly_price_minor bigint DEFAULT 0 NOT NULL,
    trial_days smallint DEFAULT 0 NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_plans_code_check CHECK ((((code)::text = lower((code)::text)) AND ((code)::text ~ '^[a-z][a-z0-9-]*$'::text))),
    CONSTRAINT billing_plans_currency_check CHECK (((currency)::text = upper((currency)::text))),
    CONSTRAINT billing_plans_monthly_price_minor_check CHECK ((monthly_price_minor >= 0)),
    CONSTRAINT billing_plans_name_check CHECK ((btrim((name)::text) <> ''::text)),
    CONSTRAINT billing_plans_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('archived'::character varying)::text]))),
    CONSTRAINT billing_plans_trial_days_check CHECK (((trial_days >= 0) AND (trial_days <= 365))),
    CONSTRAINT billing_plans_yearly_price_minor_check CHECK ((yearly_price_minor >= 0))
);


--
-- Name: billing_policy_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_policy_audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    actor_id uuid,
    business_id uuid,
    plan_id uuid,
    plan_configuration_id uuid,
    resource_type character varying(80) NOT NULL,
    resource_id uuid,
    reason character varying(500),
    before_value jsonb,
    after_value jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(60) NOT NULL,
    name character varying(120) NOT NULL,
    description character varying(500) DEFAULT ''::character varying NOT NULL,
    permission_profile_id uuid NOT NULL,
    status character varying(12) DEFAULT 'active'::character varying NOT NULL,
    currency character(3) DEFAULT 'USD'::bpchar NOT NULL,
    monthly_price_minor bigint DEFAULT 0 NOT NULL,
    yearly_price_minor bigint DEFAULT 0 NOT NULL,
    trial_days smallint DEFAULT 0 NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_subscription_plans_code_check CHECK ((((code)::text = lower((code)::text)) AND ((code)::text ~ '^[a-z][a-z0-9-]*$'::text))),
    CONSTRAINT billing_subscription_plans_currency_check CHECK (((currency)::text = upper((currency)::text))),
    CONSTRAINT billing_subscription_plans_monthly_price_minor_check CHECK ((monthly_price_minor >= 0)),
    CONSTRAINT billing_subscription_plans_name_check CHECK ((btrim((name)::text) <> ''::text)),
    CONSTRAINT billing_subscription_plans_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('archived'::character varying)::text]))),
    CONSTRAINT billing_subscription_plans_trial_days_check CHECK (((trial_days >= 0) AND (trial_days <= 365))),
    CONSTRAINT billing_subscription_plans_yearly_price_minor_check CHECK ((yearly_price_minor >= 0))
);


--
-- Name: billing_usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_usage_counters (
    business_id uuid NOT NULL,
    entitlement_key character varying(120) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    used bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_usage_counters_check CHECK ((period_end > period_start)),
    CONSTRAINT billing_usage_counters_used_check CHECK ((used >= 0))
);


--
-- Name: business_branding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_branding (
    business_id uuid NOT NULL,
    logo text DEFAULT '/images/business-logo-placeholder.png'::text NOT NULL,
    favicon text DEFAULT '/images/business-favicon-placeholder.png'::text NOT NULL,
    default_avatar text DEFAULT '/images/DefaultAvatar.png'::text NOT NULL,
    website_color character varying(100),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_branding_default_avatar_check CHECK ((btrim(default_avatar) <> ''::text)),
    CONSTRAINT business_branding_favicon_check CHECK ((btrim(favicon) <> ''::text)),
    CONSTRAINT business_branding_logo_check CHECK ((btrim(logo) <> ''::text))
);


--
-- Name: business_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_defaults (
    business_id uuid NOT NULL,
    footer_text character varying(255),
    footer_phone character varying(50),
    -- Page defaults every linktree this business creates inherits. Mirrors
    -- backend/src/common/linktree-defaults.ts; the two must agree, because a
    -- row inserted without these columns falls back to what is written here.
    -- Distinct from the tenant colour in business_branding.website_color.
    footer_hidden boolean DEFAULT true NOT NULL,
    template_key character varying(50) DEFAULT 'spectrum'::character varying NOT NULL,
    background_color character varying(100) DEFAULT '#ffffff'::character varying NOT NULL,
    whatsapp_enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_defaults_background_color_check CHECK ((btrim((background_color)::text) <> ''::text)),
    CONSTRAINT business_defaults_template_key_check CHECK ((btrim((template_key)::text) <> ''::text))
);


--
-- Name: business_profile_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_profile_change_requests (
    business_id uuid NOT NULL,
    changes jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(12) DEFAULT 'pending'::character varying NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    CONSTRAINT business_profile_change_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: business_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid,
    session_token_hash character(64) NOT NULL,
    session_expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    remembered boolean DEFAULT false NOT NULL,
    impersonated_by_platform_admin_id uuid,
    impersonation_reason text,
    impersonation_started_at timestamp with time zone,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(20) DEFAULT 'trialing'::character varying NOT NULL,
    billing_cycle character varying(12) DEFAULT 'free'::character varying NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone,
    cancels_at timestamp with time zone,
    ended_at timestamp with time zone,
    provider character varying(40),
    provider_customer_id character varying(255),
    provider_subscription_id character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_configuration_id uuid NOT NULL,
    subscription_plan_id uuid NOT NULL,
    CONSTRAINT business_subscriptions_billing_cycle_check CHECK (((billing_cycle)::text = ANY (ARRAY[('free'::character varying)::text, ('monthly'::character varying)::text, ('yearly'::character varying)::text, ('custom'::character varying)::text]))),
    CONSTRAINT business_subscriptions_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT business_subscriptions_status_check CHECK (((status)::text = ANY (ARRAY[('trialing'::character varying)::text, ('active'::character varying)::text, ('past_due'::character varying)::text, ('grace_period'::character varying)::text, ('paused'::character varying)::text, ('canceled'::character varying)::text, ('expired'::character varying)::text, ('incomplete'::character varying)::text])))
);


--
-- Name: business_tiktok_pixels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_tiktok_pixels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    pixel_id character varying(255) NOT NULL,
    encrypted_events_token bytea,
    token_last_four character varying(4),
    display_order integer DEFAULT 0 NOT NULL,
    status character varying(12) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_tiktok_pixels_display_order_check CHECK ((display_order >= 0)),
    CONSTRAINT business_tiktok_pixels_pixel_id_check CHECK ((btrim((pixel_id)::text) <> ''::text)),
    CONSTRAINT business_tiktok_pixels_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(120) NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255),
    phone character varying(30),
    subdomain character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    plan character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    max_linktrees smallint DEFAULT 5 NOT NULL,
    last_login_at timestamp with time zone,
    last_login_ip inet,
    profile_changed_at timestamp with time zone,
    onboarding_step smallint DEFAULT 1 NOT NULL,
    onboarding_version character varying(20) DEFAULT '2026-08'::character varying NOT NULL,
    onboarding_completed_at timestamp with time zone,
    account_type character varying(20) DEFAULT 'business'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT businesses_max_linktrees_check CHECK ((max_linktrees > 0)),
    CONSTRAINT businesses_onboarding_step_check CHECK (((onboarding_step >= 1) AND (onboarding_step <= 3))),
    CONSTRAINT businesses_phone_check CHECK ((btrim((phone)::text) <> ''::text)),
    CONSTRAINT businesses_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('business'::character varying)::text, ('platform'::character varying)::text, ('creator'::character varying)::text]))),
    CONSTRAINT businesses_plan_check CHECK (((plan)::text = ANY (ARRAY[('trial'::character varying)::text, ('premium'::character varying)::text, ('enterprise'::character varying)::text]))),
    CONSTRAINT businesses_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('suspended'::character varying)::text]))),
    CONSTRAINT businesses_subdomain_check CHECK ((((subdomain)::text = lower((subdomain)::text)) AND ((subdomain)::text ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text))),
    CONSTRAINT businesses_username_check CHECK ((((username)::text = lower((username)::text)) AND ((username)::text ~ '^[a-z0-9][a-z0-9._-]*$'::text)))
);


--
-- Name: http_request_event_daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_request_event_daily_stats (
    event_day date NOT NULL,
    source character varying(20) NOT NULL,
    method character varying(10) NOT NULL,
    actor_type character varying(30) NOT NULL,
    outcome character varying(20) NOT NULL,
    total bigint DEFAULT 0 NOT NULL,
    CONSTRAINT http_request_event_daily_stats_total_check CHECK ((total >= 0))
);


--
-- Name: http_request_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.http_request_events (
    id bigint NOT NULL,
    request_id character varying(100),
    source character varying(20) NOT NULL,
    method character varying(10) NOT NULL,
    request_path character varying(500) NOT NULL,
    route_pattern character varying(500),
    status_code smallint,
    duration_ms integer,
    actor_type character varying(30) DEFAULT 'anonymous'::character varying NOT NULL,
    actor_id uuid,
    actor_label character varying(200),
    business_id uuid,
    subdomain character varying(100),
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ingestion_key uuid,
    CONSTRAINT chk_http_request_actor CHECK (((actor_type)::text = ANY (ARRAY[('anonymous'::character varying)::text, ('business'::character varying)::text, ('creator'::character varying)::text, ('platform-admin'::character varying)::text, ('multitree'::character varying)::text]))),
    CONSTRAINT chk_http_request_duration CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
    CONSTRAINT chk_http_request_method CHECK (((method)::text ~ '^[A-Z]{1,10}$'::text)),
    CONSTRAINT chk_http_request_source CHECK (((source)::text = ANY (ARRAY[('frontend'::character varying)::text, ('backend'::character varying)::text]))),
    CONSTRAINT chk_http_request_status CHECK (((status_code IS NULL) OR ((status_code >= 100) AND (status_code <= 599))))
);


--
-- Name: http_request_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.http_request_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: http_request_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.http_request_events_id_seq OWNED BY public.http_request_events.id;


--
-- Name: links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    linktree_id uuid NOT NULL,
    business_id uuid NOT NULL,
    platform character varying(60) NOT NULL,
    url text NOT NULL,
    display_name character varying(255),
    description text,
    default_message text,
    display_order smallint DEFAULT 0 NOT NULL,
    original_input text,
    country_code character varying(10),
    gps_lat double precision,
    gps_lng double precision,
    custom_color character varying(50),
    custom_icon character varying(2048),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT links_display_order_check CHECK ((display_order >= 0)),
    CONSTRAINT links_platform_check CHECK ((char_length((platform)::text) > 0)),
    CONSTRAINT links_url_check CHECK (((char_length(url) > 0) AND (url ~ '^https?://|^tel:|^mailto:|^viber://'::text)))
);


--
-- Name: linktrees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linktrees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    subtitle text,
    description text,
    seo_name character varying(255) NOT NULL,
    uid character varying(50) NOT NULL,
    image text,
    background_color character varying(50) DEFAULT '#000000'::character varying NOT NULL,
    footer_text text,
    footer_phone character varying(30),
    footer_hidden boolean DEFAULT false NOT NULL,
    template_key character varying(50) DEFAULT 'spectrum'::character varying NOT NULL,
    template_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    whatsapp_modal_enabled boolean DEFAULT false NOT NULL,
    status character varying(10) DEFAULT 'active'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_lt_name CHECK ((char_length((name)::text) >= 2)),
    CONSTRAINT chk_lt_seo_name CHECK (((char_length((seo_name)::text) >= 2) AND ((seo_name)::text ~ '^[a-z0-9-]+$'::text))),
    CONSTRAINT chk_lt_uid CHECK (((char_length((uid)::text) >= 2) AND ((uid)::text ~ '^[a-z0-9-]+$'::text))),
    CONSTRAINT linktrees_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


--
-- Name: permission_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    action character varying(160) NOT NULL,
    resource_type character varying(80),
    resource_id uuid,
    requested_changes jsonb DEFAULT '{}'::jsonb NOT NULL,
    encrypted_secret_payload bytea,
    status character varying(12) DEFAULT 'pending'::character varying NOT NULL,
    reason character varying(500),
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    rejection_reason character varying(500),
    policy_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT permission_approval_requests_action_check CHECK ((btrim((action)::text) <> ''::text)),
    CONSTRAINT permission_approval_requests_check CHECK (((((status)::text = 'pending'::text) AND (reviewed_at IS NULL) AND (reviewed_by IS NULL)) OR ((status)::text <> 'pending'::text))),
    CONSTRAINT permission_approval_requests_policy_snapshot_check CHECK ((jsonb_typeof(policy_snapshot) = 'object'::text)),
    CONSTRAINT permission_approval_requests_requested_changes_check CHECK ((jsonb_typeof(requested_changes) = 'object'::text)),
    CONSTRAINT permission_approval_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('canceled'::character varying)::text, ('expired'::character varying)::text])))
);


--
-- Name: platform_permission_denies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_permission_denies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_id uuid NOT NULL,
    business_id uuid,
    resource_type character varying(80),
    resource_id uuid,
    reason character varying(500) NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_permission_denies_conditions_check CHECK ((jsonb_typeof(conditions) = 'object'::text)),
    CONSTRAINT platform_permission_denies_reason_check CHECK ((length(btrim((reason)::text)) >= 3))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    filename character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_audit_events (
    id bigint NOT NULL,
    actor_type character varying(30) NOT NULL,
    actor_id uuid,
    actor_label character varying(200),
    business_id uuid,
    event_type character varying(100) NOT NULL,
    outcome character varying(20) NOT NULL,
    resource_type character varying(60),
    resource_id character varying(100),
    resource_label character varying(200),
    request_id character varying(100),
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_security_actor_type CHECK (((actor_type)::text = ANY (ARRAY[('anonymous'::character varying)::text, ('business'::character varying)::text, ('creator'::character varying)::text, ('platform-admin'::character varying)::text, ('multitree'::character varying)::text]))),
    CONSTRAINT chk_security_outcome CHECK (((outcome)::text = ANY (ARRAY[('success'::character varying)::text, ('failure'::character varying)::text, ('denied'::character varying)::text])))
);


--
-- Name: security_audit_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_audit_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_audit_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_audit_events_id_seq OWNED BY public.security_audit_events.id;


--
-- Name: platform_admin_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_admin_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform_admin_id uuid NOT NULL,
    session_token text NOT NULL,
    session_expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    remembered boolean DEFAULT false NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    name character varying(150) DEFAULT 'MultiTree'::character varying NOT NULL,
    email character varying(254),
    phone character varying(32),
    logo text DEFAULT '/images/Logo.jpg'::text,
    avatar text DEFAULT '/images/DefaultAvatar.png'::text,
    favicon text DEFAULT '/favicon.ico'::text,
    accent_color character varying(100) DEFAULT '#b6f20d'::character varying NOT NULL,
    accent_ink_color character varying(7) DEFAULT '#111827'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: template_global_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_global_settings (
    template_key character varying(50) NOT NULL,
    widget_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    linktree_id uuid NOT NULL,
    question_text text NOT NULL,
    message text NOT NULL,
    display_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_questions_display_order_check CHECK ((display_order >= 0))
);


--
-- Name: http_request_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_events ALTER COLUMN id SET DEFAULT nextval('public.http_request_events_id_seq'::regclass);


--
-- Name: security_audit_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_events ALTER COLUMN id SET DEFAULT nextval('public.security_audit_events_id_seq'::regclass);

