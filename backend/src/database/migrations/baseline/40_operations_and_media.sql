--
-- 40_operations_and_media.sql
--
-- Operational data retention and the platform-wide media policy and inventory.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- Platform-wide operational data retention. Active business data and aggregate
-- analytics are intentionally outside this policy.
CREATE TABLE public.platform_data_retention_settings (
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

CREATE TABLE public.platform_data_retention_runs (
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
CREATE UNIQUE INDEX uq_platform_retention_running ON public.platform_data_retention_runs ((status)) WHERE status = 'running';
CREATE INDEX idx_platform_retention_runs_started ON public.platform_data_retention_runs (started_at DESC);

-- Platform-wide media policy and inventory for all new uploads.
CREATE TABLE public.platform_media_settings (
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

CREATE TABLE public.uploaded_media_assets (
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
CREATE INDEX idx_uploaded_media_assets_created ON public.uploaded_media_assets(created_at);
CREATE INDEX idx_uploaded_media_assets_owner ON public.uploaded_media_assets(owner_business_id, created_at DESC);

