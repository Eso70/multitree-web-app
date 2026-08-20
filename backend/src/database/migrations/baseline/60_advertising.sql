--
-- 60_advertising.sql
--
-- Advertising service pages, sections, packages and version history.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

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

CREATE TABLE public.advertising_pages (
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
CREATE TABLE public.advertising_sections (
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
CREATE TABLE public.advertising_package_categories (
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

CREATE TABLE public.advertising_package_tiers (
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
CREATE TABLE public.advertising_results (
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

CREATE TABLE public.advertising_testimonials (
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

CREATE TABLE public.advertising_faqs (
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
CREATE TABLE public.advertising_payment_providers (
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
CREATE TABLE public.advertising_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, version)
);

CREATE INDEX idx_advertising_sections_page
  ON public.advertising_sections(advertising_page_id, position);
CREATE INDEX idx_advertising_categories_page
  ON public.advertising_package_categories(advertising_page_id, position);
CREATE INDEX idx_advertising_tiers_category
  ON public.advertising_package_tiers(category_id, position);
CREATE INDEX idx_advertising_results_page
  ON public.advertising_results(advertising_page_id, position);
CREATE INDEX idx_advertising_testimonials_page
  ON public.advertising_testimonials(advertising_page_id, position);
CREATE INDEX idx_advertising_faqs_page
  ON public.advertising_faqs(advertising_page_id, position);
CREATE INDEX idx_advertising_providers_page
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

