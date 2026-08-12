# Advertising Service

The advertising service is a per-business TikTok sponsorship page. A business
edits it from the **Ads** tab of the Business Dashboard
(`AdvertisingServicePage.tsx`); visitors read it at `/advertising` and
`/advertising/video-code` on that business's subdomain.

**Status: implemented.** The schema, the `backend/src/advertising/` module, and
the frontend wiring are in place; the "Current state" section below describes
what this replaced, not what runs today. It follows
[docs/architecture.md](architecture.md), [docs/database.md](database.md),
[docs/api-standards.md](api-standards.md), and [docs/security.md](security.md);
where a decision could have gone either way, the reasoning is recorded here
rather than left to be rediscovered.

---

## What this replaced

Before this work the feature was entirely client-side. `AdvertisingServicePage` held one
`AdvertisingServiceConfig` object in React state and saves it with
`writeAdvertisingConfig`, which writes `localStorage` and dispatches
`multitree:advertising-config-updated`. `PublicAdvertisingService` and
`PublicVideoCodePage` read the same key back.

Consequences today:

- The content is per-browser, not per-business. A visitor sees the shipped
  defaults; only the person who did the editing sees their own edits.
- No tenant isolation exists to violate, because no tenant data is stored.
- Uploaded images and videos are `blob:` URLs that die with the tab.
- Nothing on the page can be attributed. The closing CTA is the highest-intent
  click in the product and it produces no event.

There is no `advertis*` table, capability, or entitlement in the backend. The
only occurrence in `full_schema.sql` is the unrelated
`feature.pixel_tracking` entitlement description. This is a greenfield
addition, not a migration of existing server data.

---

## Design decisions

### 1. The advertising page is a third `public_pages.page_type`

`public_pages` is the canonical identity every public surface gets, and
`analytics_visitors.first_public_page_id`, `analytics_sessions.landing_public_page_id`,
`analytics_events.public_page_id`, `public_page_actions`, `crm_audience_exports`,
and `marketing_event_outbox` all hang off it. Pixel attribution and CRM export
to TikTok Ads is what the product sells. An advertising page outside
`public_pages` could not join that pipeline without a second, parallel one,
which AGENTS.md forbids.

The cost is that `public_pages` assumes slug-addressed, many-per-business
pages. The advertising page is a singleton at a fixed route. That is absorbed
by giving it the reserved slug `advertising` and a `UNIQUE (business_id)` on
`advertising_pages`; the existing `UNIQUE (business_id, page_type, slug)` then
holds without change. The `page_type` CHECK, the source-column XOR CHECK, and
`public_page_tombstones.page_type` each widen by one value.

Alternative rejected: a standalone `advertising_*` island with its own event
table. Cheaper to write, and it would have made the advertising page the one
public surface whose conversions never reach CRM or the TikTok pixel.

### 2. Content is relational, not one `jsonb` blob

`AdvertisingServiceConfig` is a single object and invites a single `jsonb`
column. The schema already argues against that in its own words, at
`full_schema.sql:3302`: blobs "read fast but left no id to hang analytics on,
no ordering that could change without rewriting an array, and no constraint
stopping a duplicate weekday or an impossible coordinate." All three apply
here — a package tier needs an id so a selection can be tracked, results and
FAQs are reorderable, and colours and prices are closed sets that a blob
cannot constrain.

`jsonb` is used in exactly one place: the immutable
`advertising_page_versions.payload` snapshot, matching
`mini_website_versions` and `public_page_versions`.

### 3. Separate tables per list, not one shared `advertising_items`

`mini_website_items` collapses ~22 section types into one table because they
genuinely share a shape — title, subtitle, image, action, order. Advertising's
four lists do not. A shared `title` column would mean "FAQ question" on one
row and "customer name" on the next, and roughly 60% of the columns would be
unused per row. Separate small tables keep every column meaningful and let
each list carry its own CHECK constraints. The shared-table principle is
applied where it fits — `advertising_sections` mirrors
`mini_website_sections` exactly.

