--
-- 70_public_pages_analytics.sql
--
-- The unified public page model and everything analytics and CRM hang off it.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- UNIFIED PUBLIC PAGE + ANALYTICS SCHEMA BEGIN
-- Linktrees and Mini Websites keep their specialized content models, but both
-- receive one canonical public-page identity and use the same action, visitor,
-- session, event, CRM, aggregation, and marketing-delivery pipeline.

CREATE TABLE public.public_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  page_type varchar(20) NOT NULL CONSTRAINT public_pages_page_type_check
    CHECK (page_type IN ('linktree','mini_website','advertising','route')),
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
  -- Specialized pages have exactly one matching source. Fixed routes have no source.
  CONSTRAINT public_pages_source_check CHECK (
    (page_type = 'linktree' AND source_linktree_id IS NOT NULL
      AND source_mini_website_id IS NULL AND source_advertising_page_id IS NULL)
    OR
    (page_type = 'mini_website' AND source_mini_website_id IS NOT NULL
      AND source_linktree_id IS NULL AND source_advertising_page_id IS NULL)
    OR
    (page_type = 'advertising' AND source_advertising_page_id IS NOT NULL
      AND source_linktree_id IS NULL AND source_mini_website_id IS NULL)
    OR
    (page_type = 'route' AND source_linktree_id IS NULL
      AND source_mini_website_id IS NULL AND source_advertising_page_id IS NULL)
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

-- Fixed root and business marketing routes share the public-page identity,
-- while Creator workspaces intentionally receive no fixed route rows.
CREATE OR REPLACE FUNCTION public.fn_seed_public_marketing_routes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_type = 'platform' THEN
    INSERT INTO public.public_pages
      (business_id, page_type, name, slug, status, published_at)
    VALUES
      (NEW.id, 'route', 'MultiTree Home', 'home', 'published', NOW()),
      (NEW.id, 'route', 'Join MultiTree', 'join', 'published', NOW()),
      (NEW.id, 'route', 'MultiTree Application', 'join-application', 'published', NOW())
    ON CONFLICT (business_id, page_type, slug) DO NOTHING;
  ELSIF NEW.account_type = 'business' THEN
    INSERT INTO public.public_pages
      (business_id, page_type, name, slug, status, published_at)
    VALUES
      (NEW.id, 'route', NEW.name || ' Home', 'home', 'published', NOW()),
      (NEW.id, 'route', 'Advertising Video Code', 'advertising-video-code', 'published', NOW())
    ON CONFLICT (business_id, page_type, slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_public_marketing_routes
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.fn_seed_public_marketing_routes();

-- The superseded analytics tables, their helper functions, and the
-- links.click_count column are no longer created by this baseline, so
-- there is nothing left to drop here. Databases that predate the unified
-- pipeline are baselined rather than replayed, so they never executed
-- this cutover either.

-- UNIFIED PUBLIC PAGE + ANALYTICS SCHEMA END
