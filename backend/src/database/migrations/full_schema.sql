--
-- PostgreSQL database dump
--
-- The single source of truth for the schema. Every incremental migration has
-- been folded back into the statements below, so this file alone builds a
-- complete database and there is nothing to apply after it.
--
-- This repository intentionally uses a single-baseline model. `db-migrate`
-- creates a fresh database from this file or verifies that an existing
-- database already matches it; it does not replay dated forward migrations.
-- Use `db-reset` only for disposable databases because it drops and recreates
-- the entire configured database before applying this file.
--
-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: fn_assign_default_subscription(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_assign_default_subscription() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  default_subscription_plan_id UUID;
  default_permission_profile_id UUID;
  default_configuration_id UUID;
  default_trial_days SMALLINT;
BEGIN
  SELECT
    subscription_plan.id,
    subscription_plan.permission_profile_id,
    subscription_plan.trial_days
  INTO
    default_subscription_plan_id,
    default_permission_profile_id,
    default_trial_days
  FROM billing_subscription_plans subscription_plan
  WHERE subscription_plan.is_default = TRUE
    AND subscription_plan.status = 'active'
  LIMIT 1;

  SELECT configuration.id
  INTO default_configuration_id
  FROM billing_plan_configurations configuration
  WHERE configuration.plan_id = default_permission_profile_id
  LIMIT 1;

  IF default_subscription_plan_id IS NOT NULL
     AND default_permission_profile_id IS NOT NULL
     AND default_configuration_id IS NOT NULL THEN
    INSERT INTO business_subscriptions
      (business_id, subscription_plan_id, plan_id, plan_configuration_id,
       status, billing_cycle, current_period_end)
    VALUES
      (NEW.id, default_subscription_plan_id, default_permission_profile_id,
       default_configuration_id,
       CASE WHEN default_trial_days > 0 THEN 'trialing' ELSE 'active' END,
       CASE WHEN default_trial_days > 0 THEN 'free' ELSE 'monthly' END,
       CASE
         WHEN default_trial_days > 0
           THEN NOW() + make_interval(days => default_trial_days)
         ELSE NULL
       END)
    ON CONFLICT (business_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_reject_billing_policy_audit_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_reject_billing_policy_audit_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'billing policy audit events are immutable';
END;
$$;


--
-- Name: fn_reorder_links_after_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_reorder_links_after_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE links
  SET display_order = display_order - 1
  WHERE linktree_id = OLD.linktree_id
    AND display_order > OLD.display_order;
  RETURN OLD;
END;
$$;


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: get_next_display_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_display_order(p_linktree_id uuid) RETURNS smallint
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN (SELECT COALESCE(MAX(display_order), -1) + 1
          FROM links WHERE linktree_id = p_linktree_id);
END;
$$;


--
-- Name: reorder_links(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reorder_links(p_linktree_id uuid, p_link_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  lid UUID;
  i   SMALLINT := 0;
BEGIN
  FOREACH lid IN ARRAY p_link_ids LOOP
    UPDATE links SET display_order = i
    WHERE id = lid AND linktree_id = p_linktree_id;
    i := i + 1;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

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
    logo text DEFAULT '/images/Logo.jpg'::text NOT NULL,
    favicon text DEFAULT '/favicon.ico'::text NOT NULL,
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
    template_key character varying(50) DEFAULT 'colorful-pills'::character varying NOT NULL,
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
    password_hash text,
    name character varying(150) NOT NULL,
    email character varying(255),
    phone character varying(30) NOT NULL,
    subdomain character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    plan character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    max_linktrees smallint DEFAULT 5 NOT NULL,
    last_login_at timestamp with time zone,
    last_login_ip inet,
    password_changed_at timestamp with time zone,
    onboarding_step smallint DEFAULT 1 NOT NULL,
    onboarding_version character varying(20) DEFAULT '2026-08'::character varying NOT NULL,
    onboarding_completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT businesses_max_linktrees_check CHECK ((max_linktrees > 0)),
    CONSTRAINT businesses_onboarding_step_check CHECK (((onboarding_step >= 1) AND (onboarding_step <= 3))),
    CONSTRAINT businesses_phone_check CHECK ((btrim((phone)::text) <> ''::text)),
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
    CONSTRAINT chk_http_request_actor CHECK (((actor_type)::text = ANY (ARRAY[('anonymous'::character varying)::text, ('business'::character varying)::text, ('platform-admin'::character varying)::text, ('multitree'::character varying)::text]))),
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
    template_key character varying(50) DEFAULT 'colorful-pills'::character varying NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.schema_migrations (
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
    CONSTRAINT chk_security_actor_type CHECK (((actor_type)::text = ANY (ARRAY[('anonymous'::character varying)::text, ('business'::character varying)::text, ('platform-admin'::character varying)::text, ('multitree'::character varying)::text]))),
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
    password_hash text,
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


--
-- Data for Name: access_rules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('26fc6418-e097-4a56-9659-5236952c5a45', 'deny', 'multitree', '192.0.2.0/24', NULL, NULL, 'Simulated malicious web scraper network (TEST-NET-1)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('fab41f72-eaa9-4b4e-a041-ae58dc14624b', 'deny', 'multitree', '198.51.100.0/24', NULL, NULL, 'Simulated comment spam botnet segment (TEST-NET-2)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('4eb09659-a0e9-4617-99b4-6dc245f46184', 'deny', 'multitree', '203.0.113.42/32', NULL, NULL, 'Simulated brute-force attack source (TEST-NET-3)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('e55c05d9-3e6c-4119-9a5d-0e2c640d75d6', 'allow', 'multitree', '127.0.0.1/32', NULL, NULL, 'Whitelist localhost loopback address for development testing', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');
INSERT INTO public.access_rules (id, effect, scope, ip_network, business_id, linktree_id, reason, status, expires_at, match_count, last_matched_at, created_by, created_at, updated_at) VALUES ('e86a9887-4e27-47cd-a783-79ef1705ba16', 'allow', 'multitree', '192.0.2.100/32', NULL, NULL, 'Developer proxy office IP (TEST-NET-1)', 'active', NULL, 0, NULL, NULL, '2026-07-16 21:31:41.917504+03', '2026-07-16 21:31:41.917504+03');


--
-- Data for Name: auth_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'business:pages:linktrees-access', 'business.pages', 'linktrees-access', 'Open the linktrees page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 11, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'business:pages:templates-access', 'business.pages', 'templates-access', 'Open the templates page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 12, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5ba6c5f9-12af-4573-9db6-990a74943aa0', 'business:pages:profile-access', 'business.pages', 'profile-access', 'Open the business profile page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 13, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'business:pages:settings-access', 'business.pages', 'settings-access', 'Open the business settings page', 'standard', '2026-07-16 22:06:14.312012+03', 'Business navigation', 14, '{}', false, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('b5e9d58c-3c70-4f0a-9684-2ee2f20efc41', 'business:pages:mini-websites-access', 'business.pages', 'mini-websites-access', 'Open and manage the mini websites page', 'standard', '2026-07-27 00:00:00+03', 'Business navigation', 19, '{}', false, 'active', '2026-07-27 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f11', 'business:pages:advertising-access', 'business.pages', 'advertising-access', 'Open the advertising page', 'standard', '2026-08-05 00:00:00+03', 'Business navigation', 20, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f12', 'business:advertising:read', 'business.advertising', 'read', 'View the advertising service page', 'standard', '2026-08-05 00:00:00+03', 'Advertising', 246, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f13', 'business:advertising:update', 'business.advertising', 'update', 'Edit the advertising service page', 'sensitive', '2026-08-05 00:00:00+03', 'Advertising', 247, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f14', 'business:advertising:publish', 'business.advertising', 'publish', 'Publish or unpublish the advertising service page', 'sensitive', '2026-08-05 00:00:00+03', 'Advertising', 248, '{}', false, 'active', '2026-08-05 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'business:security:username-update', 'business.security', 'username-update', 'Change the business owner username', 'sensitive', '2026-07-16 22:06:14.312012+03', 'Business account', 75, '{"username": "Username"}', true, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('dc4467b8-45d0-4672-a1ae-962670c4ea10', 'business:profile:update', 'business.profile', 'update', 'business profile update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Profile', 30, '{"logo": "Business logo", "name": "Business name", "phone": "Phone number", "favicon": "Browser favicon", "username": "Username", "website_color": "Website color", "default_avatar": "Default page avatar"}', true, 'active', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('4e81f943-2177-43eb-ae9b-93359ea72b1a', 'business:dashboard:view', 'business.dashboard', 'view', 'business dashboard view', 'standard', '2026-07-16 21:31:41.92101+03', 'Dashboard', 10, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('4545c9eb-2fd0-441b-937e-21f1dea9bf51', 'business:profile:read', 'business.profile', 'read', 'View the business profile', 'standard', '2026-07-16 21:31:41.849762+03', 'Profile', 20, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('2862c342-354e-4589-89ca-705720f8e082', 'business:profile-assets:upload', 'business.profile-assets', 'upload', 'business profile-assets upload', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Profile Assets', 40, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('58bbca30-f652-42e2-857d-3f5082e87bb9', 'business:defaults:read', 'business.defaults', 'read', 'business defaults read', 'standard', '2026-07-16 21:31:41.92101+03', 'Defaults', 50, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('3b044300-e0cc-45d3-8ff8-9db06386a794', 'business:defaults:update', 'business.defaults', 'update', 'business defaults update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Defaults', 60, '{"default_template": "Default template", "default_footer_text": "Default footer text", "default_footer_phone": "Default footer phone", "default_footer_hidden": "Hide footer by default", "default_background_color": "Default background color", "default_whatsapp_enabled": "Enable WhatsApp by default"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('84484813-6b91-4fa1-8f25-e579cc221d6c', 'business:security:email-update', 'business.security', 'email-update', 'business security email-update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Security', 70, '{"email": "Email address"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a95b87eb-6585-45b8-9faf-2ca2c2505952', 'business:security:password-change', 'business.security', 'password-change', 'business security password-change', 'critical', '2026-07-16 21:31:41.92101+03', 'Security', 80, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('94bc7644-adfe-4eca-a9b0-094885900e30', 'business:templates:browse', 'business.templates', 'browse', 'business templates browse', 'standard', '2026-07-16 21:31:41.92101+03', 'Templates', 90, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'business:templates:use', 'business.templates', 'use', 'business templates use', 'standard', '2026-07-16 21:31:41.92101+03', 'Templates', 100, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'business:templates:set-default', 'business.templates', 'set-default', 'business templates set-default', 'standard', '2026-07-16 21:31:41.92101+03', 'Templates', 110, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'business:tiktok:read', 'business.tiktok', 'read', 'business tiktok read', 'standard', '2026-07-16 21:31:41.92101+03', 'Tiktok', 120, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'business:tiktok:create', 'business.tiktok', 'create', 'business tiktok create', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Tiktok', 130, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'business:tiktok:update', 'business.tiktok', 'update', 'business tiktok update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Tiktok', 140, '{"status": "Status", "pixel_id": "Pixel ID", "events_token": "Events API token", "display_order": "Display order"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5649b298-7825-4c82-aeb7-efb5f82111ba', 'business:tiktok:delete', 'business.tiktok', 'delete', 'business tiktok delete', 'critical', '2026-07-16 21:31:41.92101+03', 'Tiktok', 150, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('e9bd236d-89c8-4984-9cab-b8a1c25a778c', 'business:tiktok:secret-read', 'business.tiktok', 'secret-read', 'business tiktok secret-read', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Tiktok', 160, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('c38a2902-fbc2-45fe-954d-891966da9bb9', 'business:linktrees:read', 'business.linktrees', 'read', 'View linktrees and links', 'standard', '2026-07-16 21:31:41.849762+03', 'Linktrees', 170, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('35912012-f370-4553-bdcb-f58c2222aa90', 'business:linktrees:create', 'business.linktrees', 'create', 'business linktrees create', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Linktrees', 180, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('ef30a5a5-0216-434e-88c1-99083dc99ffe', 'business:linktrees:update', 'business.linktrees', 'update', 'business linktrees update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Linktrees', 190, '{"name": "Page name", "image": "Page image", "seo_name": "SEO name", "subtitle": "Page subtitle", "footer_text": "Footer text", "footer_phone": "Footer phone", "footer_hidden": "Footer visibility", "whatsapp_modal": "WhatsApp modal", "template_config": "Template configuration", "background_color": "Background color"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('d0c0394f-0980-4bf7-9037-df7da7f7ac91', 'business:linktrees:delete', 'business.linktrees', 'delete', 'business linktrees delete', 'critical', '2026-07-16 21:31:41.92101+03', 'Linktrees', 200, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'business:linktrees:upload', 'business.linktrees', 'upload', 'business linktrees upload', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Linktrees', 210, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('7a4e7b86-6d89-4ef6-982f-9f6c05a58f24', 'business:mini-websites:create', 'business.mini-websites', 'create', 'Create mini websites', 'sensitive', '2026-08-01 00:00:00+03', 'Mini websites', 245, '{}', false, 'active', '2026-08-01 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5996eafa-998d-406f-979c-d8bdbf2630cf', 'business:links:read', 'business.links', 'read', 'business links read', 'standard', '2026-07-16 21:31:41.92101+03', 'Links', 220, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'business:links:create', 'business.links', 'create', 'business links create', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 230, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('e071be85-e7ed-4011-ad4b-cef02a24c961', 'business:links:update', 'business.links', 'update', 'business links update', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 240, '{"url": "URL", "metadata": "Link metadata", "platform": "Platform", "description": "Description", "display_name": "Display name", "display_order": "Display order", "default_message": "Default message"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'business:links:delete', 'business.links', 'delete', 'business links delete', 'critical', '2026-07-16 21:31:41.92101+03', 'Links', 250, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('23a31232-63cc-4be1-843e-50f11f822cca', 'business:links:sync', 'business.links', 'sync', 'business links sync', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 260, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('9def0e86-8469-494d-a5f8-1f5270aa42b1', 'business:links:reorder', 'business.links', 'reorder', 'business links reorder', 'sensitive', '2026-07-16 21:31:41.92101+03', 'Links', 270, '{"display_order": "Display order"}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('f65e5c47-08f4-43ec-807a-803136ee5665', 'business:analytics:totals-read', 'business.analytics', 'totals-read', 'business analytics totals-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 280, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'business:analytics:details-read', 'business.analytics', 'details-read', 'business analytics details-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 290, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('1e1826ef-4180-47e8-8a56-b7c79d20c354', 'business:analytics:tiktok-health-read', 'business.analytics', 'tiktok-health-read', 'View TikTok delivery diagnostics and retry failed events', 'standard', '2026-07-27 00:00:00+03', 'Analytics', 362, '{}', false, 'active', '2026-07-27 00:00:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('3b9d857f-e21e-4920-93ce-c42072db2a91', 'business:analytics:advanced-read', 'business.analytics', 'advanced-read', 'View the full advanced analytics page (cross-page breakdowns, funnel, retention, realtime, visitor lists)', 'standard', '2026-07-26 03:19:00+03', 'Analytics', 365, '{}', false, 'active', '2026-07-26 03:19:00+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('32246583-d06d-4e8a-b01a-4dddffd79e64', 'business:analytics:daily-read', 'business.analytics', 'daily-read', 'business analytics daily-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 300, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('a3308ee2-44f8-4794-842f-707f8f5a7bfc', 'business:analytics:range-read', 'business.analytics', 'range-read', 'business analytics range-read', 'standard', '2026-07-16 21:31:41.92101+03', 'Analytics', 310, '{}', false, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('68c6ec50-aa2d-4865-bed5-205f62dd96ef', 'business:analytics:clear-linktree', 'business.analytics', 'clear-linktree', 'business analytics clear-linktree', 'critical', '2026-07-16 21:31:41.92101+03', 'Analytics', 320, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('d22f67a9-e32c-4cda-9b7e-56474492775d', 'business:analytics:clear-all', 'business.analytics', 'clear-all', 'business analytics clear-all', 'critical', '2026-07-16 21:31:41.92101+03', 'Analytics', 330, '{}', true, 'active', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('70310224-28d9-471b-8dd6-56484148fee9', 'business:settings:profile-access', 'business.settings', 'profile-access', 'Open the profile settings section', 'standard', '2026-07-16 22:07:32.055836+03', 'Business navigation', 15, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'business:settings:defaults-access', 'business.settings', 'defaults-access', 'Open the page defaults settings section', 'standard', '2026-07-16 22:07:32.055836+03', 'Business navigation', 16, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('ab2b6074-fe5d-44ba-9c80-b23277878c91', 'business:settings:security-access', 'business.settings', 'security-access', 'Open the account security settings section', 'standard', '2026-07-16 22:07:32.055836+03', 'Business navigation', 17, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.auth_permissions (id, permission_key, resource, action, description, risk_level, created_at, category, display_order, field_schema, supports_approval, status, updated_at) VALUES ('5c47877c-aa54-4988-a569-46149ef10803', 'business:settings:integrations-access', 'business.settings', 'integrations-access', 'Open the integrations settings section', 'sensitive', '2026-07-16 22:07:32.055836+03', 'Business navigation', 18, '{}', false, 'active', '2026-07-16 22:07:32.055836+03');


--
-- Data for Name: billing_entitlements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('abdda73e-7602-4a6e-8f83-20261d575821', 'feature.advanced_analytics', 'Advanced analytics', 'Advanced analytics and reporting', 'boolean', NULL, 'analytics', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('214c520c-3605-4507-aac9-323c2864a6cb', 'feature.api_access', 'API access', 'Allow business API clients', 'boolean', NULL, 'api', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('4d1778f5-0a66-45c5-8a29-519030bcbdfb', 'feature.webhooks', 'Webhooks', 'Allow outbound webhooks', 'boolean', NULL, 'api', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'feature.premium_templates', 'Premium templates', 'Allow premium visual templates', 'boolean', NULL, 'content', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('3b9f4737-a022-4af9-ba7b-e4ccb1805e6f', 'feature.pixel_tracking', 'Pixel tracking', 'Allow supported advertising pixels', 'boolean', NULL, 'analytics', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20', 'feature.advertising_page', 'Advertising page', 'Allow the TikTok sponsorship service page', 'boolean', NULL, 'content', 'active', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21', 'feature.mini_websites', 'Mini websites', 'Allow published mini website pages', 'boolean', NULL, 'content', 'active', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'feature.remove_branding', 'Remove branding', 'Allow platform branding removal', 'boolean', NULL, 'content', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('fd265354-836b-4561-bae9-fda950a08d64', 'limit.linktrees', 'Public page limit', 'Maximum active Linktrees and mini-websites', 'integer', 'pages', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-08-01 00:00:00+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('1fbcc8f4-3d50-4c5d-b35a-cca221b66421', 'limit.api_requests_monthly', 'Monthly API requests', 'Maximum API requests per billing period', 'integer', 'requests', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('44a0832d-86e8-4ab1-83a9-416b67d4ec33', 'limit.api_clients', 'API client limit', 'Maximum active API clients', 'integer', 'clients', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('5a1095de-55bd-4022-a2aa-5389df26ccc6', 'limit.webhook_endpoints', 'Webhook endpoint limit', 'Maximum active webhook endpoints', 'integer', 'endpoints', 'limits', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('bbcdffe3-bb86-4f9b-a28d-ec3da6af4a61', 'retention.audit_days', 'Audit retention', 'Number of days audit records remain available', 'integer', 'days', 'retention', 'active', '2026-07-16 21:31:41.878112+03', '2026-07-16 21:31:41.878112+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'feature.profile_editing', 'Profile editing', 'Allow business profile editing', 'boolean', NULL, 'profile', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('0a5ce780-b980-4621-a91d-d182d0059f76', 'feature.branding_editing', 'Branding editing', 'Allow business branding asset editing', 'boolean', NULL, 'profile', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('c5584929-d8fe-4123-bdf8-58ecc25181cf', 'feature.page_defaults', 'Page defaults', 'Allow business page default editing', 'boolean', NULL, 'content', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('5ec6420c-1935-4e30-819d-85eba440b0a7', 'feature.tiktok', 'TikTok integration', 'Allow TikTok pixels and Events API', 'boolean', NULL, 'integrations', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('696aa1a2-8815-43c2-b407-598bd53db63c', 'feature.analytics_clear', 'Analytics clearing', 'Allow destructive analytics clearing', 'boolean', NULL, 'analytics', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('11716c27-03ec-4e0c-93f3-d6b6932a8dcb', 'limit.tiktok_pixels', 'TikTok pixel limit', 'Maximum configured TikTok pixels', 'integer', 'pixels', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('c296078e-89aa-4a70-88be-28058132772a', 'limit.templates', 'Template limit', 'Maximum available templates', 'integer', 'templates', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('137c4e87-1c93-48d5-9f64-8632a15d15ee', 'limit.analytics_range_days', 'Analytics range limit', 'Maximum analytics query range', 'integer', 'days', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('91fd0234-e4c2-4eb1-8238-f53c391cfba0', 'limit.profile_changes_monthly', 'Monthly profile changes', 'Maximum profile mutations per month', 'integer', 'changes', 'limits', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');
INSERT INTO public.billing_entitlements (id, entitlement_key, name, description, value_type, unit, category, status, created_at, updated_at) VALUES ('76068746-ae98-4f3e-a356-4b3a208a6ab3', 'retention.analytics_days', 'Analytics retention', 'Analytics retention in days', 'integer', 'days', 'retention', 'active', '2026-07-16 21:31:41.92101+03', '2026-07-16 21:31:41.92101+03');


--
-- Data for Name: billing_plan_configurations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_configurations (id, plan_id, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '367d0046-7d0b-4d78-a8d0-5c6ff3697603', '2026-07-16 21:31:42.035711+03', '2026-07-16 21:31:42.063436+03');
INSERT INTO public.billing_plan_configurations (id, plan_id, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '58b3d358-35a8-42dc-8762-7179505f05d2', '2026-07-16 21:31:42.035711+03', '2026-07-16 21:31:42.063436+03');
INSERT INTO public.billing_plan_configurations (id, plan_id, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '45fe1328-6fb2-4b91-9c30-fd51c3861027', '2026-07-16 21:31:42.035711+03', '2026-07-16 21:31:42.063436+03');


--
-- Data for Name: billing_plan_entitlements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '0a5ce780-b980-4621-a91d-d182d0059f76', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'c5584929-d8fe-4123-bdf8-58ecc25181cf', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5ec6420c-1935-4e30-819d-85eba440b0a7', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'abdda73e-7602-4a6e-8f83-20261d575821', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '696aa1a2-8815-43c2-b407-598bd53db63c', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'fd265354-836b-4561-bae9-fda950a08d64', '-1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '11716c27-03ec-4e0c-93f3-d6b6932a8dcb', '3', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'c296078e-89aa-4a70-88be-28058132772a', '12', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '137c4e87-1c93-48d5-9f64-8632a15d15ee', '-1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '91fd0234-e4c2-4eb1-8238-f53c391cfba0', '3', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '76068746-ae98-4f3e-a356-4b3a208a6ab3', '-1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '0a5ce780-b980-4621-a91d-d182d0059f76', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'c5584929-d8fe-4123-bdf8-58ecc25181cf', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5ec6420c-1935-4e30-819d-85eba440b0a7', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'abdda73e-7602-4a6e-8f83-20261d575821', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '696aa1a2-8815-43c2-b407-598bd53db63c', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'fd265354-836b-4561-bae9-fda950a08d64', '20', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '11716c27-03ec-4e0c-93f3-d6b6932a8dcb', '2', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'c296078e-89aa-4a70-88be-28058132772a', '11', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '137c4e87-1c93-48d5-9f64-8632a15d15ee', '365', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '91fd0234-e4c2-4eb1-8238-f53c391cfba0', '0', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '76068746-ae98-4f3e-a356-4b3a208a6ab3', '365', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'a4da5bc4-110c-4fc9-b804-fe743ea6f372', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '0a5ce780-b980-4621-a91d-d182d0059f76', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'c5584929-d8fe-4123-bdf8-58ecc25181cf', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5ec6420c-1935-4e30-819d-85eba440b0a7', 'true', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'abdda73e-7602-4a6e-8f83-20261d575821', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '696aa1a2-8815-43c2-b407-598bd53db63c', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '53dfb3bf-cfc9-4189-9c7c-879fca9db420', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'bf2db4ff-f256-4fe8-9b8b-891b5feac367', 'false', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'fd265354-836b-4561-bae9-fda950a08d64', '5', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '11716c27-03ec-4e0c-93f3-d6b6932a8dcb', '1', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'c296078e-89aa-4a70-88be-28058132772a', '7', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '137c4e87-1c93-48d5-9f64-8632a15d15ee', '30', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '91fd0234-e4c2-4eb1-8238-f53c391cfba0', '0', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_entitlements (plan_configuration_id, entitlement_id, value, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '76068746-ae98-4f3e-a356-4b3a208a6ab3', '30', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_plan_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '70310224-28d9-471b-8dd6-56484148fee9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'ab2b6074-fe5d-44ba-9c80-b23277878c91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'ab2b6074-fe5d-44ba-9c80-b23277878c91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '127a91d9-093b-4e93-b0fa-d6d78f3e223a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'ab2b6074-fe5d-44ba-9c80-b23277878c91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5c47877c-aa54-4988-a569-46149ef10803', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5c47877c-aa54-4988-a569-46149ef10803', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:07:32.055836+03', '2026-07-16 22:07:32.055836+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '4e81f943-2177-43eb-ae9b-93359ea72b1a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5ba6c5f9-12af-4573-9db6-990a74943aa0', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '58bbca30-f652-42e2-857d-3f5082e87bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '3b044300-e0cc-45d3-8ff8-9db06386a794', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '84484813-6b91-4fa1-8f25-e579cc221d6c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'a95b87eb-6585-45b8-9faf-2ca2c2505952', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '94bc7644-adfe-4eca-a9b0-094885900e30', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'c38a2902-fbc2-45fe-954d-891966da9bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '35912012-f370-4553-bdcb-f58c2222aa90', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'ef30a5a5-0216-434e-88c1-99083dc99ffe', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'd0c0394f-0980-4bf7-9037-df7da7f7ac91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5996eafa-998d-406f-979c-d8bdbf2630cf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'e071be85-e7ed-4011-ad4b-cef02a24c961', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '23a31232-63cc-4be1-843e-50f11f822cca', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '9def0e86-8469-494d-a5f8-1f5270aa42b1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'f65e5c47-08f4-43ec-807a-803136ee5665', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-26 03:19:00+03', '2026-07-26 03:19:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '4e81f943-2177-43eb-ae9b-93359ea72b1a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5ba6c5f9-12af-4573-9db6-990a74943aa0', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '58bbca30-f652-42e2-857d-3f5082e87bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '3b044300-e0cc-45d3-8ff8-9db06386a794', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '84484813-6b91-4fa1-8f25-e579cc221d6c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'a95b87eb-6585-45b8-9faf-2ca2c2505952', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '94bc7644-adfe-4eca-a9b0-094885900e30', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'c38a2902-fbc2-45fe-954d-891966da9bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '35912012-f370-4553-bdcb-f58c2222aa90', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'ef30a5a5-0216-434e-88c1-99083dc99ffe', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'd0c0394f-0980-4bf7-9037-df7da7f7ac91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5996eafa-998d-406f-979c-d8bdbf2630cf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'e071be85-e7ed-4011-ad4b-cef02a24c961', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '23a31232-63cc-4be1-843e-50f11f822cca', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '9def0e86-8469-494d-a5f8-1f5270aa42b1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'f65e5c47-08f4-43ec-807a-803136ee5665', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-26 03:19:00+03', '2026-07-26 03:19:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '5649b298-7825-4c82-aeb7-efb5f82111ba', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', '5649b298-7825-4c82-aeb7-efb5f82111ba', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', '32246583-d06d-4e8a-b01a-4dddffd79e64', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'a3308ee2-44f8-4794-842f-707f8f5a7bfc', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '4da8ea76-7679-4d7b-9dcf-dc71dae83575', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'db78a685-cb71-40ad-b2d9-4ca6b2de62e4', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5ba6c5f9-12af-4573-9db6-990a74943aa0', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '071506c7-4c6d-46e2-bb8a-12ef55ae5ea6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '6e795805-5513-4c2b-a29a-ea50d3d9bcbf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'dc4467b8-45d0-4672-a1ae-962670c4ea10', 'approval', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '4e81f943-2177-43eb-ae9b-93359ea72b1a', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '4545c9eb-2fd0-441b-937e-21f1dea9bf51', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '2862c342-354e-4589-89ca-705720f8e082', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '58bbca30-f652-42e2-857d-3f5082e87bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '3b044300-e0cc-45d3-8ff8-9db06386a794', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '84484813-6b91-4fa1-8f25-e579cc221d6c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'a95b87eb-6585-45b8-9faf-2ca2c2505952', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '94bc7644-adfe-4eca-a9b0-094885900e30', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'ebea69bb-5bc5-454a-b9be-0c430e720e7d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5a726536-4ae9-44d8-9451-b2b8a7d2b39f', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'eeebdd59-e782-4fcc-92c1-a53dd1c9a1f7', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '0fc5f2d5-7251-4e74-8bb8-a0e3e9d05b4e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'da2a9e74-3f92-4d23-856d-90f54ce0b97e', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5649b298-7825-4c82-aeb7-efb5f82111ba', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'e9bd236d-89c8-4984-9cab-b8a1c25a778c', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '1e1826ef-4180-47e8-8a56-b7c79d20c354', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-27 00:00:00+03', '2026-07-27 00:00:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'c38a2902-fbc2-45fe-954d-891966da9bb9', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '35912012-f370-4553-bdcb-f58c2222aa90', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'ef30a5a5-0216-434e-88c1-99083dc99ffe', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'd0c0394f-0980-4bf7-9037-df7da7f7ac91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '0bb2906e-a3c0-4c47-bea2-79e82a397dc6', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '5996eafa-998d-406f-979c-d8bdbf2630cf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '3ecb431e-1761-4ace-99f7-3aa0256c5edd', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'e071be85-e7ed-4011-ad4b-cef02a24c961', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '2cb3f841-e16b-49d9-bf30-68ba1fbabce1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '23a31232-63cc-4be1-843e-50f11f822cca', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '9def0e86-8469-494d-a5f8-1f5270aa42b1', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'f65e5c47-08f4-43ec-807a-803136ee5665', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '3b9d857f-e21e-4920-93ce-c42072db2a91', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-26 03:19:00+03', '2026-07-26 03:19:00+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'dad8f57c-2fbb-4e55-86d2-e2dd687f00bf', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '32246583-d06d-4e8a-b01a-4dddffd79e64', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'a3308ee2-44f8-4794-842f-707f8f5a7bfc', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', '68c6ec50-aa2d-4865-bed5-205f62dd96ef', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_permissions (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'd22f67a9-e32c-4cda-9b7e-56474492775d', 'direct', '{}', '{"type": "all"}', '{}', '2026-07-16 22:06:14.312012+03', '2026-07-16 22:06:14.312012+03');

-- Mini-website creation retains each plan's existing Linktree-create policy.
INSERT INTO public.billing_plan_permissions
  (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at)
SELECT rule.plan_configuration_id,
       '7a4e7b86-6d89-4ef6-982f-9f6c05a58f24'::uuid,
       rule.access_mode, rule.field_modes, rule.resource_scope,
       rule.conditions, '2026-08-01 00:00:00+03', '2026-08-01 00:00:00+03'
FROM public.billing_plan_permissions rule
WHERE rule.permission_id = '35912012-f370-4553-bdcb-f58c2222aa90';

-- The advertising page follows each plan's existing mini-website policy: a plan
-- that can open and manage mini websites can open and manage this page too.
-- Written set-based rather than as fixed pairs so it stays correct if the plan
-- configurations above are edited.
INSERT INTO public.billing_plan_permissions
  (plan_configuration_id, permission_id, access_mode, field_modes, resource_scope, conditions, created_at, updated_at)
SELECT rule.plan_configuration_id,
       granted.permission_id,
       rule.access_mode, rule.field_modes, rule.resource_scope,
       rule.conditions, '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_permissions rule
CROSS JOIN (VALUES
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f11'::uuid),
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f12'::uuid),
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f13'::uuid),
  ('a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f14'::uuid)
) AS granted(permission_id)
WHERE rule.permission_id = 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41';

-- Mini websites are an Ultra feature, but until now that was expressed only as
-- a dashboard permission, so a downgraded business kept its /bio pages online
-- with no way to edit or remove them. This entitlement is what the public read
-- checks; it is granted to exactly the plans that can manage mini websites.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT rule.plan_configuration_id,
       'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21'::uuid,
       'true', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_permissions rule
WHERE rule.permission_id = 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41';

-- Plans without it record an explicit false rather than a missing row, so the
-- billing screens show the feature as withheld instead of unknown.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT cfg.id, 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21'::uuid,
       'false', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_configurations cfg
WHERE NOT EXISTS (
  SELECT 1 FROM public.billing_plan_entitlements existing
   WHERE existing.plan_configuration_id = cfg.id
     AND existing.entitlement_id = 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f21'::uuid
);

-- The entitlement the three advertising permissions require, granted to the
-- same plans, so a plan that carries the permissions can actually use them.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT rule.plan_configuration_id,
       'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20'::uuid,
       'true', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_permissions rule
WHERE rule.permission_id = 'b5e9d58c-3c70-4f0a-9684-2ee2f20efc41';

-- Plans without it record an explicit false rather than a missing row, so the
-- billing screens show the feature as withheld instead of unknown — the same
-- treatment feature.mini_websites gets above.
INSERT INTO public.billing_plan_entitlements
  (plan_configuration_id, entitlement_id, value, created_at, updated_at)
SELECT cfg.id, 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20'::uuid,
       'false', '2026-08-05 00:00:00+03', '2026-08-05 00:00:00+03'
FROM public.billing_plan_configurations cfg
WHERE NOT EXISTS (
  SELECT 1 FROM public.billing_plan_entitlements existing
   WHERE existing.plan_configuration_id = cfg.id
     AND existing.entitlement_id = 'a1d4e7c0-1b2f-4a63-9c81-5e0a7d3b4f20'::uuid
);


--
-- Data for Name: billing_plan_templates; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'colorful-pills', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'mobile-spotlight', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'frosted-outline', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'aurora-pills', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'gentle-flow', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'hero-image', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('3d7529e1-9c5e-4d75-bfc4-ab6553d5c0bd', 'dark-card', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'colorful-pills', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'mobile-spotlight', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'frosted-outline', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'aurora-pills', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'gentle-flow', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('9996df1b-cb4f-47e2-8b9c-e8105a1adf6c', 'hero-image', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'colorful-pills', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plan_templates (plan_configuration_id, template_key, created_at) VALUES ('80e77fb4-e4c2-428c-bfd0-1183a88371ce', 'mobile-spotlight', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plans (id, code, name, description, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('45fe1328-6fb2-4b91-9c30-fd51c3861027', 'ultra', 'Ultra', 'Complete business access', 'active', 'USD', 0, 30000, 0, 30, false, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plans (id, code, name, description, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('367d0046-7d0b-4d78-a8d0-5c6ff3697603', 'pro', 'Pro', 'Advanced analytics management access', 'active', 'USD', 0, 20000, 0, 20, false, NULL, '2026-07-16 21:31:42.035711+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_plans (id, code, name, description, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('58b3d358-35a8-42dc-8762-7179505f05d2', 'basic', 'Basic', 'Essential business access', 'active', 'USD', 0, 15000, 0, 10, true, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_policy_audit_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: billing_subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_subscription_plans (id, code, name, description, permission_profile_id, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('9e00fefd-0eba-4d41-bebd-41091e1bbb98', 'ultra', 'Ultra', 'Complete business access', '45fe1328-6fb2-4b91-9c30-fd51c3861027', 'active', 'USD', 0, 30000, 0, 30, false, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_subscription_plans (id, code, name, description, permission_profile_id, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('386ad055-892f-4055-a011-cfa5767148b8', 'pro', 'Pro', 'Advanced analytics management access', '367d0046-7d0b-4d78-a8d0-5c6ff3697603', 'active', 'USD', 0, 20000, 0, 20, false, NULL, '2026-07-16 21:31:42.035711+03', '2026-07-16 22:06:14.312012+03');
INSERT INTO public.billing_subscription_plans (id, code, name, description, permission_profile_id, status, currency, monthly_price_minor, yearly_price_minor, trial_days, display_order, is_default, created_by, created_at, updated_at) VALUES ('e653f412-d965-4c8d-9ba5-aff6eaf70523', 'basic', 'Basic', 'Essential business access', '58b3d358-35a8-42dc-8762-7179505f05d2', 'active', 'USD', 0, 15000, 0, 10, true, NULL, '2026-07-16 21:31:41.878112+03', '2026-07-16 22:06:14.312012+03');


--
-- Data for Name: billing_usage_counters; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_branding; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_defaults; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_profile_change_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: business_tiktok_pixels; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: http_request_event_daily_stats; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: http_request_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: links; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: linktrees; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: permission_approval_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_permission_denies; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: security_audit_events; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_admin_sessions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_admins; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: template_global_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: whatsapp_questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: http_request_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.http_request_events_id_seq', 1, false);


--
-- Name: security_audit_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.security_audit_events_id_seq', 1, false);


--
-- Name: access_rules access_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_pkey PRIMARY KEY (id);


--
-- Name: auth_permissions auth_permissions_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_permission_key_key UNIQUE (permission_key);


--
-- Name: auth_permissions auth_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_pkey PRIMARY KEY (id);


--
-- Name: billing_entitlements billing_entitlements_entitlement_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entitlements
    ADD CONSTRAINT billing_entitlements_entitlement_key_key UNIQUE (entitlement_key);


--
-- Name: billing_entitlements billing_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entitlements
    ADD CONSTRAINT billing_entitlements_pkey PRIMARY KEY (id);


--
-- Name: billing_plan_configurations billing_plan_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_configurations
    ADD CONSTRAINT billing_plan_configurations_pkey PRIMARY KEY (id);


--
-- Name: billing_plan_entitlements billing_plan_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_entitlements
    ADD CONSTRAINT billing_plan_entitlements_pkey PRIMARY KEY (plan_configuration_id, entitlement_id);


--
-- Name: billing_plan_permissions billing_plan_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_permissions
    ADD CONSTRAINT billing_plan_permissions_pkey PRIMARY KEY (plan_configuration_id, permission_id);


--
-- Name: billing_plan_templates billing_plan_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_templates
    ADD CONSTRAINT billing_plan_templates_pkey PRIMARY KEY (plan_configuration_id, template_key);


--
-- Name: billing_plans billing_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans
    ADD CONSTRAINT billing_plans_code_key UNIQUE (code);


--
-- Name: billing_plans billing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans
    ADD CONSTRAINT billing_plans_pkey PRIMARY KEY (id);


--
-- Name: billing_policy_audit_events billing_policy_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_pkey PRIMARY KEY (id);


--
-- Name: billing_subscription_plans billing_subscription_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_subscription_plans
    ADD CONSTRAINT billing_subscription_plans_code_key UNIQUE (code);


--
-- Name: billing_subscription_plans billing_subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_subscription_plans
    ADD CONSTRAINT billing_subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: billing_usage_counters billing_usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_usage_counters
    ADD CONSTRAINT billing_usage_counters_pkey PRIMARY KEY (business_id, entitlement_key, period_start);


--
-- Name: business_branding business_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_branding
    ADD CONSTRAINT business_branding_pkey PRIMARY KEY (business_id);


--
-- Name: business_defaults business_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_defaults
    ADD CONSTRAINT business_defaults_pkey PRIMARY KEY (business_id);


--
-- Name: business_profile_change_requests business_profile_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile_change_requests
    ADD CONSTRAINT business_profile_change_requests_pkey PRIMARY KEY (business_id);


--
-- Name: business_sessions business_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_pkey PRIMARY KEY (id);


--
-- Name: business_sessions business_sessions_session_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_session_token_hash_key UNIQUE (session_token_hash);


--
-- Name: business_subscriptions business_subscriptions_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_business_id_key UNIQUE (business_id);


--
-- Name: business_subscriptions business_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: business_tiktok_pixels business_tiktok_pixels_business_id_pixel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_tiktok_pixels
    ADD CONSTRAINT business_tiktok_pixels_business_id_pixel_id_key UNIQUE (business_id, pixel_id);


--
-- Name: business_tiktok_pixels business_tiktok_pixels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_tiktok_pixels
    ADD CONSTRAINT business_tiktok_pixels_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_subdomain_key UNIQUE (subdomain);


--
-- Name: businesses businesses_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_username_key UNIQUE (username);


--
-- Name: http_request_event_daily_stats http_request_event_daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_event_daily_stats
    ADD CONSTRAINT http_request_event_daily_stats_pkey PRIMARY KEY (event_day, source, method, actor_type, outcome);


--
-- Name: http_request_events http_request_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_events
    ADD CONSTRAINT http_request_events_pkey PRIMARY KEY (id);


--
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- Name: linktrees linktrees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT linktrees_pkey PRIMARY KEY (id);


--
-- Name: permission_approval_requests permission_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_approval_requests
    ADD CONSTRAINT permission_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: platform_permission_denies platform_permission_denies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_permission_denies
    ADD CONSTRAINT platform_permission_denies_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conrelid = 'public.schema_migrations'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE ONLY public.schema_migrations
            ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);
    END IF;
END
$$;


--
-- Name: security_audit_events security_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_events
    ADD CONSTRAINT security_audit_events_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_sessions platform_admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: platform_admin_sessions platform_admin_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_session_token_key UNIQUE (session_token);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_username_key UNIQUE (username);


--
-- Name: template_global_settings template_global_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_global_settings
    ADD CONSTRAINT template_global_settings_pkey PRIMARY KEY (template_key);


--
-- Name: links uq_links_id_linktree_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT uq_links_id_linktree_business UNIQUE (id, linktree_id, business_id);


--
-- Name: linktrees uq_linktrees_id_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT uq_linktrees_id_business UNIQUE (id, business_id);


--
-- Name: linktrees uq_linktrees_seo_name_per_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT uq_linktrees_seo_name_per_business UNIQUE (business_id, seo_name);


--
-- Name: linktrees uq_linktrees_uid_per_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT uq_linktrees_uid_per_business UNIQUE (business_id, uid);


--
-- Name: whatsapp_questions whatsapp_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_questions
    ADD CONSTRAINT whatsapp_questions_pkey PRIMARY KEY (id);


--
-- Name: idx_access_rules_effect_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_effect_status ON public.access_rules USING btree (effect, status, created_at DESC);


--
-- Name: idx_access_rules_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_expiry ON public.access_rules USING btree (expires_at) WHERE (((status)::text = 'active'::text) AND (expires_at IS NOT NULL));


--
-- Name: idx_access_rules_network; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_network ON public.access_rules USING gist (ip_network inet_ops) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_access_rules_scope_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_rules_scope_target ON public.access_rules USING btree (scope, business_id, linktree_id) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_billing_plans_status_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_plans_status_order ON public.billing_plans USING btree (status, display_order, name);


--
-- Name: idx_billing_subscription_plans_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_subscription_plans_profile ON public.billing_subscription_plans USING btree (permission_profile_id, status);


--
-- Name: idx_billing_subscription_plans_status_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_subscription_plans_status_order ON public.billing_subscription_plans USING btree (status, display_order, name);


--
-- Name: idx_billing_usage_counters_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_usage_counters_period ON public.billing_usage_counters USING btree (entitlement_key, period_end);


--
-- Name: idx_business_profile_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_profile_requests_status ON public.business_profile_change_requests USING btree (status, requested_at DESC);


--
-- Name: idx_business_sessions_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_sessions_business_id ON public.business_sessions USING btree (business_id);


--
-- Name: idx_business_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_sessions_token ON public.business_sessions USING btree (session_token_hash, session_expires_at DESC);


--
-- Name: idx_business_subscriptions_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_subscriptions_plan ON public.business_subscriptions USING btree (plan_id, status);


--
-- Name: idx_business_subscriptions_status_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_subscriptions_status_period ON public.business_subscriptions USING btree (status, current_period_end);


--
-- Name: idx_business_subscriptions_subscription_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_subscriptions_subscription_plan ON public.business_subscriptions USING btree (subscription_plan_id, status);


--
-- Name: idx_business_tiktok_pixels_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_tiktok_pixels_order ON public.business_tiktok_pixels USING btree (business_id, status, display_order, created_at);


--
-- Name: idx_businesses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_status ON public.businesses USING btree (status);


--
-- Name: idx_businesses_subdomain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_subdomain ON public.businesses USING btree (subdomain) WHERE (subdomain IS NOT NULL);


--
-- Name: idx_businesses_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_businesses_username ON public.businesses USING btree (username);


--
-- Name: idx_http_request_activity_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_activity_search ON public.http_request_events USING gin ((((((((((((COALESCE(('http.'::text || lower((method)::text)), ''::text) || ' '::text) || (COALESCE(actor_label, ''::character varying))::text) || ' '::text) || (COALESCE(route_pattern, ''::character varying))::text) || ' '::text) || (COALESCE(request_path, ''::character varying))::text) || ' '::text) || COALESCE(host(ip_address), ''::text)) || ' '::text) || (COALESCE(request_id, ''::character varying))::text)) public.gin_trgm_ops);


--
-- Name: idx_http_request_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_actor ON public.http_request_events USING btree (actor_type, actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_http_request_actor_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_actor_type_time ON public.http_request_events USING btree (actor_type, created_at DESC, id DESC);


--
-- Name: idx_http_request_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_business ON public.http_request_events USING btree (business_id, created_at DESC) WHERE (business_id IS NOT NULL);


--
-- Name: idx_http_request_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_created_at ON public.http_request_events USING btree (created_at DESC, id DESC);


--
-- Name: idx_http_request_duration_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_duration_time ON public.http_request_events USING btree (duration_ms DESC, created_at DESC, id DESC) WHERE (duration_ms IS NOT NULL);


--
-- Name: idx_http_request_ingestion_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_http_request_ingestion_key ON public.http_request_events USING btree (ingestion_key) WHERE (ingestion_key IS NOT NULL);


--
-- Name: idx_http_request_method_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_method_time ON public.http_request_events USING btree (method, created_at DESC, id DESC);


--
-- Name: idx_http_request_outcome_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_outcome_time ON public.http_request_events USING btree ((
CASE
    WHEN (status_code = ANY (ARRAY[401, 403])) THEN 'denied'::text
    WHEN (status_code >= 400) THEN 'failure'::text
    ELSE 'success'::text
END), created_at DESC, id DESC);


--
-- Name: idx_http_request_path_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_path_time ON public.http_request_events USING btree (request_path, created_at DESC, id DESC);


--
-- Name: idx_http_request_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_request_id ON public.http_request_events USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_http_request_route_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_route_status ON public.http_request_events USING btree (route_pattern, status_code, created_at DESC);


--
-- Name: idx_http_request_source_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_source_time ON public.http_request_events USING btree (source, created_at DESC, id DESC);


--
-- Name: idx_http_request_status_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_http_request_status_time ON public.http_request_events USING btree (status_code, created_at DESC, id DESC) WHERE (status_code IS NOT NULL);


--
-- Name: idx_links_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_business_id ON public.links USING btree (business_id);


--
-- Name: idx_links_linktree_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_linktree_order ON public.links USING btree (linktree_id, display_order);


--
-- Name: idx_linktrees_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_business_id ON public.linktrees USING btree (business_id);


--
-- Name: idx_linktrees_business_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_business_status ON public.linktrees USING btree (business_id, status);


--
-- Name: idx_linktrees_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_created_at ON public.linktrees USING btree (created_at DESC);


--
-- Name: idx_linktrees_seo_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_seo_name ON public.linktrees USING btree (business_id, seo_name);


--
-- Name: idx_linktrees_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linktrees_uid ON public.linktrees USING btree (business_id, uid);


--
-- Name: idx_permission_approvals_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_approvals_business ON public.permission_approval_requests USING btree (business_id, status, requested_at DESC);


--
-- Name: idx_permission_approvals_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_approvals_pending ON public.permission_approval_requests USING btree (requested_at, expires_at, business_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_plan_entitlements_entitlement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_entitlements_entitlement ON public.billing_plan_entitlements USING btree (entitlement_id, plan_configuration_id);


--
-- Name: idx_plan_permissions_permission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_permissions_permission ON public.billing_plan_permissions USING btree (permission_id, plan_configuration_id);


--
-- Name: idx_platform_permission_denies_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_permission_denies_match ON public.platform_permission_denies USING btree (permission_id, business_id, expires_at);


--
-- Name: idx_platform_admin_sessions_platform_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_admin_sessions_platform_admin_id ON public.platform_admin_sessions USING btree (platform_admin_id);


--
-- Name: idx_platform_admin_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_admin_sessions_token ON public.platform_admin_sessions USING btree (session_token, session_expires_at DESC);


--
-- Name: idx_security_audit_activity_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_activity_search ON public.security_audit_events USING gin (((((((((((((COALESCE(event_type, ''::character varying))::text || ' '::text) || (COALESCE(actor_label, ''::character varying))::text) || ' '::text) || (COALESCE(resource_label, ''::character varying))::text) || ' '::text) || (COALESCE(resource_id, ''::character varying))::text) || ' '::text) || COALESCE(host(ip_address), ''::text)) || ' '::text) || (COALESCE(request_id, ''::character varying))::text)) public.gin_trgm_ops);


--
-- Name: idx_security_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_actor ON public.security_audit_events USING btree (actor_type, actor_id, created_at DESC) WHERE (actor_id IS NOT NULL);


--
-- Name: idx_security_audit_actor_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_actor_type_time ON public.security_audit_events USING btree (actor_type, created_at DESC, id DESC);


--
-- Name: idx_security_audit_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_business ON public.security_audit_events USING btree (business_id, created_at DESC) WHERE (business_id IS NOT NULL);


--
-- Name: idx_security_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_created_at ON public.security_audit_events USING btree (created_at DESC);


--
-- Name: idx_security_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_event ON public.security_audit_events USING btree (event_type, outcome, created_at DESC);


--
-- Name: idx_security_audit_outcome_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_outcome_time ON public.security_audit_events USING btree (outcome, created_at DESC, id DESC);


--
-- Name: idx_security_audit_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_request ON public.security_audit_events USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_security_audit_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_resource ON public.security_audit_events USING btree (resource_type, resource_id, created_at DESC) WHERE (resource_type IS NOT NULL);


--
-- Name: idx_wq_linktree_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wq_linktree_id ON public.whatsapp_questions USING btree (linktree_id, display_order);


--
-- Name: uq_billing_one_default_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_one_default_plan ON public.billing_plans USING btree (is_default) WHERE ((is_default = true) AND ((status)::text = 'active'::text));


--
-- Name: uq_billing_one_default_subscription_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_one_default_subscription_plan ON public.billing_subscription_plans USING btree (is_default) WHERE ((is_default = true) AND ((status)::text = 'active'::text));


--
-- Name: uq_billing_plan_configurations_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_plan_configurations_plan ON public.billing_plan_configurations USING btree (plan_id);


--
-- Name: uq_billing_plans_name_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_plans_name_ci ON public.billing_plans USING btree (lower(btrim((name)::text)));


--
-- Name: uq_billing_subscription_plans_name_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_billing_subscription_plans_name_ci ON public.billing_subscription_plans USING btree (lower(btrim((name)::text)));


--
-- Name: uq_business_subscription_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_business_subscription_provider ON public.business_subscriptions USING btree (provider, provider_subscription_id) WHERE (provider_subscription_id IS NOT NULL);


--
-- Name: uq_linktrees_one_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_linktrees_one_default ON public.linktrees USING btree (business_id) WHERE (is_default = true);


--
-- Name: access_rules trg_access_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_access_rules_updated_at BEFORE UPDATE ON public.access_rules FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: auth_permissions trg_auth_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auth_permissions_updated_at BEFORE UPDATE ON public.auth_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_entitlements trg_billing_entitlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_entitlements_updated_at BEFORE UPDATE ON public.billing_entitlements FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plan_configurations trg_billing_plan_configurations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_plan_configurations_updated_at BEFORE UPDATE ON public.billing_plan_configurations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plans trg_billing_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_plans_updated_at BEFORE UPDATE ON public.billing_plans FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_policy_audit_events trg_billing_policy_audit_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_policy_audit_immutable BEFORE DELETE OR UPDATE ON public.billing_policy_audit_events FOR EACH ROW EXECUTE FUNCTION public.fn_reject_billing_policy_audit_mutation();


--
-- Name: billing_subscription_plans trg_billing_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_billing_subscription_plans_updated_at BEFORE UPDATE ON public.billing_subscription_plans FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: business_branding trg_business_branding_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_branding_updated_at BEFORE UPDATE ON public.business_branding FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: businesses trg_business_default_subscription; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_default_subscription AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_assign_default_subscription();


--
-- Name: business_defaults trg_business_defaults_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_defaults_updated_at BEFORE UPDATE ON public.business_defaults FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: business_subscriptions trg_business_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_subscriptions_updated_at BEFORE UPDATE ON public.business_subscriptions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: business_tiktok_pixels trg_business_tiktok_pixels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_business_tiktok_pixels_updated_at BEFORE UPDATE ON public.business_tiktok_pixels FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: businesses trg_businesses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: links trg_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: linktrees trg_linktrees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_linktrees_updated_at BEFORE UPDATE ON public.linktrees FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plan_entitlements trg_plan_entitlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plan_entitlements_updated_at BEFORE UPDATE ON public.billing_plan_entitlements FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: billing_plan_permissions trg_plan_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_plan_permissions_updated_at BEFORE UPDATE ON public.billing_plan_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: links trg_reorder_links; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_reorder_links AFTER DELETE ON public.links FOR EACH ROW EXECUTE FUNCTION public.fn_reorder_links_after_delete();


--
-- Name: platform_admins trg_platform_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_admins_updated_at BEFORE UPDATE ON public.platform_admins FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: whatsapp_questions trg_whatsapp_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_whatsapp_questions_updated_at BEFORE UPDATE ON public.whatsapp_questions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: access_rules access_rules_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: access_rules access_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.platform_admins(id) ON DELETE SET NULL;


--
-- Name: access_rules access_rules_linktree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_rules
    ADD CONSTRAINT access_rules_linktree_id_fkey FOREIGN KEY (linktree_id) REFERENCES public.linktrees(id) ON DELETE CASCADE;


--
-- Name: billing_plan_configurations billing_plan_configurations_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_configurations
    ADD CONSTRAINT billing_plan_configurations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON DELETE CASCADE;


--
-- Name: billing_plan_entitlements billing_plan_entitlements_entitlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_entitlements
    ADD CONSTRAINT billing_plan_entitlements_entitlement_id_fkey FOREIGN KEY (entitlement_id) REFERENCES public.billing_entitlements(id) ON DELETE RESTRICT;


--
-- Name: billing_plan_entitlements billing_plan_entitlements_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_entitlements
    ADD CONSTRAINT billing_plan_entitlements_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE CASCADE;


--
-- Name: billing_plan_permissions billing_plan_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_permissions
    ADD CONSTRAINT billing_plan_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON DELETE RESTRICT;


--
-- Name: billing_plan_permissions billing_plan_permissions_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_permissions
    ADD CONSTRAINT billing_plan_permissions_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE CASCADE;


--
-- Name: billing_plan_templates billing_plan_templates_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plan_templates
    ADD CONSTRAINT billing_plan_templates_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE CASCADE;


--
-- Name: billing_policy_audit_events billing_policy_audit_events_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: billing_policy_audit_events billing_policy_audit_events_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE SET NULL;


--
-- Name: billing_policy_audit_events billing_policy_audit_events_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_policy_audit_events
    ADD CONSTRAINT billing_policy_audit_events_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON DELETE SET NULL;


--
-- Name: billing_subscription_plans billing_subscription_plans_permission_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_subscription_plans
    ADD CONSTRAINT billing_subscription_plans_permission_profile_id_fkey FOREIGN KEY (permission_profile_id) REFERENCES public.billing_plans(id) ON DELETE RESTRICT;


--
-- Name: billing_usage_counters billing_usage_counters_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_usage_counters
    ADD CONSTRAINT billing_usage_counters_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_branding business_branding_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_branding
    ADD CONSTRAINT business_branding_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_defaults business_defaults_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_defaults
    ADD CONSTRAINT business_defaults_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_profile_change_requests business_profile_change_requests_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile_change_requests
    ADD CONSTRAINT business_profile_change_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_sessions business_sessions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_sessions
    ADD CONSTRAINT business_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_subscriptions business_subscriptions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_subscriptions business_subscriptions_plan_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_plan_configuration_id_fkey FOREIGN KEY (plan_configuration_id) REFERENCES public.billing_plan_configurations(id) ON DELETE RESTRICT;


--
-- Name: business_subscriptions business_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.billing_plans(id) ON DELETE RESTRICT;


--
-- Name: business_subscriptions business_subscriptions_subscription_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_subscription_plan_id_fkey FOREIGN KEY (subscription_plan_id) REFERENCES public.billing_subscription_plans(id) ON DELETE RESTRICT;


--
-- Name: business_tiktok_pixels business_tiktok_pixels_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_tiktok_pixels
    ADD CONSTRAINT business_tiktok_pixels_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: links fk_links_linktree_business; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT fk_links_linktree_business FOREIGN KEY (linktree_id, business_id) REFERENCES public.linktrees(id, business_id) ON DELETE CASCADE;


--
-- Name: http_request_events http_request_events_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.http_request_events
    ADD CONSTRAINT http_request_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: links links_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: links links_linktree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_linktree_id_fkey FOREIGN KEY (linktree_id) REFERENCES public.linktrees(id) ON DELETE CASCADE;


--
-- Name: linktrees linktrees_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linktrees
    ADD CONSTRAINT linktrees_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: permission_approval_requests permission_approval_requests_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_approval_requests
    ADD CONSTRAINT permission_approval_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: permission_approval_requests permission_approval_requests_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_approval_requests
    ADD CONSTRAINT permission_approval_requests_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON DELETE RESTRICT;


--
-- Name: platform_permission_denies platform_permission_denies_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_permission_denies
    ADD CONSTRAINT platform_permission_denies_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: platform_permission_denies platform_permission_denies_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_permission_denies
    ADD CONSTRAINT platform_permission_denies_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON DELETE CASCADE;


--
-- Name: security_audit_events security_audit_events_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_events
    ADD CONSTRAINT security_audit_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;


--
-- Name: platform_admin_sessions platform_admin_sessions_platform_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admin_sessions
    ADD CONSTRAINT platform_admin_sessions_platform_admin_id_fkey FOREIGN KEY (platform_admin_id) REFERENCES public.platform_admins(id) ON DELETE CASCADE;


--
-- Name: whatsapp_questions whatsapp_questions_linktree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_questions
    ADD CONSTRAINT whatsapp_questions_linktree_id_fkey FOREIGN KEY (linktree_id) REFERENCES public.linktrees(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

-- Communication Center: announcements, recipient deliveries, notification inboxes,
-- two-way business conversations, and public homepage placements.

CREATE TABLE IF NOT EXISTS public.communication_announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar(160) NOT NULL,
    message text NOT NULL,
    announcement_type varchar(30) NOT NULL DEFAULT 'general',
    priority varchar(20) NOT NULL DEFAULT 'normal',
    audience_type varchar(20) NOT NULL DEFAULT 'all',
    audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
    channels text[] NOT NULL DEFAULT ARRAY['business_bell']::text[],
    status varchar(20) NOT NULL DEFAULT 'draft',
    cta_label varchar(80),
    cta_url varchar(500),
    publish_at timestamptz,
    published_at timestamptz,
    expires_at timestamptz,
    archived_at timestamptz,
    encrypted_content bytea,
    created_by uuid NOT NULL REFERENCES public.platform_admins(id) ON DELETE RESTRICT,
    published_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT communication_announcements_type_check CHECK (
      announcement_type IN ('general', 'feature', 'maintenance', 'billing', 'security', 'urgent')
    ),
    CONSTRAINT communication_announcements_priority_check CHECK (
      priority IN ('normal', 'important', 'critical')
    ),
    CONSTRAINT communication_announcements_audience_check CHECK (
      audience_type IN ('all', 'plans', 'businesses')
    ),
    CONSTRAINT communication_announcements_status_check CHECK (
      status IN ('draft', 'scheduled', 'published', 'expired', 'archived')
    ),
    CONSTRAINT communication_announcements_audience_filter_check CHECK (
      jsonb_typeof(audience_filter) = 'object'
    ),
    CONSTRAINT communication_announcements_channels_check CHECK (
      cardinality(channels) > 0
      AND channels <@ ARRAY['business_bell', 'dashboard_banner', 'homepage']::text[]
    ),
    CONSTRAINT communication_announcements_schedule_check CHECK (
      expires_at IS NULL OR publish_at IS NULL OR expires_at > publish_at
    )
);

CREATE TABLE IF NOT EXISTS public.communication_announcement_deliveries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id uuid NOT NULL REFERENCES public.communication_announcements(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'delivered',
    delivered_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz,
    archived_at timestamptz,
    CONSTRAINT communication_announcement_delivery_status_check CHECK (
      status IN ('pending', 'delivered', 'failed', 'read', 'archived')
    ),
    CONSTRAINT communication_announcement_delivery_unique UNIQUE (announcement_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.communication_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_type varchar(20) NOT NULL,
    platform_admin_id uuid REFERENCES public.platform_admins(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    kind varchar(40) NOT NULL,
    priority varchar(20) NOT NULL DEFAULT 'normal',
    title varchar(160) NOT NULL,
    body text NOT NULL,
    source_type varchar(40),
    source_id uuid,
    action_url varchar(500),
    read_at timestamptz,
    archived_at timestamptz,
    encrypted_content bytea,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT communication_notifications_recipient_type_check CHECK (
      recipient_type IN ('platform-admin', 'business')
    ),
    CONSTRAINT communication_notifications_priority_check CHECK (
      priority IN ('normal', 'important', 'critical')
    ),
    CONSTRAINT communication_notifications_recipient_check CHECK (
      (recipient_type = 'platform-admin' AND platform_admin_id IS NOT NULL AND business_id IS NULL)
      OR
      (recipient_type = 'business' AND business_id IS NOT NULL AND platform_admin_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.communication_conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subject varchar(160) NOT NULL,
    category varchar(30) NOT NULL DEFAULT 'other',
    priority varchar(20) NOT NULL DEFAULT 'normal',
    status varchar(20) NOT NULL DEFAULT 'open',
    assigned_admin_id uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    created_by_type varchar(20) NOT NULL,
    multitree_key varchar(80),
    last_message_at timestamptz NOT NULL DEFAULT now(),
    business_last_read_at timestamptz,
    platform_last_read_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    encrypted_subject bytea,
    CONSTRAINT communication_conversations_category_check CHECK (
      category IN ('account', 'billing', 'technical', 'feature_request', 'security', 'verification', 'other')
    ),
    CONSTRAINT communication_conversations_priority_check CHECK (
      priority IN ('normal', 'important', 'urgent')
    ),
    CONSTRAINT communication_conversations_status_check CHECK (
      status IN ('open', 'waiting_business', 'waiting_platform', 'resolved', 'archived')
    ),
    CONSTRAINT communication_conversations_creator_check CHECK (
      created_by_type IN ('platform-admin', 'business')
    )
);

CREATE TABLE IF NOT EXISTS public.communication_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,
    sender_type varchar(20) NOT NULL,
    sender_admin_id uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    sender_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
    body text NOT NULL,
    encrypted_body bytea,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at timestamptz,
    CONSTRAINT communication_messages_sender_type_check CHECK (
      sender_type IN ('platform-admin', 'business')
    ),
    CONSTRAINT communication_messages_sender_check CHECK (
      (sender_type = 'platform-admin' AND sender_admin_id IS NOT NULL AND sender_business_id IS NULL)
      OR
      (sender_type = 'business' AND sender_business_id IS NOT NULL AND sender_admin_id IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.communication_homepage_placements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id uuid NOT NULL UNIQUE REFERENCES public.communication_announcements(id) ON DELETE CASCADE,
    placement varchar(30) NOT NULL DEFAULT 'top_banner',
    display_priority integer NOT NULL DEFAULT 0,
    is_dismissible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT communication_homepage_placement_check CHECK (
      placement IN ('top_banner', 'feature_card')
    )
);

CREATE INDEX IF NOT EXISTS idx_communication_announcements_status_schedule
  ON public.communication_announcements(status, publish_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_communication_announcements_created_at
  ON public.communication_announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_deliveries_business
  ON public.communication_announcement_deliveries(business_id, read_at, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_notifications_platform_unread
  ON public.communication_notifications(platform_admin_id, read_at, created_at DESC)
  WHERE recipient_type = 'platform-admin' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communication_notifications_business_unread
  ON public.communication_notifications(business_id, read_at, created_at DESC)
  WHERE recipient_type = 'business' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communication_conversations_business_activity
  ON public.communication_conversations(business_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_conversations_platform_queue
  ON public.communication_conversations(status, priority, last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_conversations_multitree_key
  ON public.communication_conversations(business_id, multitree_key)
  WHERE multitree_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_messages_conversation
  ON public.communication_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_communication_homepage_priority
  ON public.communication_homepage_placements(display_priority DESC);

INSERT INTO public.auth_permissions
  (permission_key, resource, action, description, risk_level, category,
   display_order, field_schema, supports_approval, status)
VALUES
  ('platform:communications:read', 'platform.communications', 'read',
   'View the Communication Center', 'standard', 'Communication Center', 640, '{}', false, 'active'),
  ('platform:communications:announcement-create', 'platform.communications', 'announcement-create',
   'Create and edit communication drafts', 'sensitive', 'Communication Center', 650, '{}', false, 'active'),
  ('platform:communications:announcement-publish', 'platform.communications', 'announcement-publish',
   'Publish and schedule announcements', 'critical', 'Communication Center', 660, '{}', false, 'active'),
  ('platform:communications:announcement-archive', 'platform.communications', 'announcement-archive',
   'Archive published communication', 'sensitive', 'Communication Center', 670, '{}', false, 'active'),
  ('platform:communications:conversation-reply', 'platform.communications', 'conversation-reply',
   'Reply to and manage business conversations', 'sensitive', 'Communication Center', 680, '{}', false, 'active'),
  ('platform:communications:homepage-manage', 'platform.communications', 'homepage-manage',
   'Publish public homepage communication', 'critical', 'Communication Center', 690, '{}', false, 'active')
ON CONFLICT (permission_key) DO UPDATE SET
  resource=EXCLUDED.resource,
  action=EXCLUDED.action,
  description=EXCLUDED.description,
  risk_level=EXCLUDED.risk_level,
  category=EXCLUDED.category,
  display_order=EXCLUDED.display_order,
  status='active',
  updated_at=NOW();

-- Idempotent starter content for the Communication Center. The runtime business
-- creation flow mirrors this seed so future accounts receive the same onboarding.
INSERT INTO public.communication_announcements
  (id, title, message, announcement_type, priority, audience_type,
   audience_filter, channels, status, cta_label, cta_url,
   publish_at, published_at, created_by, published_by)
SELECT seed.id, seed.title, seed.message, seed.announcement_type,
       seed.priority, 'all', '{}'::jsonb, seed.channels, 'published',
       seed.cta_label, seed.cta_url, now(), now(), admin.id, admin.id
FROM (
  VALUES
    ('7b100000-0000-4000-8000-000000000001'::uuid,
     'بەخێربێیت بۆ MultiTree',
     'بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.',
     'general', 'normal', ARRAY['business_bell']::text[], NULL, NULL)
) AS seed(id, title, message, announcement_type, priority, channels, cta_label, cta_url)
CROSS JOIN LATERAL (
  SELECT id FROM public.platform_admins ORDER BY created_at ASC, id ASC LIMIT 1
) admin
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title,
  message=EXCLUDED.message,
  announcement_type=EXCLUDED.announcement_type,
  priority=EXCLUDED.priority,
  channels=EXCLUDED.channels,
  cta_label=EXCLUDED.cta_label,
  cta_url=EXCLUDED.cta_url,
  encrypted_content=NULL,
  updated_at=now();

INSERT INTO public.communication_announcement_deliveries
  (announcement_id, business_id, status)
SELECT a.id, b.id, 'delivered'
FROM public.communication_announcements a
CROSS JOIN public.businesses b
WHERE a.id IN (
  '7b100000-0000-4000-8000-000000000001'::uuid
) AND b.status='active'
ON CONFLICT (announcement_id, business_id) DO NOTHING;

INSERT INTO public.communication_notifications
  (recipient_type, business_id, kind, priority, title, body,
   source_type, source_id, action_url)
SELECT 'business', d.business_id, 'announcement', a.priority, a.title, a.message,
       'announcement', a.id, COALESCE(a.cta_url, '/business')
FROM public.communication_announcement_deliveries d
JOIN public.communication_announcements a ON a.id=d.announcement_id
WHERE a.id IN (
  '7b100000-0000-4000-8000-000000000001'::uuid
) AND NOT EXISTS (
  SELECT 1 FROM public.communication_notifications n
  WHERE n.recipient_type='business' AND n.business_id=d.business_id
    AND n.source_type='announcement' AND n.source_id=a.id
);

UPDATE public.communication_notifications n
SET title=a.title, body=a.message, priority=a.priority,
    action_url=COALESCE(a.cta_url, '/business'), encrypted_content=NULL
FROM public.communication_announcements a
WHERE n.recipient_type='business'
  AND n.source_type='announcement' AND n.source_id=a.id
  AND a.id IN (
    '7b100000-0000-4000-8000-000000000001'::uuid
  );

DELETE FROM public.communication_announcements
WHERE id IN (
  '7b100000-0000-4000-8000-000000000002'::uuid,
  '7b100000-0000-4000-8000-000000000003'::uuid
);

DO $communication_seed$
DECLARE
  seed_admin uuid;
  target record;
  thread_id uuid;
  welcome_body text;
BEGIN
  SELECT id INTO seed_admin FROM public.platform_admins
  ORDER BY created_at ASC, id ASC LIMIT 1;
  IF seed_admin IS NULL THEN RETURN; END IF;

  FOR target IN SELECT id, name FROM public.businesses LOOP
    SELECT id INTO thread_id FROM public.communication_conversations
    WHERE business_id=target.id AND multitree_key='business_welcome'
    ORDER BY created_at ASC LIMIT 1;

    IF thread_id IS NULL THEN
      INSERT INTO public.communication_conversations
        (business_id, subject, category, priority, status, multitree_key, assigned_admin_id,
         created_by_type, platform_last_read_at)
      VALUES (target.id, 'بەخێربێیت بۆ MultiTree', 'account', 'normal',
              'waiting_business', 'business_welcome', seed_admin, 'platform-admin', now())
      RETURNING id INTO thread_id;

      welcome_body := 'سڵاو ' || target.name ||
        '، بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.';

      INSERT INTO public.communication_messages
        (conversation_id, sender_type, sender_admin_id, body)
      VALUES (thread_id, 'platform-admin', seed_admin, welcome_body);

      INSERT INTO public.communication_notifications
        (recipient_type, business_id, kind, priority, title, body,
         source_type, source_id, action_url)
      VALUES ('business', target.id, 'platform_reply', 'important',
              'بەخێربێیت بۆ MultiTree', welcome_body, 'conversation', thread_id,
              '/business?communication=' || thread_id::text);
    ELSE
      welcome_body := 'سڵاو ' || target.name ||
        '، بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.';
      UPDATE public.communication_messages
      SET body=welcome_body, encrypted_body=NULL
      WHERE id=(SELECT id FROM public.communication_messages
                WHERE conversation_id=thread_id AND sender_type='platform-admin'
                ORDER BY created_at ASC LIMIT 1);
      UPDATE public.communication_notifications
      SET title='بەخێربێیت بۆ MultiTree', body=welcome_body,
          encrypted_content=NULL
      WHERE recipient_type='business' AND business_id=target.id
        AND source_type='conversation' AND source_id=thread_id;
    END IF;
  END LOOP;
END
$communication_seed$;

-- Developer API, usage governance, idempotency, schedules, and durable webhooks.
CREATE TABLE IF NOT EXISTS public.api_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  client_id varchar(80) NOT NULL UNIQUE,
  key_prefix varchar(48) NOT NULL UNIQUE,
  key_hash char(64) NOT NULL,
  environment varchar(16) NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'sandbox')),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  scopes text[] NOT NULL DEFAULT '{}',
  ip_allowlist inet[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  last_rotated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_rate_limit_policies (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  requests_per_minute integer CHECK (requests_per_minute > 0),
  requests_monthly integer CHECK (requests_monthly > 0 OR requests_monthly = -1),
  api_client_limit integer CHECK (api_client_limit > 0 OR api_client_limit = -1),
  webhook_endpoint_limit integer CHECK (webhook_endpoint_limit > 0 OR webhook_endpoint_limit = -1),
  warning_threshold smallint NOT NULL DEFAULT 80 CHECK (warning_threshold BETWEEN 1 AND 100),
  auto_suspend boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  request_count bigint NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  success_count bigint NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  error_count bigint NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  PRIMARY KEY (usage_date, client_id)
);

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  idempotency_key varchar(160) NOT NULL,
  request_hash char(64) NOT NULL,
  response_status smallint,
  response_body jsonb,
  locked_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (client_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.api_external_resource_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  resource_type varchar(40) NOT NULL,
  resource_id uuid NOT NULL,
  external_id varchar(180) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, resource_type, external_id),
  UNIQUE (business_id, resource_type, resource_id, client_id)
);

CREATE TABLE IF NOT EXISTS public.api_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  linktree_id uuid REFERENCES public.linktrees(id) ON DELETE CASCADE,
  asset_type varchar(40) NOT NULL,
  url text NOT NULL,
  created_by_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_webhook_endpoints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  encrypted_url bytea NOT NULL,
  url_host varchar(255) NOT NULL,
  encrypted_signing_secret bytea NOT NULL,
  signing_secret_prefix varchar(24) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_delivery_at timestamptz,
  last_success_at timestamptz,
  created_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, url_host, name)
);

CREATE TABLE IF NOT EXISTS public.api_webhook_subscriptions (
  endpoint_id uuid NOT NULL REFERENCES public.api_webhook_endpoints(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (endpoint_id, event_type)
);

CREATE TABLE IF NOT EXISTS public.api_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  resource_type varchar(40),
  resource_id uuid,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_webhook_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id uuid NOT NULL REFERENCES public.api_webhook_endpoints(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.api_webhook_events(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'delivered', 'retrying', 'failed', 'cancelled')),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_response_status smallint,
  last_error varchar(500),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.api_webhook_delivery_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES public.api_webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number smallint NOT NULL,
  response_status smallint,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  error_message varchar(500),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.api_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version varchar(20) NOT NULL UNIQUE,
  status varchar(20) NOT NULL CHECK (status IN ('current', 'supported', 'deprecated', 'retired')),
  released_at date NOT NULL,
  retirement_at date,
  last_notified_at timestamptz,
  notification_count integer NOT NULL DEFAULT 0 CHECK (notification_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_catalog_groups (
  id varchar(40) PRIMARY KEY,
  name varchar(120) NOT NULL,
  description text NOT NULL,
  scope_expression varchar(255) NOT NULL,
  endpoint_count smallint NOT NULL CHECK (endpoint_count >= 0),
  operations jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT true,
  display_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_linktree_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  linktree_id uuid NOT NULL REFERENCES public.linktrees(id) ON DELETE CASCADE,
  action varchar(20) NOT NULL CHECK (action IN ('publish', 'unpublish')),
  execute_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'cancelled', 'failed')),
  created_by_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  processed_at timestamptz,
  error_message varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_clients_business_status ON public.api_clients(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_clients_key_prefix ON public.api_clients(key_prefix) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_api_usage_business_date ON public.api_usage_daily(business_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_expiry ON public.api_idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_external_resource ON public.api_external_resource_mappings(business_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_api_assets_business ON public.api_assets(business_id, linktree_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_webhook_endpoints_business ON public.api_webhook_endpoints(business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_webhook_events_business ON public.api_webhook_events(business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_webhook_delivery_queue ON public.api_webhook_deliveries(status, next_attempt_at) WHERE status IN ('queued', 'retrying');
CREATE INDEX IF NOT EXISTS idx_api_webhook_delivery_endpoint ON public.api_webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_linktree_schedule_queue ON public.api_linktree_schedules(status, execute_at) WHERE status = 'scheduled';

INSERT INTO public.api_versions(version, status, released_at, retirement_at)
VALUES ('v1', 'current', '2026-07-20', NULL)
ON CONFLICT (version) DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS uq_api_versions_current ON public.api_versions(status) WHERE status='current';

INSERT INTO public.billing_plan_entitlements(plan_configuration_id, entitlement_id, value)
SELECT configuration.id, entitlement.id,
       CASE entitlement.entitlement_key
         WHEN 'feature.api_access' THEN to_jsonb(plan.code IN ('pro','ultra'))
         WHEN 'feature.webhooks' THEN to_jsonb(plan.code IN ('pro','ultra'))
         WHEN 'limit.api_requests_monthly' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 200000 WHEN 'pro' THEN 50000 ELSE 0 END)
         WHEN 'limit.api_clients' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 10 WHEN 'pro' THEN 3 ELSE 0 END)
         WHEN 'limit.webhook_endpoints' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 10 WHEN 'pro' THEN 3 ELSE 0 END)
       END
FROM public.billing_plan_configurations configuration
JOIN public.billing_plans plan ON plan.id=configuration.plan_id
CROSS JOIN public.billing_entitlements entitlement
WHERE entitlement.entitlement_key IN ('feature.api_access','feature.webhooks','limit.api_requests_monthly','limit.api_clients','limit.webhook_endpoints')
ON CONFLICT (plan_configuration_id, entitlement_id) DO NOTHING;

INSERT INTO public.api_catalog_groups (id, name, description, scope_expression, endpoint_count, operations, enabled, display_order)
VALUES
  ('linktrees', 'Public Linktrees', 'Create and manage public Linktree pages.', 'linktrees:read / linktrees:write', 8, '["List","Create","View","Update","Publish","Unpublish","Delete"]', true, 10),
  ('links', 'Links & Ordering', 'Manage links and their display order.', 'links:read / links:manage', 2, '["List","Synchronize and reorder"]', true, 20),
  ('assets', 'Assets & Media', 'Upload and manage public page assets.', 'assets:read / assets:write', 3, '["Upload","List","Delete"]', true, 30),
  ('slugs', 'Slugs & Preview', 'Check slugs and preview unpublished changes.', 'linktrees:read / linktrees:write', 2, '["Check availability","Preview"]', true, 40),
  ('scheduling', 'Scheduling & Campaigns', 'Schedule publishing and unpublishing.', 'schedules:read / schedules:write', 3, '["Schedule","List","Cancel"]', true, 50),
  ('templates', 'Templates & Cloning', 'List allowed templates and clone existing pages.', 'templates:read / linktrees:write', 2, '["List templates","Clone"]', true, 60),
  ('bulk', 'Bulk Operations', 'Manage multiple pages atomically.', 'bulk:write', 1, '["Bulk create and update"]', true, 70),
  ('analytics', 'Analytics & Exports', 'Read analytics and export reports.', 'analytics:read / analytics:export', 4, '["Summary","Daily","Range","CSV export"]', true, 80)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, scope_expression=EXCLUDED.scope_expression, endpoint_count=EXCLUDED.endpoint_count, operations=EXCLUDED.operations, display_order=EXCLUDED.display_order, updated_at=now();

-- Platform-wide operational data retention. Active business data and aggregate
-- analytics are intentionally outside this policy.
CREATE TABLE IF NOT EXISTS public.platform_data_retention_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  request_log_days integer NOT NULL DEFAULT 30 CHECK (request_log_days BETWEEN 7 AND 365),
  api_history_days integer NOT NULL DEFAULT 90 CHECK (api_history_days BETWEEN 30 AND 730),
  communication_history_days integer NOT NULL DEFAULT 365 CHECK (communication_history_days BETWEEN 30 AND 3650),
  automatic_cleanup boolean NOT NULL DEFAULT false,
  cleanup_hour_utc smallint NOT NULL DEFAULT 2 CHECK (cleanup_hour_utc BETWEEN 0 AND 23),
  batch_size integer NOT NULL DEFAULT 1000 CHECK (batch_size BETWEEN 100 AND 10000),
  updated_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_data_retention_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_data_retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type varchar(20) NOT NULL CHECK (trigger_type IN ('manual', 'scheduled')),
  status varchar(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message varchar(1000),
  triggered_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_retention_running ON public.platform_data_retention_runs ((status)) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_platform_retention_runs_started ON public.platform_data_retention_runs (started_at DESC);

-- Platform-wide media policy and inventory for all new uploads.
CREATE TABLE IF NOT EXISTS public.platform_media_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_upload_size_mb smallint NOT NULL DEFAULT 5 CHECK (max_upload_size_mb BETWEEN 1 AND 10),
  allowed_formats text[] NOT NULL DEFAULT ARRAY['jpeg','png','ico']::text[],
  optimize_images boolean NOT NULL DEFAULT true,
  image_quality smallint NOT NULL DEFAULT 82 CHECK (image_quality BETWEEN 40 AND 100),
  max_image_dimension integer NOT NULL DEFAULT 2048 CHECK (max_image_dimension BETWEEN 512 AND 4096),
  auto_cleanup_unused boolean NOT NULL DEFAULT true,
  unused_grace_hours integer NOT NULL DEFAULT 72 CHECK (unused_grace_hours BETWEEN 24 AND 720),
  updated_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_media_allowed_formats_check CHECK (
    cardinality(allowed_formats) > 0
    AND allowed_formats <@ ARRAY['jpeg','png','ico']::text[]
  )
);
INSERT INTO public.platform_media_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.uploaded_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  public_url text NOT NULL UNIQUE,
  scope varchar(30) NOT NULL,
  owner_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  format varchar(10) NOT NULL,
  original_byte_size bigint NOT NULL CHECK (original_byte_size >= 0),
  stored_byte_size bigint NOT NULL CHECK (stored_byte_size >= 0),
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_assets_created ON public.uploaded_media_assets(created_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_assets_owner ON public.uploaded_media_assets(owner_business_id, created_at DESC);

-- MINI WEBSITE SCHEMA BEGIN
-- Mini Website basic profile. Sections will be introduced incrementally later.
CREATE TABLE IF NOT EXISTS public.mini_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  slug varchar(100) NOT NULL CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$'),
  headline varchar(240) NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar text,
  cover text,
  hero_background_type varchar(20) NOT NULL DEFAULT 'color' CHECK (hero_background_type IN ('image','color','video')),
  hero_background_color text NOT NULL DEFAULT '#000000',
  hero_video_url text NOT NULL DEFAULT '',
  variation varchar(20) NOT NULL DEFAULT 'soft' CHECK (variation IN ('soft','glass','minimal','warm')),
  background_style varchar(20) NOT NULL DEFAULT 'grid' CHECK (background_style IN ('none','grid','grid45','dots','diagonal','cross','circles','waves','zigzag')),
  profession_template varchar(80) NOT NULL DEFAULT 'custom',
  accent_color varchar(100) NOT NULL DEFAULT '#b6f20d' CHECK (accent_color ~ '^(#[0-9A-Fa-f]{6}|gradient:(to-r|to-l|to-b|to-t|to-br|to-bl|to-tr|to-tl|radial):#[0-9A-Fa-f]{6}:#[0-9A-Fa-f]{6})$'),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','archived')),
  primary_action varchar(20) NOT NULL DEFAULT 'none' CHECK (primary_action IN ('none','whatsapp','call','booking')),
  whatsapp_number varchar(30) NOT NULL DEFAULT '',
  pixel_event varchar(40) NOT NULL DEFAULT 'Contact' CHECK (pixel_event IN ('Contact','Lead','InitiateCheckout','CompletePayment')),
  event_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (event_value >= 0),
  -- Sections, social links and branches are rows in their own tables rather
  -- than blobs here; see MINI WEBSITE CONTENT below.
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

ALTER TABLE public.mini_websites
  DROP COLUMN IF EXISTS story;

ALTER TABLE public.mini_websites
  ADD COLUMN IF NOT EXISTS profession_template varchar(80) NOT NULL DEFAULT 'custom';

ALTER TABLE public.mini_websites
  DROP CONSTRAINT IF EXISTS mini_websites_accent_color_check;
ALTER TABLE public.mini_websites
  ALTER COLUMN accent_color TYPE varchar(100);
ALTER TABLE public.mini_websites
  ADD CONSTRAINT mini_websites_accent_color_check
  CHECK (accent_color ~ '^(#[0-9A-Fa-f]{6}|gradient:(to-r|to-l|to-b|to-t|to-br|to-bl|to-tr|to-tl|radial):#[0-9A-Fa-f]{6}:#[0-9A-Fa-f]{6})$');

ALTER TABLE public.mini_websites
  ADD COLUMN IF NOT EXISTS background_style varchar(20) NOT NULL DEFAULT 'grid';
ALTER TABLE public.mini_websites
  DROP CONSTRAINT IF EXISTS mini_websites_background_style_check;
ALTER TABLE public.mini_websites
  ADD CONSTRAINT mini_websites_background_style_check
  CHECK (background_style IN ('none','grid','grid45','dots','diagonal','cross','circles','waves','zigzag'));

ALTER TABLE public.mini_websites
  DROP CONSTRAINT IF EXISTS mini_websites_primary_action_check;
ALTER TABLE public.mini_websites
  ADD CONSTRAINT mini_websites_primary_action_check
  CHECK (primary_action IN ('none','whatsapp','call','booking'));

-- MINI WEBSITE CONTENT BEGIN
-- Page content is relational: one row per section, per link, per branch, per
-- day. It began as jsonb blobs on `mini_websites`, which read fast but left no
-- id to hang analytics on, no ordering that could change without rewriting an
-- array, and no constraint stopping a duplicate weekday or an impossible
-- coordinate. The migration at the end of this block moves the blobs across and
-- drops the columns.

-- Which sections a page shows, and in what order.
CREATE TABLE IF NOT EXISTS public.mini_website_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  section_key varchar(40) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A page cannot list the same section twice.
  UNIQUE (mini_website_id, section_key)
);

-- One social destination. `link_key` is the id the editor works with, kept
-- stable across a rewrite of the list so anything keyed to a link stays attached.
CREATE TABLE IF NOT EXISTS public.mini_website_social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  link_key varchar(120) NOT NULL,
  platform varchar(30) NOT NULL,
  url varchar(2048) NOT NULL DEFAULT '',
  value varchar(500) NOT NULL DEFAULT '',
  country_code varchar(4) NOT NULL DEFAULT '964',
  display_name varchar(80) NOT NULL DEFAULT '',
  custom_color varchar(200) NOT NULL DEFAULT '',
  custom_icon varchar(2048) NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mini_website_id, link_key)
);

-- One branch. Order is what makes a branch primary: position 0 leads the page.
CREATE TABLE IF NOT EXISTS public.mini_website_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  name varchar(120) NOT NULL DEFAULT '',
  phone varchar(20) NOT NULL DEFAULT '',
  phone_country_code varchar(4) NOT NULL DEFAULT '964',
  address varchar(300) NOT NULL DEFAULT '',
  area varchar(120) NOT NULL DEFAULT '',
  city varchar(120) NOT NULL DEFAULT '',
  lat double precision CHECK (lat BETWEEN -90 AND 90),
  lng double precision CHECK (lng BETWEEN -180 AND 180),
  precision varchar(12) NOT NULL DEFAULT 'exact' CHECK (precision IN ('exact','approximate')),
  radius_meters integer NOT NULL DEFAULT 500 CHECK (radius_meters BETWEEN 100 AND 20000),
  zoom double precision NOT NULL DEFAULT 14 CHECK (zoom BETWEEN 1 AND 20),
  map_url varchar(2048) NOT NULL DEFAULT '',
  image varchar(2048) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Half a pin is not a pin: either both coordinates are set or neither is.
  CONSTRAINT mini_website_locations_pin_check CHECK ((lat IS NULL) = (lng IS NULL))
);

-- Opening times, one row per weekday for the business.
--
-- They belong to the page, not to a branch: the hours section stands on its own
-- and publishes with or without an address. `day` matches JavaScript's
-- `Date.prototype.getDay()`, where Sunday is 0, so asking whether the business
-- is open right now needs no mapping. A `close_time` at or before `open_time`
-- means the day runs past midnight, which is how a night shift is recorded.
CREATE TABLE IF NOT EXISTS public.mini_website_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  day smallint NOT NULL CHECK (day BETWEEN 0 AND 6),
  closed boolean NOT NULL DEFAULT false,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '18:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mini_website_id, day)
);

-- The shared shape for list-style sections: services, bookings, team members,
-- certificates, videos, partners, before/after comparisons, service coverage,
-- payment methods, special offers, events, audio, advantages, impact statistics,
-- process steps, documents,
-- owned brands and pages, education and career history, products, FAQ, gallery, and
-- reviews.
-- They differ only in which columns they use,
-- so each new one is rows here rather than a table or a blob of its own.
CREATE TABLE IF NOT EXISTS public.mini_website_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  section_key varchar(40) NOT NULL,
  -- The editor's own key for the row, kept across a save so a caption or a
  -- tracked click stays with its item when the list is reordered.
  item_key varchar(120) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  enabled boolean NOT NULL DEFAULT true,
  title varchar(240) NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  role varchar(160) NOT NULL DEFAULT '',
  experience varchar(160) NOT NULL DEFAULT '',
  issuer varchar(160) NOT NULL DEFAULT '',
  year_label varchar(40) NOT NULL DEFAULT '',
  -- A reusable lifecycle label for rows such as education history.
  status_label varchar(80) NOT NULL DEFAULT '',
  media_platform varchar(20) NOT NULL DEFAULT 'other'
    CHECK (media_platform IN ('youtube','tiktok','instagram','facebook','telegram','snapchat','other')),
  price varchar(80) NOT NULL DEFAULT '',
  -- `url` is derived, never taken from the client: the button is described as a
  -- type plus a value, and the server builds the destination from those. A page
  -- therefore cannot be made to publish a `javascript:` or `data:` link.
  url varchar(2048) NOT NULL DEFAULT '',
  action_type varchar(20) NOT NULL DEFAULT 'none'
    CHECK (action_type IN ('none','link','whatsapp','phone')),
  -- What the business typed: a web address, or a national number without its
  -- dialling code.
  action_value varchar(500) NOT NULL DEFAULT '',
  action_country_code varchar(4) NOT NULL DEFAULT '964',
  -- Booking rows describe which public scheduler owns their destination.
  -- MultiTree stores no provider credentials for URL-based bookings.
  provider varchar(20) NOT NULL DEFAULT 'custom'
    CHECK (provider IN ('calendly','calcom','google','custom','whatsapp')),
  duration_minutes smallint NOT NULL DEFAULT 30
    CHECK (duration_minutes BETWEEN 5 AND 1440),
  image varchar(2048) NOT NULL DEFAULT '',
  -- The second half of an image comparison. Other item types leave it empty.
  secondary_image varchar(2048) NOT NULL DEFAULT '',
  action_label varchar(120) NOT NULL DEFAULT '',
  -- Stars, for the sections that are scored. Zero means unrated rather than
  -- badly rated, which is what a section with no stars at all stores.
  rating smallint NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  -- Whether a lead-form question must be answered before the form will send.
  required boolean NOT NULL DEFAULT false,
  -- The recommended tier, for the pricing section.
  featured boolean NOT NULL DEFAULT false,
  -- A lead-form dropdown's choices, or a pricing tier's included features.
  options text[] NOT NULL DEFAULT '{}'::text[] CHECK (cardinality(options) <= 20),
  pixel_event varchar(40) NOT NULL DEFAULT 'None'
    CHECK (pixel_event IN ('None','Contact','Lead','InitiateCheckout','CompletePayment')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Added after the table, for a database created before these existed.
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS item_key varchar(120) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS role varchar(160) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS experience varchar(160) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS issuer varchar(160) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS year_label varchar(40) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS status_label varchar(80) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS media_platform varchar(20) NOT NULL DEFAULT 'other';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS action_type varchar(20) NOT NULL DEFAULT 'none';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS action_value varchar(500) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS action_country_code varchar(4) NOT NULL DEFAULT '964';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS provider varchar(20) NOT NULL DEFAULT 'custom';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS duration_minutes smallint NOT NULL DEFAULT 30;
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS secondary_image varchar(2048) NOT NULL DEFAULT '';
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS rating smallint NOT NULL DEFAULT 0;
-- The lead form's questions need two shapes no existing column carries: whether
-- an answer is mandatory, and the choices a dropdown offers.
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.mini_website_items
  ADD COLUMN IF NOT EXISTS options text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.mini_website_items
  DROP CONSTRAINT IF EXISTS mini_website_items_options_check;
ALTER TABLE public.mini_website_items
  ADD CONSTRAINT mini_website_items_options_check
  CHECK (cardinality(options) <= 20);
ALTER TABLE public.mini_website_items
  DROP CONSTRAINT IF EXISTS mini_website_items_rating_check;
ALTER TABLE public.mini_website_items
  ADD CONSTRAINT mini_website_items_rating_check CHECK (rating BETWEEN 0 AND 5);
ALTER TABLE public.mini_website_items
  DROP CONSTRAINT IF EXISTS mini_website_items_action_type_check;
ALTER TABLE public.mini_website_items
  ADD CONSTRAINT mini_website_items_action_type_check
  CHECK (action_type IN ('none','link','whatsapp','phone'));
ALTER TABLE public.mini_website_items
  DROP CONSTRAINT IF EXISTS mini_website_items_provider_check;
ALTER TABLE public.mini_website_items
  ADD CONSTRAINT mini_website_items_provider_check
  CHECK (provider IN ('calendly','calcom','google','custom','whatsapp'));
ALTER TABLE public.mini_website_items
  DROP CONSTRAINT IF EXISTS mini_website_items_duration_minutes_check;
ALTER TABLE public.mini_website_items
  ADD CONSTRAINT mini_website_items_duration_minutes_check
  CHECK (duration_minutes BETWEEN 5 AND 1440);
ALTER TABLE public.mini_website_items
  DROP CONSTRAINT IF EXISTS mini_website_items_media_platform_check;
ALTER TABLE public.mini_website_items
  ADD CONSTRAINT mini_website_items_media_platform_check
  CHECK (media_platform IN ('youtube','tiktok','instagram','facebook','telegram','snapchat','other'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_mini_items_key
  ON public.mini_website_items(mini_website_id, section_key, item_key)
  WHERE item_key <> '';

CREATE INDEX IF NOT EXISTS idx_mini_sections_website ON public.mini_website_sections(mini_website_id, position);
CREATE INDEX IF NOT EXISTS idx_mini_social_links_website ON public.mini_website_social_links(mini_website_id, position);
CREATE INDEX IF NOT EXISTS idx_mini_locations_website ON public.mini_website_locations(mini_website_id, position);
-- Answers "which branches sit inside this box" without reading every row.
CREATE INDEX IF NOT EXISTS idx_mini_locations_coordinates ON public.mini_website_locations(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mini_hours_website ON public.mini_website_hours(mini_website_id, day);
CREATE INDEX IF NOT EXISTS idx_mini_items_section ON public.mini_website_items(mini_website_id, section_key, position);

-- Per-page lead form settings. One row per mini website, so the form's wording
-- lives with the page rather than being repeated on every question row.
--
-- Submissions are deliberately absent: they flow through the analytics ingest
-- into `crm_contacts` and `crm_leads`, where name, email and phone are encrypted
-- at rest and hashed for de-duplication. A second, plaintext copy of the same
-- details sitting beside the page definition would undo all of that.
CREATE TABLE IF NOT EXISTS public.mini_website_lead_forms (
  mini_website_id uuid PRIMARY KEY REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL DEFAULT '',
  description varchar(600) NOT NULL DEFAULT '',
  submit_label varchar(80) NOT NULL DEFAULT '',
  success_message varchar(400) NOT NULL DEFAULT '',
  consent_text varchar(600) NOT NULL DEFAULT '',
  consent_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A required tick-box with nothing written beside it asks the visitor to
  -- agree to nothing, which is worse than not asking at all.
  CONSTRAINT mini_website_lead_forms_consent_check
    CHECK (NOT consent_required OR length(btrim(consent_text)) > 0)
);

DROP TRIGGER IF EXISTS trg_mini_website_sections_updated_at ON public.mini_website_sections;
CREATE TRIGGER trg_mini_website_sections_updated_at BEFORE UPDATE ON public.mini_website_sections FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_mini_website_social_links_updated_at ON public.mini_website_social_links;
CREATE TRIGGER trg_mini_website_social_links_updated_at BEFORE UPDATE ON public.mini_website_social_links FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_mini_website_locations_updated_at ON public.mini_website_locations;
CREATE TRIGGER trg_mini_website_locations_updated_at BEFORE UPDATE ON public.mini_website_locations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_mini_website_hours_updated_at ON public.mini_website_hours;
CREATE TRIGGER trg_mini_website_hours_updated_at BEFORE UPDATE ON public.mini_website_hours FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_mini_website_items_updated_at ON public.mini_website_items;
CREATE TRIGGER trg_mini_website_items_updated_at BEFORE UPDATE ON public.mini_website_items FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_mini_website_lead_forms_updated_at ON public.mini_website_lead_forms;
CREATE TRIGGER trg_mini_website_lead_forms_updated_at BEFORE UPDATE ON public.mini_website_lead_forms FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- One-time move off the jsonb columns.
--
-- Guarded on the columns still existing and skipped once the tables hold rows,
-- so re-running this file is harmless. The columns are dropped at the end: the
-- last version of every page is also kept whole in `mini_website_versions`, so
-- nothing here is the only copy.
DO $mini_content_migration$
DECLARE
  legacy record;
  entry jsonb;
  day_entry jsonb;
  position_index integer;
  lat_value double precision;
  lng_value double precision;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mini_websites'
      AND column_name IN ('sections', 'locations', 'location', 'social_links')
  ) THEN
    RETURN;
  END IF;

  FOR legacy IN
    EXECUTE 'SELECT id, sections, social_links,
                    CASE WHEN jsonb_typeof(locations) = ''array'' AND locations <> ''[]''::jsonb
                         THEN locations
                         WHEN jsonb_typeof(location) = ''object'' AND location <> ''{}''::jsonb
                         THEN jsonb_build_array(location)
                         ELSE ''[]''::jsonb END AS locations
             FROM public.mini_websites'
  LOOP
    position_index := 0;
    FOR entry IN SELECT * FROM jsonb_array_elements(COALESCE(legacy.sections, '[]'::jsonb)) LOOP
      INSERT INTO public.mini_website_sections (mini_website_id, section_key, enabled, position)
      VALUES (
        legacy.id,
        left(COALESCE(entry->>'key', ''), 40),
        COALESCE((entry->>'enabled')::boolean, true),
        position_index
      )
      ON CONFLICT (mini_website_id, section_key) DO NOTHING;
      position_index := position_index + 1;
    END LOOP;

    position_index := 0;
    FOR entry IN SELECT * FROM jsonb_array_elements(COALESCE(legacy.social_links, '[]'::jsonb)) LOOP
      INSERT INTO public.mini_website_social_links (
        mini_website_id, link_key, platform, url, value, country_code,
        display_name, custom_color, custom_icon, enabled, position
      )
      VALUES (
        legacy.id,
        left(COALESCE(NULLIF(entry->>'id', ''), 'link-' || position_index), 120),
        left(COALESCE(entry->>'platform', ''), 30),
        left(COALESCE(entry->>'url', ''), 2048),
        left(COALESCE(entry->>'value', ''), 500),
        left(COALESCE(NULLIF(entry->>'countryCode', ''), '964'), 4),
        left(COALESCE(entry->>'displayName', ''), 80),
        left(COALESCE(entry->>'customColor', ''), 200),
        left(COALESCE(entry->>'customIcon', ''), 2048),
        COALESCE((entry->>'enabled')::boolean, true),
        position_index
      )
      ON CONFLICT (mini_website_id, link_key) DO NOTHING;
      position_index := position_index + 1;
    END LOOP;

    -- Branches carry no natural key to conflict on, so a page that already has
    -- them is left alone rather than gaining a second copy.
    IF NOT EXISTS (
      SELECT 1 FROM public.mini_website_locations WHERE mini_website_id = legacy.id
    ) THEN
      position_index := 0;
      FOR entry IN SELECT * FROM jsonb_array_elements(legacy.locations) LOOP
        lat_value := NULL;
        lng_value := NULL;
        IF (entry->>'lat') ~ '^-?[0-9]+(\.[0-9]+)?$'
           AND (entry->>'lng') ~ '^-?[0-9]+(\.[0-9]+)?$'
           AND abs((entry->>'lat')::double precision) <= 90
           AND abs((entry->>'lng')::double precision) <= 180 THEN
          lat_value := (entry->>'lat')::double precision;
          lng_value := (entry->>'lng')::double precision;
        END IF;

        INSERT INTO public.mini_website_locations (
          mini_website_id, position, name, phone, phone_country_code, address, area, city,
          lat, lng, precision, radius_meters, zoom, map_url, image
        )
        VALUES (
          legacy.id,
          position_index,
          left(COALESCE(entry->>'name', ''), 120),
          left(COALESCE(entry->>'phone', ''), 20),
          left(COALESCE(NULLIF(entry->>'phoneCountryCode', ''), '964'), 4),
          left(COALESCE(entry->>'address', ''), 300),
          left(COALESCE(entry->>'area', ''), 120),
          left(COALESCE(entry->>'city', ''), 120),
          lat_value,
          lng_value,
          CASE WHEN entry->>'precision' = 'approximate' THEN 'approximate' ELSE 'exact' END,
          least(20000, greatest(100, COALESCE((entry->>'radiusMeters')::integer, 500))),
          least(20, greatest(1, COALESCE((entry->>'zoom')::double precision, 14))),
          left(COALESCE(entry->>'mapUrl', ''), 2048),
          left(COALESCE(entry->>'image', ''), 2048)
        );

        -- Hours once lived inside each branch. The primary branch's week
        -- becomes the page's, and the rest are dropped rather than merged into
        -- something the business never entered.
        IF position_index = 0 THEN
          FOR day_entry IN SELECT * FROM jsonb_array_elements(COALESCE(entry->'hours', '[]'::jsonb)) LOOP
            INSERT INTO public.mini_website_hours (mini_website_id, day, closed, open_time, close_time)
            VALUES (
              legacy.id,
              CASE day_entry->>'day'
                WHEN 'sun' THEN 0 WHEN 'mon' THEN 1 WHEN 'tue' THEN 2 WHEN 'wed' THEN 3
                WHEN 'thu' THEN 4 WHEN 'fri' THEN 5 ELSE 6 END,
              COALESCE((day_entry->>'closed')::boolean, false),
              COALESCE(NULLIF(day_entry->>'open', '')::time, '09:00'::time),
              COALESCE(NULLIF(day_entry->>'close', '')::time, '18:00'::time)
            )
            ON CONFLICT (mini_website_id, day) DO NOTHING;
          END LOOP;
        END IF;

        position_index := position_index + 1;
      END LOOP;
    END IF;
  END LOOP;
END
$mini_content_migration$;

-- Hours were briefly stored per branch. The primary branch's week moves to
-- the page and the old table goes; skipped once the table is gone.
DO $mini_hours_migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'mini_website_location_hours'
  ) THEN
    RETURN;
  END IF;

  EXECUTE '
    INSERT INTO public.mini_website_hours (mini_website_id, day, closed, open_time, close_time)
    SELECT place.mini_website_id, hour.day, hour.closed, hour.open_time, hour.close_time
      FROM public.mini_website_location_hours hour
      JOIN public.mini_website_locations place ON place.id = hour.location_id
     WHERE place.position = 0
    ON CONFLICT (mini_website_id, day) DO NOTHING';

  DROP TABLE public.mini_website_location_hours;
END
$mini_hours_migration$;

ALTER TABLE public.mini_websites DROP COLUMN IF EXISTS sections;
ALTER TABLE public.mini_websites DROP COLUMN IF EXISTS social_links;
ALTER TABLE public.mini_websites DROP COLUMN IF EXISTS location;
ALTER TABLE public.mini_websites DROP COLUMN IF EXISTS locations;
-- MINI WEBSITE CONTENT END

CREATE TABLE IF NOT EXISTS public.mini_website_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mini_website_id, version)
);



CREATE INDEX IF NOT EXISTS idx_mini_websites_business_status ON public.mini_websites(business_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mini_websites_public_slug ON public.mini_websites(business_id, slug) WHERE status = 'published';

DROP TRIGGER IF EXISTS trg_mini_websites_updated_at ON public.mini_websites;
CREATE TRIGGER trg_mini_websites_updated_at BEFORE UPDATE ON public.mini_websites FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
-- MINI WEBSITE SCHEMA END

-- ADVERTISING SERVICE SCHEMA BEGIN
-- One TikTok sponsorship-service page per business, served at /advertising on
-- the business subdomain and edited from the dashboard's Ads tab.
--
-- Content is relational for the same reasons the mini website content is: an
-- id to hang analytics on, ordering that changes without rewriting an array,
-- and colours and prices the database can constrain. The single jsonb here is
-- the published version snapshot, which is read whole or not at all.
--
-- This block precedes the unified public-page block because public_pages
-- references advertising_pages.

CREATE TABLE IF NOT EXISTS public.advertising_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One per business. The route is fixed, so unlike a linktree or a mini
  -- website there is nothing for a second row to disambiguate.
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','paused','archived')),
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),

  -- Hero.
  title varchar(90) NOT NULL DEFAULT '',
  description varchar(280) NOT NULL DEFAULT '',

  -- Closing call to action.
  closing_cta_title varchar(90) NOT NULL DEFAULT '',
  closing_cta_description varchar(160) NOT NULL DEFAULT '',
  closing_cta_button_label varchar(40) NOT NULL DEFAULT '',
  -- One full international number, digits only, which is what the editor's
  -- single field collects. Deliberately not split into number + dialling code
  -- like mini_website_social_links: that split exists because that editor has
  -- a separate country picker, and this one does not. The service strips
  -- everything that is not a digit before storing, so a pasted
  -- "+964 750 111 2222" is normalized rather than rejected, and the server
  -- builds the wa.me destination so the button cannot publish another scheme.
  whatsapp_number varchar(20) NOT NULL DEFAULT ''
    CHECK (whatsapp_number ~ '^[0-9]*$'),

  -- The code-extraction video, shared by journey step 5 and the standalone
  -- /advertising/video-code page. Referenced by URL rather than uploaded:
  -- platform_media_settings allows only jpeg/png/ico, so the platform has no
  -- video ingest path. Same treatment as mini_websites.hero_video_url.
  video_url varchar(2048) NOT NULL DEFAULT '',
  video_tutorial_title varchar(90) NOT NULL DEFAULT '',
  -- Ordered plain strings with no identity of their own, the same shape as
  -- mini_website_items.options. A table of one text column would buy nothing.
  tutorial_steps text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (cardinality(tutorial_steps) <= 20),

  -- Optional replacement for the bundled receipt screenshot in journey step 4.
  receipt_example_image_url varchar(2048) NOT NULL DEFAULT '',

  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Which sections the public page shows, and in what order. Mirrors
-- mini_website_sections.
CREATE TABLE IF NOT EXISTS public.advertising_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  section_key varchar(40) NOT NULL CHECK (section_key IN
    ('hero','journey','results','packages','testimonials','faq','closing_cta')),
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A page cannot list the same section twice.
  UNIQUE (advertising_page_id, section_key)
);

-- A group of price tiers, such as "personal" or "business". The editor can add
-- and rename these, so the label cannot double as identity.
CREATE TABLE IF NOT EXISTS public.advertising_package_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  -- The editor's own key: the seeded 'personal'/'business', or a generated
  -- value, kept across a save so tiers and tracked selections stay attached
  -- when the list is reordered.
  category_key varchar(120) NOT NULL,
  label varchar(30) NOT NULL DEFAULT '',
  -- A preset name or an explicit hex; the shared colour picker produces both.
  -- Constrained the same way as mini_websites.accent_color.
  color varchar(20) NOT NULL DEFAULT 'lime'
    CHECK (color ~ '^(#[0-9A-Fa-f]{6}|lime|violet|amber|cyan|rose|blue|fuchsia|emerald)$'),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, category_key)
);

CREATE TABLE IF NOT EXISTS public.advertising_package_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Cascades from the category: deleting a category deletes its prices, which
  -- is what the editor already does when it drops that category's tier list.
  category_id uuid NOT NULL REFERENCES public.advertising_package_categories(id) ON DELETE CASCADE,
  tier_key varchar(120) NOT NULL,
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  -- Free text, not a number: businesses write "10K-20K" as often as "15000".
  views_label varchar(40) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, tier_key)
);

-- Before/after showcase cards.
CREATE TABLE IF NOT EXISTS public.advertising_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  item_key varchar(120) NOT NULL,
  category varchar(40) NOT NULL DEFAULT '',
  -- View counts as written, e.g. "4.1K": a display string, not a metric.
  before_label varchar(12) NOT NULL DEFAULT '',
  after_label varchar(12) NOT NULL DEFAULT '',
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  color varchar(20) NOT NULL DEFAULT 'rose' CHECK (color IN
    ('rose','indigo','amber','emerald','sky','violet','orange','cyan')),
  before_image_url varchar(2048) NOT NULL DEFAULT '',
  after_image_url varchar(2048) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.advertising_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  item_key varchar(120) NOT NULL,
  name varchar(40) NOT NULL DEFAULT '',
  role varchar(40) NOT NULL DEFAULT '',
  quote varchar(280) NOT NULL DEFAULT '',
  color varchar(20) NOT NULL DEFAULT 'orange' CHECK (color IN
    ('orange','rose','emerald','violet','sky','amber','cyan','fuchsia')),
  avatar_url varchar(2048) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.advertising_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  item_key varchar(120) NOT NULL,
  question varchar(140) NOT NULL DEFAULT '',
  answer varchar(500) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, item_key)
);

-- Where the customer sends payment, shown in the guide's payment step.
CREATE TABLE IF NOT EXISTS public.advertising_payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  provider_key varchar(120) NOT NULL,
  -- Free text: catalog names (FIB, FastPay, ...) resolve a bundled logo on the
  -- client, anything else renders with the uploaded logo_url or none.
  name varchar(30) NOT NULL DEFAULT '',
  phone varchar(30) NOT NULL DEFAULT '',
  logo_url varchar(2048) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, provider_key)
);

-- An immutable snapshot of everything above, written on publish. Matches
-- mini_website_versions.
CREATE TABLE IF NOT EXISTS public.advertising_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, version)
);

CREATE INDEX IF NOT EXISTS idx_advertising_sections_page
  ON public.advertising_sections(advertising_page_id, position);
CREATE INDEX IF NOT EXISTS idx_advertising_categories_page
  ON public.advertising_package_categories(advertising_page_id, position);
CREATE INDEX IF NOT EXISTS idx_advertising_tiers_category
  ON public.advertising_package_tiers(category_id, position);
CREATE INDEX IF NOT EXISTS idx_advertising_results_page
  ON public.advertising_results(advertising_page_id, position);
CREATE INDEX IF NOT EXISTS idx_advertising_testimonials_page
  ON public.advertising_testimonials(advertising_page_id, position);
CREATE INDEX IF NOT EXISTS idx_advertising_faqs_page
  ON public.advertising_faqs(advertising_page_id, position);
CREATE INDEX IF NOT EXISTS idx_advertising_providers_page
  ON public.advertising_payment_providers(advertising_page_id, position);

DROP TRIGGER IF EXISTS trg_advertising_pages_updated_at ON public.advertising_pages;
CREATE TRIGGER trg_advertising_pages_updated_at BEFORE UPDATE ON public.advertising_pages FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_sections_updated_at ON public.advertising_sections;
CREATE TRIGGER trg_advertising_sections_updated_at BEFORE UPDATE ON public.advertising_sections FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_categories_updated_at ON public.advertising_package_categories;
CREATE TRIGGER trg_advertising_categories_updated_at BEFORE UPDATE ON public.advertising_package_categories FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_tiers_updated_at ON public.advertising_package_tiers;
CREATE TRIGGER trg_advertising_tiers_updated_at BEFORE UPDATE ON public.advertising_package_tiers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_results_updated_at ON public.advertising_results;
CREATE TRIGGER trg_advertising_results_updated_at BEFORE UPDATE ON public.advertising_results FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_testimonials_updated_at ON public.advertising_testimonials;
CREATE TRIGGER trg_advertising_testimonials_updated_at BEFORE UPDATE ON public.advertising_testimonials FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_faqs_updated_at ON public.advertising_faqs;
CREATE TRIGGER trg_advertising_faqs_updated_at BEFORE UPDATE ON public.advertising_faqs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_advertising_providers_updated_at ON public.advertising_payment_providers;
CREATE TRIGGER trg_advertising_providers_updated_at BEFORE UPDATE ON public.advertising_payment_providers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
-- ADVERTISING SERVICE SCHEMA END

-- UNIFIED PUBLIC PAGE + ANALYTICS SCHEMA BEGIN
-- Linktrees and Mini Websites keep their specialized content models, but both
-- receive one canonical public-page identity and use the same action, visitor,
-- session, event, CRM, aggregation, and marketing-delivery pipeline.

CREATE TABLE public.public_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  page_type varchar(20) NOT NULL CHECK (page_type IN ('linktree','mini_website','advertising')),
  source_linktree_id uuid UNIQUE REFERENCES public.linktrees(id) ON DELETE CASCADE,
  source_mini_website_id uuid UNIQUE REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  -- The advertising page is a per-business singleton at a fixed route, but it
  -- takes a public_pages identity like the others so its conversions reach the
  -- same action, visitor, session, event, CRM and marketing pipeline. Its slug
  -- is the literal 'advertising'; nothing routes by it.
  source_advertising_page_id uuid UNIQUE REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 255),
  slug varchar(255) NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','archived')),
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Baghdad',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  theme_config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(theme_config) = 'object'),
  seo_config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(seo_config) = 'object'),
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Exactly one source id is set, and it is the one matching page_type.
  CHECK (
    (page_type = 'linktree' AND source_linktree_id IS NOT NULL
      AND source_mini_website_id IS NULL AND source_advertising_page_id IS NULL)
    OR
    (page_type = 'mini_website' AND source_mini_website_id IS NOT NULL
      AND source_linktree_id IS NULL AND source_advertising_page_id IS NULL)
    OR
    (page_type = 'advertising' AND source_advertising_page_id IS NOT NULL
      AND source_linktree_id IS NULL AND source_mini_website_id IS NULL)
  ),
  UNIQUE (business_id, page_type, slug)
);

-- Retains only the minimum routing identity needed to distinguish a URL that
-- was permanently removed (410) from one that never existed (404). Deleted
-- page content and analytics are not retained here.
CREATE TABLE public.public_page_tombstones (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  page_type varchar(20) NOT NULL CHECK (page_type IN ('linktree','mini_website','advertising')),
  public_identifier varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, page_type, public_identifier)
);

CREATE INDEX idx_public_page_tombstones_slug
  ON public.public_page_tombstones(business_id, page_type, slug);

CREATE TABLE public.public_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (public_page_id, version)
);

CREATE TABLE public.public_page_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  source_link_id uuid UNIQUE REFERENCES public.links(id) ON DELETE SET NULL,
  action_key varchar(120) NOT NULL,
  action_type varchar(40) NOT NULL CHECK (action_type IN (
    'link','whatsapp','call','email','social','form','booking',
    'product','service','checkout','purchase','download','custom'
  )),
  label varchar(255) NOT NULL DEFAULT '',
  destination text,
  tiktok_event varchar(40) NOT NULL DEFAULT 'ClickButton' CHECK (tiktok_event IN (
    'ClickButton','Contact','SubmitForm','Lead','InitiateCheckout','CompletePayment','Download'
  )),
  display_order smallint NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (public_page_id, action_key)
);

CREATE TABLE public.analytics_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_key_hmac char(64) NOT NULL,
  first_public_page_id uuid REFERENCES public.public_pages(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  consent_state varchar(20) NOT NULL DEFAULT 'unknown' CHECK (consent_state IN ('unknown','granted','denied')),
  first_attribution jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(first_attribution) = 'object'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (business_id, visitor_key_hmac)
);

CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
  session_key_hmac char(64) NOT NULL,
  landing_public_page_id uuid REFERENCES public.public_pages(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL,
  ended_at timestamptz,
  landing_url text,
  referrer text,
  referrer_host varchar(255),
  utm_source varchar(255),
  utm_medium varchar(255),
  utm_campaign varchar(255),
  utm_content varchar(255),
  utm_term varchar(255),
  ttclid varchar(255),
  ttp varchar(255),
  channel varchar(30) CONSTRAINT chk_analytics_sessions_channel CHECK (
    channel IS NULL OR channel IN (
      'tiktok_paid','tiktok_organic','instagram','facebook','snapchat','youtube',
      'search','direct','referral','email','sms','qr','other'
    )
  ),
  device_type varchar(30),
  browser varchar(80),
  operating_system varchar(80),
  country_code char(2),
  region varchar(120),
  city varchar(120),
  engagement_seconds integer NOT NULL DEFAULT 0 CHECK (engagement_seconds >= 0),
  event_count integer NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  is_bot boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, session_key_hmac)
);

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  public_page_action_id uuid REFERENCES public.public_page_actions(id) ON DELETE SET NULL,
  visitor_id uuid NOT NULL REFERENCES public.analytics_visitors(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  event_name varchar(40) NOT NULL CONSTRAINT chk_analytics_events_event_name CHECK (event_name IN (
    'page_view','engaged_view','button_click','whatsapp_click','call_click',
    'email_click','social_click','product_click','service_click','form_submit',
    'lead_created','booking_started','checkout_started','order_completed','download',
    'action_open','form_view','share','custom'
  )),
  source varchar(20) NOT NULL DEFAULT 'browser' CHECK (source IN ('browser','server','api','import')),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  page_url text,
  referrer text,
  ip_address inet,
  ip_hmac char(64),
  user_agent text,
  device_type varchar(30),
  browser varchar(80),
  operating_system varchar(80),
  country_code char(2),
  region varchar(120),
  city varchar(120),
  utm_source varchar(255),
  utm_medium varchar(255),
  utm_campaign varchar(255),
  utm_content varchar(255),
  utm_term varchar(255),
  ttclid varchar(255),
  ttp varchar(255),
  channel varchar(30) CONSTRAINT chk_analytics_events_channel CHECK (
    channel IS NULL OR channel IN (
      'tiktok_paid','tiktok_organic','instagram','facebook','snapchat','youtube',
      'search','direct','referral','email','sms','qr','other'
    )
  ),
  is_conversion boolean NOT NULL DEFAULT false,
  conversion_value numeric(16,2) CHECK (conversion_value IS NULL OR conversion_value >= 0),
  currency char(3),
  is_bot boolean NOT NULL DEFAULT false,
  consent_state varchar(20) NOT NULL DEFAULT 'unknown' CHECK (consent_state IN ('unknown','granted','denied')),
  action_label_snapshot varchar(255),
  action_type_snapshot varchar(40),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(properties) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-page daily rollup. Views/clicks are raw, additive counts. new_visitors/
-- new_clickers mark only a visitor's first-ever event on this page, credited
-- to the single day it happened - a "new visitor acquisition" trend metric,
-- not a per-day dedup. Genuine "how many unique people were active in this
-- range" numbers are computed live from analytics_events (COUNT(DISTINCT)),
-- not from this table - see getSummary/getPages in the analytics services.
CREATE TABLE public.analytics_page_daily (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  day date NOT NULL,
  timezone varchar(64) NOT NULL,
  total_views bigint NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  new_visitors bigint NOT NULL DEFAULT 0 CHECK (new_visitors >= 0),
  total_clicks bigint NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
  new_clickers bigint NOT NULL DEFAULT 0 CHECK (new_clickers >= 0),
  conversions bigint NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  conversion_value numeric(18,2) NOT NULL DEFAULT 0 CHECK (conversion_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (public_page_id, day, timezone)
);

-- Per-action daily rollup. Same new_clickers convention as analytics_page_daily.
CREATE TABLE public.analytics_action_daily (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  public_page_action_id uuid NOT NULL REFERENCES public.public_page_actions(id) ON DELETE CASCADE,
  day date NOT NULL,
  timezone varchar(64) NOT NULL,
  total_clicks bigint NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
  new_clickers bigint NOT NULL DEFAULT 0 CHECK (new_clickers >= 0),
  conversions bigint NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  conversion_value numeric(18,2) NOT NULL DEFAULT 0 CHECK (conversion_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (public_page_action_id, day, timezone)
);

-- Generic per-dimension daily rollup: views/clicks/uniques/conversions by
-- channel, source, referrer_host, utm_source, utm_campaign, country, region,
-- city, device, browser, os, language - and any future dimension without DDL.
CREATE TABLE public.analytics_dimension_daily (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  day date NOT NULL,
  timezone varchar(64) NOT NULL,
  dimension varchar(30) NOT NULL,
  dimension_value varchar(160) NOT NULL,
  total_views bigint NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  unique_visitors bigint NOT NULL DEFAULT 0 CHECK (unique_visitors >= 0),
  total_clicks bigint NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
  unique_clickers bigint NOT NULL DEFAULT 0 CHECK (unique_clickers >= 0),
  conversions bigint NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  conversion_value numeric(18,2) NOT NULL DEFAULT 0 CHECK (conversion_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (public_page_id, day, timezone, dimension, dimension_value)
);

CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_id uuid REFERENCES public.analytics_visitors(id) ON DELETE SET NULL,
  encrypted_name bytea,
  encrypted_email bytea,
  encrypted_phone bytea,
  email_hmac char(64),
  phone_hmac char(64),
  country_code char(2),
  region varchar(120),
  city varchar(120),
  language varchar(16),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  ads_consent varchar(20) NOT NULL DEFAULT 'unknown' CONSTRAINT chk_crm_contacts_ads_consent CHECK (ads_consent IN ('unknown','granted','denied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_page_id uuid NOT NULL REFERENCES public.public_pages(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  visitor_id uuid REFERENCES public.analytics_visitors(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
  source_event_id uuid REFERENCES public.analytics_events(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','won','lost')),
  value numeric(16,2) CHECK (value IS NULL OR value >= 0),
  currency char(3),
  owner_business_user_id uuid,
  channel varchar(30),
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attribution) = 'object'),
  score smallint CONSTRAINT chk_crm_leads_score CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  from_status varchar(20),
  to_status varchar(20) NOT NULL CHECK (to_status IN ('new','contacted','qualified','won','lost')),
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  analytics_event_id uuid REFERENCES public.analytics_events(id) ON DELETE SET NULL,
  event_type varchar(40) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  encrypted_body bytea NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  color varchar(7) NOT NULL DEFAULT '#b6f20d' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);

CREATE TABLE public.crm_lead_tags (
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- TikTok Ads custom-audience export tracking. PII is hashed (SHA-256, TikTok
-- format) at export time from the encrypted contact columns; nothing plain is
-- stored here. Members make incremental re-syncs idempotent and auditable.
CREATE TABLE public.crm_audience_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  public_page_id uuid REFERENCES public.public_pages(id) ON DELETE SET NULL,
  provider varchar(30) NOT NULL DEFAULT 'tiktok' CHECK (provider IN ('tiktok')),
  audience_name varchar(255) NOT NULL,
  external_audience_id varchar(255),
  filter jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filter) = 'object'),
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','exporting','completed','failed')),
  member_count integer NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  last_error varchar(500),
  last_exported_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_audience_export_members (
  export_id uuid NOT NULL REFERENCES public.crm_audience_exports(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  exported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (export_id, contact_id)
);

CREATE TABLE public.marketing_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_event_id uuid NOT NULL REFERENCES public.analytics_events(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES public.business_tiktok_pixels(id) ON DELETE CASCADE,
  provider varchar(30) NOT NULL DEFAULT 'tiktok' CHECK (provider IN ('tiktok')),
  event_name varchar(40) NOT NULL,
  external_event_id uuid NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  browser_dispatched boolean NOT NULL DEFAULT false,
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','processing','delivered','retry_scheduled','failed_permanently','cancelled'
  )),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analytics_event_id, destination_id)
);

CREATE TABLE public.marketing_delivery_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outbox_id uuid NOT NULL REFERENCES public.marketing_event_outbox(id) ON DELETE CASCADE,
  attempt_number smallint NOT NULL CHECK (attempt_number > 0),
  outcome varchar(20) NOT NULL CHECK (outcome IN ('success','retry','failure')),
  status_code smallint CHECK (status_code IS NULL OR status_code BETWEEN 100 AND 599),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  provider_request_id varchar(255),
  response_summary varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outbox_id, attempt_number)
);

CREATE INDEX idx_public_pages_business_type_status ON public.public_pages(business_id, page_type, status, updated_at DESC);
CREATE INDEX idx_public_pages_public_slug ON public.public_pages(business_id, page_type, slug) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_public_actions_page_order ON public.public_page_actions(public_page_id, status, display_order);
CREATE INDEX idx_analytics_visitors_business_seen ON public.analytics_visitors(business_id, last_seen_at DESC);
CREATE INDEX idx_analytics_sessions_business_time ON public.analytics_sessions(business_id, started_at DESC);
CREATE INDEX idx_analytics_sessions_page_time ON public.analytics_sessions(landing_public_page_id, started_at DESC);
CREATE INDEX idx_analytics_events_business_time ON public.analytics_events(business_id, occurred_at DESC, id DESC);
CREATE INDEX idx_analytics_events_page_time ON public.analytics_events(public_page_id, occurred_at DESC, id DESC);
CREATE INDEX idx_analytics_events_action_time ON public.analytics_events(public_page_action_id, occurred_at DESC) WHERE public_page_action_id IS NOT NULL;
CREATE INDEX idx_analytics_events_session_time ON public.analytics_events(session_id, occurred_at, id);
CREATE INDEX idx_analytics_events_visitor_time ON public.analytics_events(visitor_id, occurred_at DESC);
CREATE INDEX idx_analytics_events_name_time ON public.analytics_events(event_name, occurred_at DESC);
CREATE INDEX idx_analytics_events_conversion_time ON public.analytics_events(business_id, occurred_at DESC) WHERE is_conversion = true;
-- Backs the "is this visitor's first-ever view/click on this page/action"
-- check in unified-analytics.service.ts:updateRollups, which searches a
-- visitor's whole history rather than just today's events.
CREATE INDEX idx_analytics_events_page_visitor_name ON public.analytics_events(public_page_id, visitor_id, event_name);
CREATE INDEX idx_analytics_events_action_visitor_name ON public.analytics_events(public_page_action_id, visitor_id, event_name) WHERE public_page_action_id IS NOT NULL;
CREATE INDEX idx_analytics_page_daily_business_day ON public.analytics_page_daily(business_id, day DESC);
CREATE INDEX idx_analytics_action_daily_page_day ON public.analytics_action_daily(public_page_id, day DESC);
CREATE INDEX idx_crm_leads_page_status_time ON public.crm_leads(public_page_id, status, created_at DESC);
CREATE INDEX idx_crm_leads_business_time ON public.crm_leads(business_id, created_at DESC);
CREATE UNIQUE INDEX uq_crm_leads_source_event ON public.crm_leads(source_event_id) WHERE source_event_id IS NOT NULL;
CREATE UNIQUE INDEX uq_crm_contacts_business_email ON public.crm_contacts(business_id, email_hmac) WHERE email_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_crm_contacts_business_phone ON public.crm_contacts(business_id, phone_hmac) WHERE phone_hmac IS NOT NULL;
CREATE UNIQUE INDEX uq_crm_contacts_business_visitor ON public.crm_contacts(business_id, visitor_id) WHERE visitor_id IS NOT NULL;
CREATE UNIQUE INDEX uq_crm_leads_business_page_visitor ON public.crm_leads(business_id, public_page_id, visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX idx_marketing_outbox_ready ON public.marketing_event_outbox(status, next_attempt_at, created_at)
  WHERE status IN ('pending','retry_scheduled');
CREATE INDEX idx_marketing_outbox_business_time ON public.marketing_event_outbox(business_id, created_at DESC);
CREATE INDEX idx_marketing_attempts_outbox_time ON public.marketing_delivery_attempts(outbox_id, created_at DESC);
CREATE INDEX idx_analytics_sessions_channel_time ON public.analytics_sessions(business_id, channel, started_at DESC) WHERE channel IS NOT NULL;
CREATE INDEX idx_analytics_events_channel_time ON public.analytics_events(business_id, channel, occurred_at DESC) WHERE channel IS NOT NULL;
CREATE INDEX idx_analytics_dimension_daily_business ON public.analytics_dimension_daily(business_id, dimension, day DESC);
CREATE INDEX idx_crm_leads_business_channel ON public.crm_leads(business_id, channel, created_at DESC) WHERE channel IS NOT NULL;
CREATE INDEX idx_crm_contacts_business_country ON public.crm_contacts(business_id, country_code) WHERE country_code IS NOT NULL;
CREATE INDEX idx_crm_audience_exports_business ON public.crm_audience_exports(business_id, created_at DESC);
CREATE INDEX idx_crm_audience_exports_page ON public.crm_audience_exports(public_page_id) WHERE public_page_id IS NOT NULL;
CREATE INDEX idx_crm_audience_export_members_contact ON public.crm_audience_export_members(contact_id);
CREATE INDEX idx_crm_audience_export_members_lead ON public.crm_audience_export_members(lead_id) WHERE lead_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_sync_linktree_public_page() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_pages WHERE source_linktree_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.public_pages (
    business_id, page_type, source_linktree_id, name, slug, status,
    current_version, theme_config, seo_config, published_at
  ) VALUES (
    NEW.business_id, 'linktree', NEW.id, NEW.name, NEW.seo_name,
    CASE WHEN NEW.status = 'active' THEN 'published' ELSE 'paused' END,
    1, COALESCE(NEW.template_config, '{}'::jsonb),
    jsonb_build_object('seo_name', NEW.seo_name),
    CASE WHEN NEW.status = 'active' THEN COALESCE(NEW.updated_at, now()) ELSE NULL END
  )
  ON CONFLICT (source_linktree_id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    status = EXCLUDED.status,
    theme_config = EXCLUDED.theme_config,
    seo_config = EXCLUDED.seo_config,
    published_at = COALESCE(public.public_pages.published_at, EXCLUDED.published_at),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_mini_public_page() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_pages WHERE source_mini_website_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.public_pages (
    business_id, page_type, source_mini_website_id, name, slug, status,
    current_version, theme_config, published_at
  ) VALUES (
    NEW.business_id, 'mini_website', NEW.id, NEW.name, NEW.slug, NEW.status,
    NEW.current_version,
    jsonb_build_object(
      'variation', NEW.variation,
      'background_style', NEW.background_style,
      'accent_color', NEW.accent_color
    ),
    NEW.published_at
  )
  ON CONFLICT (source_mini_website_id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    status = EXCLUDED.status,
    current_version = EXCLUDED.current_version,
    theme_config = EXCLUDED.theme_config,
    published_at = EXCLUDED.published_at,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_advertising_public_page() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_pages WHERE source_advertising_page_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO public.public_pages (
    business_id, page_type, source_advertising_page_id, name, slug, status,
    current_version, published_at
  ) VALUES (
    NEW.business_id, 'advertising', NEW.id, 'Advertising', 'advertising',
    NEW.status, NEW.current_version, NEW.published_at
  )
  ON CONFLICT (source_advertising_page_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_version = EXCLUDED.current_version,
    published_at = EXCLUDED.published_at,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_link_public_action() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_page_id uuid;
  v_type varchar(40);
  v_tiktok varchar(40);
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.public_page_actions
       SET source_link_id = NULL, status = 'archived', updated_at = now()
     WHERE source_link_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT id INTO v_page_id
  FROM public.public_pages
  WHERE source_linktree_id = NEW.linktree_id;

  IF v_page_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_type := CASE lower(NEW.platform)
    WHEN 'whatsapp' THEN 'whatsapp'
    WHEN 'phone' THEN 'call'
    WHEN 'email' THEN 'email'
    WHEN 'facebook' THEN 'social'
    WHEN 'instagram' THEN 'social'
    WHEN 'tiktok' THEN 'social'
    WHEN 'youtube' THEN 'social'
    ELSE 'link'
  END;
  v_tiktok := CASE
    WHEN lower(NEW.platform) IN ('whatsapp','telegram','viber','phone','email') THEN 'Contact'
    ELSE 'ClickButton'
  END;

  INSERT INTO public.public_page_actions (
    public_page_id, source_link_id, action_key, action_type, label,
    destination, tiktok_event, display_order, status, metadata
  ) VALUES (
    v_page_id, NEW.id, 'link:' || NEW.id::text, v_type,
    COALESCE(NULLIF(NEW.display_name, ''), NEW.platform), NEW.url,
    v_tiktok, NEW.display_order, 'active',
    jsonb_build_object('platform', NEW.platform)
  )
  ON CONFLICT (source_link_id) DO UPDATE SET
    public_page_id = EXCLUDED.public_page_id,
    action_type = EXCLUDED.action_type,
    label = EXCLUDED.label,
    destination = EXCLUDED.destination,
    tiktok_event = EXCLUDED.tiktok_event,
    display_order = EXCLUDED.display_order,
    status = 'active',
    metadata = EXCLUDED.metadata,
    updated_at = now();
  RETURN NEW;
END;
$$;

INSERT INTO public.public_pages (
  business_id, page_type, source_linktree_id, name, slug, status,
  theme_config, seo_config, published_at, created_at, updated_at
)
SELECT business_id, 'linktree', id, name, seo_name,
       CASE WHEN status = 'active' THEN 'published' ELSE 'paused' END,
       template_config, jsonb_build_object('seo_name', seo_name),
       CASE WHEN status = 'active' THEN updated_at ELSE NULL END,
       created_at, updated_at
FROM public.linktrees
ON CONFLICT (source_linktree_id) DO NOTHING;

INSERT INTO public.public_pages (
  business_id, page_type, source_mini_website_id, name, slug, status,
  current_version, theme_config, published_at, created_at, updated_at
)
SELECT business_id, 'mini_website', id, name, slug, status,
       current_version,
       jsonb_build_object(
         'variation', variation,
         'background_style', background_style,
         'accent_color', accent_color
       ),
       published_at, created_at, updated_at
FROM public.mini_websites
ON CONFLICT (source_mini_website_id) DO NOTHING;

INSERT INTO public.public_page_actions (
  public_page_id, source_link_id, action_key, action_type, label,
  destination, tiktok_event, display_order, metadata, created_at, updated_at
)
SELECT page.id, link.id, 'link:' || link.id::text,
       CASE lower(link.platform)
         WHEN 'whatsapp' THEN 'whatsapp'
         WHEN 'phone' THEN 'call'
         WHEN 'email' THEN 'email'
         WHEN 'facebook' THEN 'social'
         WHEN 'instagram' THEN 'social'
         WHEN 'tiktok' THEN 'social'
         WHEN 'youtube' THEN 'social'
         ELSE 'link'
       END,
       COALESCE(NULLIF(link.display_name, ''), link.platform),
       link.url,
       CASE WHEN lower(link.platform) IN ('whatsapp','telegram','viber','phone','email')
         THEN 'Contact' ELSE 'ClickButton' END,
       link.display_order,
       jsonb_build_object('platform', link.platform),
       link.created_at, link.updated_at
FROM public.links link
JOIN public.public_pages page ON page.source_linktree_id = link.linktree_id
ON CONFLICT (source_link_id) DO NOTHING;

CREATE TRIGGER trg_linktree_public_page_sync
AFTER INSERT OR UPDATE OR DELETE ON public.linktrees
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_linktree_public_page();

CREATE TRIGGER trg_mini_public_page_sync
AFTER INSERT OR UPDATE OR DELETE ON public.mini_websites
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_mini_public_page();

CREATE TRIGGER trg_advertising_public_page_sync
AFTER INSERT OR UPDATE OR DELETE ON public.advertising_pages
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_advertising_public_page();

CREATE TRIGGER trg_link_public_action_archive
BEFORE DELETE ON public.links
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_link_public_action();

CREATE TRIGGER trg_link_public_action_sync
AFTER INSERT OR UPDATE ON public.links
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_link_public_action();

CREATE TRIGGER trg_public_pages_updated_at
BEFORE UPDATE ON public.public_pages
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_public_actions_updated_at
BEFORE UPDATE ON public.public_page_actions
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_analytics_sessions_updated_at
BEFORE UPDATE ON public.analytics_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_crm_contacts_updated_at
BEFORE UPDATE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_crm_notes_updated_at
BEFORE UPDATE ON public.crm_notes
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_marketing_outbox_updated_at
BEFORE UPDATE ON public.marketing_event_outbox
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- The superseded analytics tables, their helper functions, and the
-- links.click_count column are no longer created by this baseline, so
-- there is nothing left to drop here. Databases that predate the unified
-- pipeline are baselined rather than replayed, so they never executed
-- this cutover either.

-- UNIFIED PUBLIC PAGE + ANALYTICS SCHEMA END

-- ============================================================================
-- PERFORMANCE AND SCALE BASELINE
-- Indexes for every foreign-key column that would otherwise be unindexed,
-- plus per-table storage tuning for high-churn event tables and hot-update
-- rollup/counter tables. Consolidated from 20260725_perf_scale_baseline.sql
-- and 20260726_analytics_crm_scale.sql.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_access_rules_created_by ON public.access_rules (created_by);
CREATE INDEX IF NOT EXISTS idx_billing_policy_audit_business ON public.billing_policy_audit_events (business_id);
CREATE INDEX IF NOT EXISTS idx_billing_policy_audit_plan_config ON public.billing_policy_audit_events (plan_configuration_id);
CREATE INDEX IF NOT EXISTS idx_billing_policy_audit_plan ON public.billing_policy_audit_events (plan_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_plan_config ON public.business_subscriptions (plan_configuration_id);
CREATE INDEX IF NOT EXISTS idx_permission_approvals_permission ON public.permission_approval_requests (permission_id);
CREATE INDEX IF NOT EXISTS idx_communication_announcements_created_by ON public.communication_announcements (created_by);
CREATE INDEX IF NOT EXISTS idx_communication_announcements_published_by ON public.communication_announcements (published_by);
CREATE INDEX IF NOT EXISTS idx_communication_conversations_assigned_admin ON public.communication_conversations (assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_sender_admin ON public.communication_messages (sender_admin_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_sender_business ON public.communication_messages (sender_business_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_created_by ON public.api_clients (created_by);
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_policies_updated_by ON public.api_rate_limit_policies (updated_by);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_business ON public.api_idempotency_keys (business_id);
CREATE INDEX IF NOT EXISTS idx_api_assets_created_by_client ON public.api_assets (created_by_client_id);
CREATE INDEX IF NOT EXISTS idx_api_webhook_endpoints_created_by ON public.api_webhook_endpoints (created_by);
CREATE INDEX IF NOT EXISTS idx_api_linktree_schedules_created_by_client ON public.api_linktree_schedules (created_by_client_id);
CREATE INDEX IF NOT EXISTS idx_api_linktree_schedules_business ON public.api_linktree_schedules (business_id);
CREATE INDEX IF NOT EXISTS idx_api_linktree_schedules_linktree ON public.api_linktree_schedules (linktree_id);
CREATE INDEX IF NOT EXISTS idx_platform_retention_settings_updated_by ON public.platform_data_retention_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_platform_retention_runs_triggered_by ON public.platform_data_retention_runs (triggered_by);
CREATE INDEX IF NOT EXISTS idx_platform_media_settings_updated_by ON public.platform_media_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_first_page ON public.analytics_visitors (first_public_page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON public.analytics_sessions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_action_daily_business ON public.analytics_action_daily (business_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_visitor ON public.crm_contacts (visitor_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON public.crm_leads (contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_visitor ON public.crm_leads (visitor_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_session ON public.crm_leads (session_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_status_history_lead ON public.crm_lead_status_history (lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_events_lead ON public.crm_lead_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_events_analytics_event ON public.crm_lead_events (analytics_event_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_lead ON public.crm_notes (lead_id);

-- High-churn event tables: default autovacuum triggers at 20% dead tuples;
-- trigger at 2-5% instead so retention deletes and delivery retries never
-- bloat the tables. Hot-update rollup/counter/session tables get
-- fillfactor < 100 so frequent UPSERTs stay HOT and avoid index churn.
DO $$
DECLARE
  churn_table text;
  hot_table text;
BEGIN
  FOREACH churn_table IN ARRAY ARRAY[
    'public.analytics_events', 'public.marketing_event_outbox',
    'public.api_webhook_deliveries'
  ] LOOP
    IF to_regclass(churn_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.02)', churn_table);
    END IF;
  END LOOP;

  IF to_regclass('public.http_request_events') IS NOT NULL THEN
    ALTER TABLE public.http_request_events SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01);
  END IF;

  FOREACH hot_table IN ARRAY ARRAY[
    'public.billing_usage_counters', 'public.http_request_event_daily_stats',
    'public.analytics_page_daily', 'public.analytics_action_daily',
    'public.analytics_dimension_daily', 'public.analytics_visitors',
    'public.analytics_sessions', 'public.business_sessions',
    'public.platform_admin_sessions'
  ] LOOP
    IF to_regclass(hot_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s SET (fillfactor = 90, autovacuum_vacuum_scale_factor = 0.05)', hot_table);
    END IF;
  END LOOP;
END $$;

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