### 4. Draft/publish with version snapshots

Repository precedent is `status` + `current_version` + a `_versions` table with
a `published` flag. That is also the standard headless-CMS model (Contentful,
Sanity, Webflow all ship it): edit a draft, publish an immutable snapshot,
roll back to a previous one. Adopting it here is the same design the repo
already runs twice, not an imported pattern.

`enabled` disappears — `status` is the single source of truth for whether the
page is live, so there is no way for the two to disagree.

### 4a. Save publishes; the dashboard header holds the publish toggle

**This supersedes the editor design above**, at the product owner's direction
(2026-08-05). The Ads tab header carried a publish/unpublish pair; both are
gone. Per-tab Save now writes the draft and immediately promotes it, so what
the editor shows and what visitors see never diverge.

A separate publish control lives in the Ads page's own content header
(2026-08-11), shown only on the first tab: an Eye/EyeOff toggle sits beside the
Save button and drives `POST /api/advertising/publish` and
`POST /api/advertising/unpublish`. Publishing a page that is not live is the
default action; while live, the same button unpublishes. If the editor holds
unsaved edits, the toggle flushes them through `save-and-publish` first so the
live page matches the editor. Next to it, an open button links to the public
page on the business subdomain (built through `getSubdomainPageUrl`) and stays
inert while the page is not published, since the public route 404s.

What this keeps: every save still writes an immutable
`advertising_page_versions` row, so history, rollback data and the record of
what the page said when a given lead arrived all keep accumulating. The
machinery is intact, which means restoring a control later is a UI change
rather than a migration.

Because every save publishes, that history is bounded: `publish` prunes to the
newest `VERSION_HISTORY_LIMIT` (50) snapshots per page, which is the same number
`listVersions` will return. The live version is never pruned regardless of age,
so the public read cannot lose the payload it serves. Unbounded, an editing
session alone could add dozens of jsonb blobs that nothing ever removed — the
read cap hid that growth rather than bounding it.

What this gives up, deliberately: there is no staging step. A half-finished
edit reaches visitors the moment Save is pressed, and while a business can now
take its own page down from the dashboard header toggle, permanently removing
the page is the platform's job, through the `feature.advertising_page`
entitlement.

`POST /api/advertising/unpublish`, `PATCH /api/advertising` and
`POST /api/advertising/publish` remain on the server: the header toggle calls
publish and unpublish directly, and the endpoints stay available for API
consumers that want to stage a draft. The editor itself uses
`save-and-publish` alone.

Unpublishing retracts both halves of "is this live?": the page status becomes
`paused` **and** the version's `published` flag is cleared, in one transaction.
Clearing only the status left the editor reporting a live version number and no
unpublished changes for a page no visitor could reach.

### 5. Video is referenced by URL; images are uploaded

`platform_media_settings` allows `jpeg`, `png`, `ico` at up to 10 MB, and
`validateImageUpload` sniffs magic bytes against that list. There is no video
ingest path in the platform, and adding one is a media-policy change
(size ceiling, MIME allow-list, transcoding, storage cost), not part of this
feature. So `advertising_pages.video_url` is a URL column, exactly like
`mini_websites.hero_video_url`, and the editor's video **file picker** becomes
a browser-only preview or is removed.

Images — result before/after, testimonial avatar, custom provider logo,
receipt example — upload through the existing path:
`validateImageUpload` → `StorageService.uploadImage` → `claimBusinessAssets`,
recorded in `uploaded_media_assets` with `scope = 'advertising'`.

---

## Data model

New tables, to be delivered as a new dated forward migration file in
`backend/src/database/migrations/` with an `-- ADVERTISING SERVICE SCHEMA
BEGIN/END` block placed after the mini website block and before the unified
public-page block (it must precede the `public_pages` changes that reference
it). Never edit the `full_schema.sql` baseline.

### `advertising_pages`

