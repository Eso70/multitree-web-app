--
-- 50_mini_websites.sql
--
-- Mini websites: the profile, its relational content, and version history.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- MINI WEBSITE SCHEMA BEGIN
-- Mini Website basic profile. Sections will be introduced incrementally later.
CREATE TABLE public.mini_websites (
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
  -- Liquid Glass is the only visual template, and therefore also the default.
  template_key varchar(50) NOT NULL DEFAULT 'liquid-glass'
    CONSTRAINT mini_websites_template_key_check CHECK (template_key IN ('liquid-glass')),
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

-- MINI WEBSITE CONTENT BEGIN
-- Page content is relational: one row per section, per link, per branch, per
-- day. It began as jsonb blobs on `mini_websites`, which read fast but left no
-- id to hang analytics on, no ordering that could change without rewriting an
-- array, and no constraint stopping a duplicate weekday or an impossible
-- coordinate. The migration at the end of this block moves the blobs across and
-- drops the columns.

-- Which sections a page shows, and in what order.
CREATE TABLE public.mini_website_sections (
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
CREATE TABLE public.mini_website_social_links (
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
CREATE TABLE public.mini_website_locations (
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
CREATE TABLE public.mini_website_hours (
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
CREATE TABLE public.mini_website_items (
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

CREATE UNIQUE INDEX uq_mini_items_key
  ON public.mini_website_items(mini_website_id, section_key, item_key)
  WHERE item_key <> '';

CREATE INDEX idx_mini_sections_website ON public.mini_website_sections(mini_website_id, position);
CREATE INDEX idx_mini_social_links_website ON public.mini_website_social_links(mini_website_id, position);
CREATE INDEX idx_mini_locations_website ON public.mini_website_locations(mini_website_id, position);
-- Answers "which branches sit inside this box" without reading every row.
CREATE INDEX idx_mini_locations_coordinates ON public.mini_website_locations(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX idx_mini_hours_website ON public.mini_website_hours(mini_website_id, day);
CREATE INDEX idx_mini_items_section ON public.mini_website_items(mini_website_id, section_key, position);

-- Per-page lead form settings. One row per mini website, so the form's wording
-- lives with the page rather than being repeated on every question row.
--
-- Submissions are deliberately absent: they flow through the analytics ingest
-- into `crm_contacts` and `crm_leads`, where name, email and phone are encrypted
-- at rest and hashed for de-duplication. A second, plaintext copy of the same
-- details sitting beside the page definition would undo all of that.
CREATE TABLE public.mini_website_lead_forms (
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

-- MINI WEBSITE CONTENT END

CREATE TABLE public.mini_website_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_website_id uuid NOT NULL REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mini_website_id, version)
);



CREATE INDEX idx_mini_websites_business_status ON public.mini_websites(business_id, status, updated_at DESC);
CREATE INDEX idx_mini_websites_public_slug ON public.mini_websites(business_id, slug) WHERE status = 'published';

DROP TRIGGER IF EXISTS trg_mini_websites_updated_at ON public.mini_websites;
CREATE TRIGGER trg_mini_websites_updated_at BEFORE UPDATE ON public.mini_websites FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
-- MINI WEBSITE SCHEMA END

