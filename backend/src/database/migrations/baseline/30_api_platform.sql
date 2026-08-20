--
-- 30_api_platform.sql
--
-- Developer API: clients, usage governance, idempotency, schedules, webhooks.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- Developer API, usage governance, idempotency, schedules, and durable webhooks.
CREATE TABLE public.api_clients (
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

CREATE TABLE public.api_rate_limit_policies (
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

CREATE TABLE public.api_usage_daily (
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  request_count bigint NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  success_count bigint NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  error_count bigint NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  PRIMARY KEY (usage_date, client_id)
);

CREATE TABLE public.api_idempotency_keys (
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

CREATE TABLE public.api_external_resource_mappings (
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

CREATE TABLE public.api_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  linktree_id uuid REFERENCES public.linktrees(id) ON DELETE CASCADE,
  asset_type varchar(40) NOT NULL,
  url text NOT NULL,
  created_by_client_id uuid REFERENCES public.api_clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.api_webhook_endpoints (
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

CREATE TABLE public.api_webhook_subscriptions (
  endpoint_id uuid NOT NULL REFERENCES public.api_webhook_endpoints(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (endpoint_id, event_type)
);

CREATE TABLE public.api_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type varchar(80) NOT NULL,
  resource_type varchar(40),
  resource_id uuid,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.api_webhook_deliveries (
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

CREATE TABLE public.api_webhook_delivery_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES public.api_webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number smallint NOT NULL,
  response_status smallint,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  error_message varchar(500),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (delivery_id, attempt_number)
);

CREATE TABLE public.api_versions (
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

CREATE TABLE public.api_catalog_groups (
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

CREATE TABLE public.api_linktree_schedules (
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

CREATE INDEX idx_api_clients_business_status ON public.api_clients(business_id, status, created_at DESC);
CREATE INDEX idx_api_clients_key_prefix ON public.api_clients(key_prefix) WHERE status = 'active';
CREATE INDEX idx_api_usage_business_date ON public.api_usage_daily(business_id, usage_date DESC);
CREATE INDEX idx_api_idempotency_expiry ON public.api_idempotency_keys(expires_at);
CREATE INDEX idx_api_external_resource ON public.api_external_resource_mappings(business_id, resource_type, resource_id);
CREATE INDEX idx_api_assets_business ON public.api_assets(business_id, linktree_id, created_at DESC);
CREATE INDEX idx_api_webhook_endpoints_business ON public.api_webhook_endpoints(business_id, status, created_at DESC);
CREATE INDEX idx_api_webhook_events_business ON public.api_webhook_events(business_id, occurred_at DESC);
CREATE INDEX idx_api_webhook_delivery_queue ON public.api_webhook_deliveries(status, next_attempt_at) WHERE status IN ('queued', 'retrying');
CREATE INDEX idx_api_webhook_delivery_endpoint ON public.api_webhook_deliveries(endpoint_id, created_at DESC);
CREATE INDEX idx_api_linktree_schedule_queue ON public.api_linktree_schedules(status, execute_at) WHERE status = 'scheduled';

INSERT INTO public.api_versions(version, status, released_at, retirement_at)
VALUES ('v1', 'current', '2026-07-20', NULL)
ON CONFLICT (version) DO NOTHING;
CREATE UNIQUE INDEX uq_api_versions_current ON public.api_versions(status) WHERE status='current';

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