```sql
-- One sponsorship-service page per business, served at /advertising on the
-- business subdomain. Page-level copy lives here; every repeatable list is
-- rows in its own table below.
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
  -- One full international number, digits only — which is what the editor's
  -- single field collects ("9647500000000"). Deliberately not split into
  -- number + dialling code like mini_website_social_links: that split exists
  -- because that editor has a separate country picker, and this one does not.
  -- The service strips everything that is not a digit before storing, so a
  -- pasted "+964 750 111 2222" is accepted and normalized rather than
  -- rejected. The server builds the wa.me destination from the stored value,
  -- so the button cannot be made to publish an arbitrary scheme.
  whatsapp_number varchar(20) NOT NULL DEFAULT ''
    CHECK (whatsapp_number ~ '^[0-9]*$'),

  -- The code-extraction video, shared by journey step 5 and the standalone
  -- /advertising/video-code page. Referenced, not uploaded: see decision 5.
  video_url varchar(2048) NOT NULL DEFAULT '',
  video_tutorial_title varchar(90) NOT NULL DEFAULT '',
  -- Ordered plain strings with no identity of their own — the same shape as
  -- mini_website_items.options. A table of one text column would buy nothing.
  tutorial_steps text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (cardinality(tutorial_steps) <= 20),

  -- Optional replacement for the bundled receipt screenshot in journey step 4.
  receipt_example_image_url varchar(2048) NOT NULL DEFAULT '',

  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

`AdvertisingServiceConfig.enabled` has no column. `status = 'published'` is
the live state; `draft`, `paused`, and `archived` are all not-live. Keeping
both would allow `enabled = true, status = 'draft'` and there is no correct
answer for what that should render.

### `advertising_sections`

```sql
-- Which sections the public page shows, and in what order. Mirrors
-- mini_website_sections; the editor's `sections` object maps onto these rows.
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
```

### `advertising_package_categories` and `advertising_package_tiers`

The one genuine hierarchy in the feature: the editor's
`packageTiers: Record<categoryId, tiers[]>` becomes a foreign key.

```sql
CREATE TABLE IF NOT EXISTS public.advertising_package_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  -- The editor's own key — the seeded 'personal'/'business', or a createId()
  -- value — kept across a save so tiers and tracked selections stay attached
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
  -- Free text, not a number: businesses write "10K–20K" as often as "15000".
  views_label varchar(40) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, tier_key)
);
```

A page must keep at least one category — the editor already refuses to delete
the last one. That is a service-layer rule, not a CHECK, because a constraint
cannot see sibling rows without a trigger and the trigger would fire during
legitimate bulk replacement.

### `advertising_results`, `advertising_testimonials`, `advertising_faqs`, `advertising_payment_providers`

```sql
-- Before/after showcase cards.
CREATE TABLE IF NOT EXISTS public.advertising_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  item_key varchar(120) NOT NULL,
  category varchar(40) NOT NULL DEFAULT '',
  -- View counts as written, e.g. "4.1K" — a display string, not a metric.
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

-- Where the customer sends payment, shown in journey step 4.
CREATE TABLE IF NOT EXISTS public.advertising_payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  provider_key varchar(120) NOT NULL,
  -- Free text: the catalog names (FIB, FastPay, …) resolve a bundled logo on
  -- the client, anything else renders with the uploaded logo_url or none.
  name varchar(30) NOT NULL DEFAULT '',
  phone varchar(30) NOT NULL DEFAULT '',
  logo_url varchar(2048) NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, provider_key)
);
```

Column widths match the `maxLength` the editor already enforces, so a value the
UI accepts can never be rejected by the database.

### `advertising_page_versions`

```sql
-- An immutable snapshot of everything above, written on publish. The only
-- jsonb in this feature: a version is read whole or not at all, so there is
-- nothing to query inside it. Matches mini_website_versions.
CREATE TABLE IF NOT EXISTS public.advertising_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertising_page_id uuid NOT NULL REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advertising_page_id, version)
);
```

### Indexes and triggers

```sql
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
```

Every table gets the standard `fn_set_updated_at()` BEFORE UPDATE trigger,
following the `trg_mini_website_*_updated_at` naming.

### `public_pages` integration

These are **edits to the existing `CREATE TABLE` statements**, not `ALTER`
statements appended after them. Two reasons:

- `public_pages` and `public_page_tombstones` are declared with plain
  `CREATE TABLE` (not `IF NOT EXISTS`), and `full_schema.sql` only ever applies
  to an empty database — `db:migrate` verifies an existing one rather than
  replaying it. The `ALTER ... IF NOT EXISTS` blocks in the mini-website section
  are vestigial and should not be copied.
- The source XOR at `full_schema.sql:3766` is an **unnamed** table-level CHECK.
  Postgres names it `public_pages_check`, not `public_pages_source_check`, so a
  `DROP CONSTRAINT IF EXISTS public_pages_source_check` would silently no-op,
  leave the two-arm original in force, and reject every advertising row. The
  column-level `page_type` CHECKs are safe to name (`<table>_<column>_check`),
  but editing in place avoids the question entirely.

In `CREATE TABLE public.public_pages`, add the source column, widen the
`page_type` CHECK, and add the third arm to the XOR:

```sql
CREATE TABLE public.public_pages (
  ...
  page_type varchar(20) NOT NULL
    CHECK (page_type IN ('linktree','mini_website','advertising')),
  source_linktree_id uuid UNIQUE REFERENCES public.linktrees(id) ON DELETE CASCADE,
  source_mini_website_id uuid UNIQUE REFERENCES public.mini_websites(id) ON DELETE CASCADE,
  source_advertising_page_id uuid UNIQUE REFERENCES public.advertising_pages(id) ON DELETE CASCADE,
  ...
  -- Exactly one source id is set, and it is the one matching page_type.
  CHECK (
    (page_type = 'linktree'
       AND source_linktree_id IS NOT NULL
       AND source_mini_website_id IS NULL AND source_advertising_page_id IS NULL)
    OR
    (page_type = 'mini_website'
       AND source_mini_website_id IS NOT NULL
       AND source_linktree_id IS NULL AND source_advertising_page_id IS NULL)
    OR
    (page_type = 'advertising'
       AND source_advertising_page_id IS NOT NULL
       AND source_linktree_id IS NULL AND source_mini_website_id IS NULL)
  ),
  UNIQUE (business_id, page_type, slug)
);
```

And in `CREATE TABLE public.public_page_tombstones`:

```sql
  page_type varchar(20) NOT NULL
    CHECK (page_type IN ('linktree','mini_website','advertising')),
```

Because `public_pages` references `advertising_pages`, the advertising block
must appear **before** the unified public-page block in the file.

The identity row is kept in step by a trigger, matching
`fn_sync_mini_public_page`:

```sql
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
```

`slug` is the literal `advertising`, which satisfies the existing
`^[a-z0-9][a-z0-9-]*$` CHECK and the `UNIQUE (business_id, page_type, slug)`.
The route is not slug-derived; the slug exists so the row is well-formed and
so analytics URLs read consistently with the other page types.

### Tracked actions: none, deliberately

An earlier draft of this document specified four `public_page_actions` rows
seeded on publish (`advertising:cta-whatsapp`, `advertising:package:<key>`,
`advertising:receipt-sent`, `advertising:video-code-viewed`), each carrying a
`tiktok_event`. That was built and has been removed. It contradicted
[docs/tracking.md](tracking.md), which is the authoritative scope rule:

- `/advertising` is explicitly **not** one of the two surfaces allowed to load
  a business's pixel or send Events API traffic.
- `TIKTOK_FORWARDED_PAGE_TYPES` in `unified-analytics.service.ts` is
  `{linktree, mini_website}`, so an advertising row could never be forwarded.
- Neither `PublicAdvertisingService` nor `PublicVideoCodePage` calls
  `createPageTracker`, so nothing ever reported against those rows.

The result was rows that reported a permanent zero on every breakdown —
precisely what tracking.md warns against: "An action row for a card with no
button reports a permanent zero and pads every breakdown with noise."

The advertising page therefore registers no actions. It still gets a
`public_pages` identity row from `fn_sync_advertising_public_page`, so adding
**internal-only** analytics later (engagement events that never reach TikTok)
remains possible without a schema change. That is a product decision to make
deliberately, not a side effect of publishing.

---

## Backend

New module `backend/src/advertising/`, shaped like `mini-websites/`:

```
advertising.module.ts
advertising.controller.ts        // dashboard, guarded
advertising.public.controller.ts // public, subdomain-resolved
advertising.service.ts
advertising.repository.ts
advertising.projection.ts        // rows -> AdvertisingServiceConfig
advertising-actions.ts           // rows -> public_page_actions
dto/advertising.dto.ts
```

`advertising.projection.ts` is the one place that converts relational rows into
the `AdvertisingServiceConfig` shape both the editor and the public page
consume, so the two can never drift. `mini-website.projection.ts` is the
precedent.

### Dashboard endpoints

`@Controller('api/advertising')`, `@UseGuards(BusinessGuard, AuthorizationGuard)`,
`@UseInterceptors(AuditInterceptor)`. Every handler resolves the page from
`@CurrentUser().id` — the business id is never accepted from the client.

| Method | Path                 | Capability                                                | Audit event                           |
| ------ | -------------------- | --------------------------------------------------------- | ------------------------------------- |
| GET    | `/api/advertising`   | `pages:advertising-access` + `advertising:read`             | —                                     |
| PATCH  | `/api/advertising`   | `pages:advertising-access` + `advertising:update`           | `business.advertising.update`         |
| POST   | `/api/advertising/save-and-publish` | `advertising:update` + `advertising:publish` | `business.advertising.publish`        |
| POST   | `/api/advertising/publish`   | `advertising:publish`                               | `business.advertising.publish`        |
| POST   | `/api/advertising/unpublish` | `advertising:publish`                               | `business.advertising.unpublish`      |
| GET    | `/api/advertising/versions`  | `advertising:read`                                  | —                                     |
| POST   | `/api/advertising/versions/:version/restore` | `advertising:publish`               | `business.advertising.restore`        |
| POST   | `/api/advertising/upload/image` | `advertising:update`                             | `business.advertising.asset.upload`   |

`save-and-publish` is what the editor's Save button calls, and it is the reason
the pair cannot land apart: it writes the config and promotes it inside one
transaction. `PATCH` and `POST /publish` remain separately available for an API
consumer that wants to stage a draft first. Because saving on this page always
publishes, that endpoint requires the publish capability as well as update.

`PATCH` takes a partial `SaveAdvertisingDto` so each editor tab saves only its
own slice. Within a tab, a list is sent whole and reconciled by `item_key`:
rows present are upserted, rows absent are deleted, `position` comes from array
order. This is how `mini-websites.service.ts` already reconciles sections and
items, and it is why the stable editor keys in decision 2 matter.

`GET` returns the **draft**. The editor must show unpublished work.

Every list is bounded in the DTO (`@ArrayMaxSize`) — 20 categories, 20 tiers
per category, 30 results, 30 testimonials, 40 FAQs, 12 providers, 20 tutorial
steps — matching the `cardinality` and boundary-validation rules in
[docs/api-standards.md](api-standards.md#boundary-validation).

`upload/image` copies `MiniWebsitesController.upload` verbatim in shape:
`req.file()` → `validateImageUpload` → `storage.uploadImage` under
`businesses/<id>/advertising/...` → `claimBusinessAssets`.

### Public endpoint

`@Controller('api/public/advertising')`, unguarded, resolved by `@Subdomain()`
exactly like `PublicController.getBusiness`, and gated by
`AccessRuleEnforcementService.assertForBusinessSubdomain(requestIp(request), subdomain)`.

| Method | Path                     | Returns                                                        |
| ------ | ------------------------ | -------------------------------------------------------------- |
| GET    | `/api/public/advertising` | Published `AdvertisingServiceConfig` for the subdomain business |

Behaviour:

- No such subdomain, or no row → `404`.
- Row exists but `status <> 'published'` → `404`. The "service unavailable"
  screen `PublicAdvertisingService` renders today is a client-side branch on
  `config.enabled`; with the config server-resolved, a not-live page must not
  ship its content to the browser at all.
- Plan no longer carries `feature.advertising_page` → `404`, because the
  entitlement is part of the read's own predicate.
- Response carries only published content. Draft rows, version history, and
  `business_id` are never in the payload.

There is no `410` here, unlike `/bio/:slug`. A mini website can be deleted, so
its slug needs a tombstone saying it once existed; an advertising page is a
singleton at a fixed route with no delete endpoint, so there is no prior page
for a visitor to have bookmarked. `public_page_tombstones.page_type` accepts
`'advertising'` so the option stays open, but nothing writes such a row and the
controller returns `404` in every not-live case.

### Draft rows versus the published snapshot

The public endpoint reads `advertising_page_versions.payload` where
`published = true` — **not** the live rows. This is the whole point of the
version table, and getting it wrong is easy: if the public read joined the same
tables the editor writes, a half-finished tab save would reach visitors as soon
as the cache lapsed and Publish would decide nothing.

So: the rows are the draft, the `published = true` payload is production, and
`hasUnpublishedChanges` on the editor's read is the two compared by value.

### Plan gating on the public side

> The rule below is not advertising-specific. Any public surface sold with a
> plan must re-check its entitlement on every read, using
> `entitledSql()` from `backend/src/billing/entitlement-sql.ts`. Mini websites
> follow the same pattern via `feature.mini_websites`.


`/advertising` and `/advertising/video-code` are only served for a business
whose plan currently carries `feature.advertising_page`. The entitlement is
re-checked **on every read**, not trusted from publish time:
`page.status = 'published'` records what the owner chose while they still had
the feature and does not expire when the plan does. Without the re-check, a
business that downgrades would keep a live advertising page it can no longer
open, edit, or take down.

The predicate lives once, in `advertising.entitlement.ts`, and is used by the
public read, the `advertising_enabled` flag on `/api/public/business`, and the
migration seed. Three hand-written copies is how one of them starts disagreeing.

`advertising_enabled` also drives the links: `BusinessPublicFooter` and the
business landing nav only offer these routes when the flag is true, so a lower
plan's site never links to a page that 404s.

The published payload is cached in Redis for 300s by subdomain, and a plan
change drops it immediately rather than waiting out the TTL. Both places that
already invalidate a business's cached runtime state call
`AdvertisingService.invalidatePublicCacheForBusiness`:
`BillingManagementService.invalidateBusiness` and
`BusinessAdministrationService.refreshBusinessRuntimeState`. Without it a
downgrade kept serving a paid public page for up to five minutes, because the
entitlement check lives inside the query the cache short-circuits.

The call is failure-tolerant on purpose: a Redis problem must not roll back the
plan change. A stale cache costs minutes; a rejected downgrade costs the
operator their edit.

### Caching

Redis, following the existing public-read caching: key
`public:advertising:subdomain:<subdomain>`, value the published payload, TTL 300s.
Invalidated on publish and unpublish. `save` deliberately does **not** invalidate
— a draft save cannot change what visitors see, so the cached snapshot is still
correct. `restoreVersion` restores into the draft only, so it does not either.
Draft reads are never cached; the editor must see its own last write.

---

## Authorization

New `Capability` entries in `backend/src/auth/capabilities.ts`:

| Capability key                        | Enum member                     | Risk        |
| ------------------------------------- | ------------------------------- | ----------- |
| `business:pages:advertising-access`   | `BusinessPagesAdvertisingAccess` | `standard`  |
| `business:advertising:read`           | `BusinessAdvertisingRead`        | `standard`  |
| `business:advertising:update`         | `BusinessAdvertisingUpdate`      | `sensitive` |
| `business:advertising:publish`        | `BusinessAdvertisingPublish`     | `sensitive` |

Each needs a matching `auth_permissions` seed row (category
`Business navigation` for the access key, `Advertising` for the rest) plus
`billing_plan_permissions` grants, and each must be added to the catalog list
`db:migrate` verifies — the verifier fails closed on missing required catalog
data, so a capability added in code but not in the seed breaks migration.

A `billing_entitlements` row `feature.advertising_page` (boolean, category
`pages`) gates the whole feature per plan, so the Ads tab can be withheld from
the planned free tier without per-endpoint special cases.

---

## Frontend wiring

### Editor

`AdvertisingServicePage` keeps its current shape:

1. Initial state comes from `GET /api/advertising`, which seeds the page on
   first open so the editor works on real rows.
2. `handleSave` sends the whole config to `POST /api/advertising/save-and-publish`
   — not the active tab's slice. The tabs edit one shared config object, so a
   partial body would make "which tab was open" decide what persists.
3. There is no publish control in the header (decision 4a). The per-section
   `SectionVisibilityToggle` writes `sections`, which are rows.

Because saving on this page always publishes, that endpoint requires
`business:advertising:publish` as well as `business:advertising:update`. A
permission profile carrying update without publish therefore cannot save here
at all, and gets a 403. Grant both or neither; a profile that could write a
draft it had no way to make live would only look like it had saved.

Image uploads use a POST that returns a persisted URL rather than
`URL.createObjectURL(file)`. The `createdBlobs` revoke bookkeeping in the modals
stays: it still governs the local preview between picking a file and a
successful save.

### Public pages

Both routes read through
`frontend/src/features/advertising/public-page-data.server.ts`, which owns
subdomain resolution, the four public fetches (`cache: "no-store"`, the
`x-subdomain` header, a 30s timeout) and the branding/footer props the two
components share.

Each fetch carries its own failure handling. The business record and the
advertising config gate the page; the linktree and mini-website lists are footer
navigation and degrade to empty. One shared `try` around all four meant a
timeout on the footer's linktree list returned `null` and 404'd a published
advertising page.

The video-code page needs only `video_url`, `video_tutorial_title`, and
`tutorial_steps`, but reads the same endpoint — one cached projection beats a
second endpoint that can disagree with the first.

### Code removed by this change

Once the config is server-resolved, all of the following are dead and must go
in the same change, per the shared-first workflow:

- `readAdvertisingConfig` / `writeAdvertisingConfig` and
  `ADVERTISING_CONFIG_STORAGE_KEY` (`features/advertising/storage.ts`).
- The `multitree:advertising-config-updated` event and both `storage` /
  custom-event listeners in `PublicAdvertisingService`.
- Every back-compat shim in `storage.ts` — `withPackageCategoryColors`,
  `withPaymentProviderIds`, `withTextDefaults`, and the hardcoded legacy-title
  override at lines 93–96. They exist to repair old `localStorage` payloads;
  there will be no old payloads.
- The `config?:` optional prop and its `null` loading branch become required
  props, since the server always supplies the config or 404s.

### Seeding, and why it is not optional

`ensureAdvertisingPages` (run from both `db:migrate` and `db:reset`) gives each
business that holds the `feature.advertising_page` entitlement a **draft** page
with the default content, so the editor opens on real rows instead of a shape
the browser invented.

Two deliberate limits:

- **Draft, not published.** Seeding a live page would publish a URL nobody has
  reviewed. `/advertising` stays a 404 until the owner presses Publish.
- **Entitled businesses only.** The advertising permissions require the
  entitlement, which only the top plan carries. Seeding a page for a Basic or
  Pro business would create a row it can neither open nor remove.

The default content is deliberately thin: the real price tiers, the
code-extraction tutorial steps, and the hero and closing copy. Results,
testimonials, FAQs and payment providers all start **empty** — a business must
not publish invented customer reviews or someone else's payment number just
because it never opened the editor. There is no bundled fallback list anywhere
in the renderer for the same reason; the public page skips a content section
that has nothing in it, and the guide's payment step says the details have not
been published yet rather than showing an example number.

Without it, moving the content into the database would have 404'd `/advertising`
for every existing business until its owner opened the Ads tab and pressed
Publish — a regression dressed up as a migration, since the old page rendered
bundled defaults for everyone. It is idempotent by existence check, so a rerun
never overwrites edited content.

`AdvertisingService.ensurePage` covers the other direction: a business created
after this seed ran gets its page on first editor open, as a `draft`.

### Where defaults live afterwards

`DEFAULT_ADVERTISING_CONFIG` currently does two jobs: the shipped starting
content, and the repair fallback for damaged stored configs. The second job
disappears. The first moves server-side: creating a business seeds an
`advertising_pages` row in `draft` with the default copy, the seven
`advertising_sections` rows, and the `personal`/`business` categories — the
same idempotent seed style as the demo-business fixture in
[docs/database.md](database.md#demo-business-fixture). The frontend constant is
then only the Kurdish copy the seed inserts, and should live with the seed, not
in the client bundle.

---

## Known gap to close in the same work

`types.ts:91` records that custom `packageCategories` are "frontend-only, not
yet shown on the public page" — the public packages section renders a fixed
personal/business pair. Once categories are rows, `AdvertisingPackagesSection`
must render from the category list. Shipping the backend without this gives
businesses an editor that creates data no visitor can see.

---

## Rollout

The repository has one consolidated baseline for fresh installs, so this
lands as a new dated forward migration file plus one code change:

1. Put every statement above in a new dated forward migration file in
   `backend/src/database/migrations/` (never edit `full_schema.sql`), and add
   the new tables to the schema-groups table in
   [docs/database.md](database.md#schema-groups) in the same change.
2. Add the `auth_permissions`, `billing_plan_permissions`, and
   `billing_entitlements` seed rows, and extend the `db:migrate` catalog
   verification list.
3. Build the backend module, then switch the editor and both public pages.
4. Delete the `localStorage` layer and its shims.
5. Extend the demo-business fixture with a populated advertising page so the
   feature is exercised by `db:reset`.

Disposable environments reset with `pnpm db:reset`. Environments with data need
the reviewed backup, transfer, and replacement procedure — `db:reset` is never
an upgrade path.

One data fix travels with this: an environment that published an advertising
page under the build that seeded tracked actions still holds `active`
`public_page_actions` rows for it, and the writer that made them is gone. The
`db:migrate` / `db:reset` seed (`ensureAdvertisingPages`) archives them. A fresh
database has none, so the statement is a no-op there.

Because there is no existing server-side advertising data, nothing needs
migrating. Content sitting in a business owner's `localStorage` is not
recoverable server-side and is not treated as data to preserve; the seeded
defaults replace it.

---

## Testing

Following [docs/testing.md](testing.md):

- Projection round-trip: rows → `AdvertisingServiceConfig` → rows is stable,
  including ordering and `item_key` retention.
- Reconciliation: a `PATCH` that omits an item deletes exactly that item and
  renumbers `position` without touching siblings.
- Tenant isolation: business A's session cannot read, patch, or publish
  business B's page, by id or by subdomain.
- Public projection excludes draft content and every `business_id`.
- `410` for a tombstoned page, `404` for an unknown or unpublished one.
- Publish writes a version row, increments `current_version`, and busts the
  Redis key.
- Upload rejects a non-image and a spoofed MIME type, as `image-upload.spec.ts`
  already checks for the shared validator.
