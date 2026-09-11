# Database

The consolidated baseline part `92_root_public_slugs.sql` provides the
concurrency-safe root public slug registry for platform-owned Linktrees.

## Fixed public marketing routes

`public_pages.page_type='route'` represents allowlisted fixed URLs that do not
have a specialized content table. Its `slug` is the stable route key and all
specialized source-id columns are null. A business insert trigger creates the
business home and advertising-video-code identities, or the platform home,
join, and application identities for the single `account_type='platform'`
workspace. The public tracking resolver still checks route publication and the
underlying advertising-page entitlement where applicable.

## Business identity and applications

Business onboarding uses `users`, `user_identities`,
`business_memberships`, `business_signup_invitations`,
`business_signup_applications`, and
`business_signup_application_events`. Partial uniqueness reserves active
application subdomains without permanently blocking rejected requests. OAuth
state, signup sessions, and tenant handoff codes are temporary Redis records;
they never replace durable application or membership state.

`businesses.onboarding_step`, `businesses.onboarding_version`, and
`businesses.onboarding_completed_at` enforce the required first-login setup.
Approved signup businesses start at step 1; explicitly administrator-created
businesses are marked complete. The `remembered` flag on business and platform
session rows records the session-lifetime choice while user agent, IP, and
timestamps provide revocable device history.

PostgreSQL is the durable source of truth. Redis is disposable acceleration
and must not contain the only copy of application data. For the enforced
boundary between the two, see [docs/architecture.md](architecture.md#data-and-migrations).

The consolidated baseline is split across:

```text
backend/src/database/migrations/baseline/*.sql
```

It is recorded in `schema_migrations` under the compatibility ledger name
`full_schema.sql`.

It requires the PostgreSQL `pg_trgm` and `pgcrypto` extensions.

Dated forward-migration SQL files must not include their own `BEGIN`, `COMMIT`,
or `ROLLBACK` wrapper. The migration runner owns that transaction and records
the migration in the same commit, ensuring a failed migration leaves both the
schema and its ledger unchanged.

## Schema groups

The active schema is grouped as follows:

| Area                             | Tables                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform identity and access     | `platform_admins`, `platform_admin_sessions`, `access_rules`, `platform_permission_denies`, `auth_permissions`, `permission_approval_requests`                                                                                                                                                                                              |
| Businesses and sessions          | `businesses`, `business_branding`, `business_defaults`, `business_profile_change_requests`, `business_sessions`, `business_tiktok_pixels`                                                                                                                                                                                                  |
| Linktrees and public content     | `linktrees`, `links`, `whatsapp_questions`, `template_global_settings`, `public_pages`, `public_page_versions`, `public_page_actions`, `public_page_tombstones`                                                                                                                                                                            |
| Advertising service              | `advertising_pages`, `advertising_sections`, `advertising_package_categories`, `advertising_package_tiers`, `advertising_results`, `advertising_testimonials`, `advertising_faqs`, `advertising_payment_providers`, `advertising_page_versions`                                                                                            |
| Billing and access configuration | `billing_entitlements`, `billing_plans`, `billing_plan_configurations`, `billing_plan_entitlements`, `billing_plan_permissions`, `billing_plan_templates`, `billing_subscription_plans`, `business_subscriptions`, `billing_usage_counters`, `billing_policy_audit_events`                                                                 |
| Analytics and marketing delivery | `analytics_visitors`, `analytics_sessions`, `analytics_events`, `analytics_page_daily`, `analytics_action_daily`, `marketing_event_outbox`, `marketing_delivery_attempts`                                                                                                                                                                  |
| Communications                   | `communication_announcements`, `communication_announcement_deliveries`, `communication_notifications`, `communication_conversations`, `communication_messages`, `communication_homepage_placements`                                                                                                                                        |
| Operations and media             | `platform_data_retention_settings`, `platform_data_retention_runs`, `platform_media_settings`, `uploaded_media_assets`, `schema_migrations`                                                                                                                                                                                                 |

## Schema decisions carried in the baseline

These were delivered as dated forward migrations and folded into
`full_schema.sql` by the 2026-08-24 rebaseline; the files are gone, so the
reasoning lives here. Everything below is simply how the baseline is now.

**CRM and Advanced Analytics retirement.** The baseline no longer creates the
CRM tables, retired lead-form settings, Advanced Analytics dimension
rollup, or acquisition-only daily-rollup columns. It also omits the retired
Advanced Analytics permissions, entitlements, and plan grants. Core page/action
totals, exact unique counts, and TikTok delivery data remain. The two dated
removal migrations were folded into the baseline and deleted on 2026-08-24, so
an older valuable database requires an explicitly reviewed backup and database
replacement rather than relying on those removed files as an upgrade path.

**Session impersonation.** `business_sessions.impersonated_by_platform_admin_id`,
`.impersonation_reason` and `.impersonation_started_at` mark a session a
platform administrator opened rather than the owner. Impersonated rows are
excluded from the per-business session cap and listed separately in business
security screens, so both paths filter on the partial index
`business_sessions_impersonated_by_idx`. The
`platform:businesses:impersonate` permission is seeded with them: the
application refuses to boot when a catalog permission is missing.

**No password authentication.** `businesses.password_hash`,
`businesses.password_changed_at` and `platform_admins.password_hash` do not
exist. Sign-in is invite-only Google OAuth or an emailed code; the password
routes were never wired. Three capabilities named for password operations were
renamed in place — `business:security:sessions-revoke`,
`platform:businesses:sessions-revoke`, `platform:settings:sessions-revoke` —
keeping their ids so existing grants and approval rows survived.

These columns must **not** be added to `OBSOLETE_COLUMNS` in
`migration-compatibility.ts`. `assertSupportedSchema` runs against an existing
database before any forward migration, so an entry there would reject a live
database that predates their removal.

**Neutral brand placeholders.** `business_branding.logo` and `.favicon` default
to `/images/business-logo-placeholder.png` and
`/images/business-favicon-placeholder.png`. They used to default to Sponsor.krd's
own `/images/Logo.jpg` and `/favicon.ico`, so a business that skipped the
optional upload rendered the platform's mark on its own public pages.
`platform_admins` keeps the platform mark — that row _is_ Sponsor.krd's console
branding. `business_branding.default_avatar` deliberately keeps
`/images/DefaultAvatar.png`: it is a sentinel other SQL compares against to mean
"still the default", and the artwork behind the path was replaced at the asset
level.

**Profile change cooldown.** `businesses.profile_changed_at` (NULL means never)
drives a 30-day self-enforced lock covering name, username, phone, logo,
favicon, default_avatar and website_color. It replaced platform-administrator
approval of profile changes, so `business:profile:update` is granted with
`access_mode = 'direct'` — `AuthorizationService.evaluate` treats `'approval'`
as approval-required for the whole permission regardless of `field_modes`. It
lives on `businesses` rather than `business_branding` because the window covers
more than the branding columns.

**Linktree template keys.** `spectrum`, `spotlight`, `frost`, `aurora`,
`serenity`, `branch-signal` — renamed from `colorful-pills`, `mobile-spotlight`,
`frosted-outline`, `aurora-pills`, `gentle-flow`. `hero-image` and `dark-card`
were retired. `business_defaults.template_key` and `linktrees.template_key` both
default to `spectrum`. Branch Signal is assigned only to Ultra in the
consolidated baseline; runtime plan checks also reject accidental non-Ultra
assignments.

**Retired link platform.** `website` was folded into `custom`, which already
accepted a bare domain and stored the same `https://…` url. Destination urls
were left untouched: `LinksService.syncLinks` matches a saved link on
platform + url, so rewriting the url would have made every one of these links
look new on the next save and retired the action row holding its clicks.

**One-time data repairs**, which acted only on rows that already existed and so
leave no trace in a fresh database:

- Per-button click history orphaned by the old link-sync behaviour was folded
  back onto the live action. `syncLinks` used to delete and re-insert every
  link, giving each surviving button a new uuid, a fresh `public_page_actions`
  row, and an archived predecessor still holding its `analytics_action_daily`
  rollups — which the breakdown query excludes. Page-level totals were never
  affected: `analytics_page_daily` is keyed by `public_pages.id`. The service no
  longer destroys link rows.
- Business default pages created by `POST /linktrees/default` before the seeder
  filled them in were backfilled with the helper text and starter WhatsApp
  questions the link editor writes.

## Baseline layout

The baseline is one schema split across numbered parts in
`backend/src/database/migrations/baseline/`, applied in filename order inside a
single transaction by both `db:migrate` and `db:reset`:

| Part                             | Holds                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `00_settings_and_extensions.sql` | dump preamble, session settings, extensions             |
| `01_functions.sql`               | shared PL/pgSQL functions                               |
| `10_core_tables.sql`             | identity, authorization, billing, linktrees, operations |
| `11_core_constraints.sql`        | primary keys and unique constraints                     |
| `12_core_indexes.sql`            | indexes for the core tables                             |
| `13_core_triggers.sql`           | triggers for the core tables                            |
| `14_core_foreign_keys.sql`       | foreign keys, after every table they reference          |
| `20_communications.sql`          | Communication Center                                    |
| `40_operations_and_media.sql`    | data retention and media policy                         |
| `60_advertising.sql`             | advertising pages, packages, versions                   |
| `70_public_pages_analytics.sql`  | unified public page model and analytics                 |
| `80_performance.sql`             | FK-column indexes and per-table storage tuning          |
| `90_onboarding_identity.sql`     | invite-only Google onboarding                           |
| `92_root_public_slugs.sql`       | platform root-domain Linktree slug registry             |
| `95_late_schema.sql`             | late objects that depend on earlier schema domains      |
| `99_data.sql`                    | catalog rows the application cannot boot without        |

`src/database/baseline.ts` owns the loading: `baselineFiles` reads the parts
off disk and sorts them, `applyBaseline` runs them, and `readBaselineSql`
concatenates them for the specs that assert against the schema text. Adding a
part is adding a file — nothing enumerates them by hand. The numbering leaves
gaps so a new domain takes its own tens place instead of forcing a renumber.

**The split is sequential.** No statement was reordered when it was made, so
concatenating the parts reproduces the single file they came from. That is what
makes the ordering safe to reason about rather than something to re-derive:
core tables precede their constraints, every foreign key lands after every
table it references, and `99_data.sql` runs last, once the keys exist to
validate it.

Three rules follow, all enforced by `schema-baseline.spec.ts`:

- **Filename order is apply order.** A part that must run late needs a higher
  prefix; nothing infers dependencies.
- **Data goes in `99_data.sql`**, in dependency order. The rows load after the
  foreign keys, unlike a `pg_dump`, which writes data first and constraints
  after — so alphabetical order is not enough (`billing_plan_configurations`
  sorts before `billing_plans` but references it). Anything derived from other
  seeded rows goes last.
  Two singleton bootstraps stay with their own sections because they mean
  "ensure one row exists", not "seed the catalogue".
- **No `IF NOT EXISTS` on tables or indexes, and no post-table `ADD COLUMN` /
  `DROP CONSTRAINT` patch-ups.** Those were migration residue: every column and
  CHECK they re-applied is already declared in the `CREATE TABLE` above them,
  so on an empty database they did nothing but mislead. `IF NOT EXISTS` on a
  baseline that only ever runs against an empty database hides a real name
  collision rather than failing on it. The two `CREATE EXTENSION IF NOT EXISTS`
  statements are the deliberate exception, since a template database may
  already carry them.

The baseline is still recorded in `schema_migrations` under the single name
`full_schema.sql`, deliberately unchanged by the split. The ledger records
_which baseline_ a database was built from, not which files carried it, and
`db-migrate.ts` recognises an already-baselined database by that exact string.

## Platform Linktree workspace

The consolidated baseline carries the durable `businesses.account_type`
ownership discriminator and creates exactly one internal platform workspace.
A partial unique index enforces the singleton.
The same workspace owns platform Linktrees; no
feature-specific owner table or nullable ownership column is introduced.
Existing and future customer rows default to `business`; platform and public
services use explicit account-type predicates so the internal owner never
appears in customer administration, billing, impersonation, authentication,
or tenant public reads.

The workspace deliberately owns ordinary `linktrees`, `links`, `public_pages`,
`public_page_actions`, analytics, tombstones, and uploaded-media rows. Those
tables keep their non-null foreign keys and existing triggers. The normal
post-insert subscription is removed because this is not a billable customer;
platform write policy is enforced by the guarded platform service instead.
`99_data.sql` registers the platform Linktree and TikTok capabilities with
that workspace.

## Baseline consolidation, 2026-09-10

The numbered baseline contains the complete current Sponsor.krd schema and
required catalog data. Linktree subtitle styling, campaign state, archive
state, current branding, platform ownership, and all active permissions are
declared directly in their owning baseline parts. There are no dated upgrade
files in this reset-only release.

`db:reset` recreates the configured database from this baseline and records
only `full_schema.sql`. `db:migrate` applies the same baseline to an empty
database or strictly verifies an already-current schema. An outdated database
must be replaced with an intentional reset; it is not upgraded implicitly.

The reset E2E test proves that an unrelated sentinel table is removed, the
complete schema is recreated, and the ledger contains only the baseline row.
The unledgered-schema test proves that a complete current schema can be
recognized without replaying schema SQL.

`trg_business_default_subscription` creates a default subscription immediately
after a business row is inserted. Any workflow that creates a business with an
explicit reviewed plan must upsert `business_subscriptions` on `business_id` so
the reviewed plan replaces that trigger-created default. A second plain insert
will violate `business_subscriptions_business_id_key`.

The former `page_views`, `link_clicks`, `analytics_totals`,
legacy public-page analytics tables and `integration_delivery_events` are not
created by the consolidated
schema, and neither are the four legacy analytics helper functions or the
`links.click_count` column. Current code uses the unified analytics and
marketing tables above.

`public_page_tombstones` stores only the tenant, page type, former public
identifier, slug, and deletion time. It contains no deleted page content. Public
lookups consult it only after the active page lookup fails, allowing a
tenant-scoped `410 Gone` response while preserving `404 Not Found` for unknown
or cross-tenant URLs.

The platform-administrator tables are named `platform_admins` and
`platform_admin_sessions`, matching the term used throughout the application
and UI.

## Running migrations

```bash
pnpm db:migrate
```

For an empty database, this applies every numbered baseline part transactionally
and records the single compatibility name `full_schema.sql` in
`schema_migrations`. For an existing database
with the baseline row, the command verifies the required tables, columns,
indexes, removed columns, and required catalog data without replaying the
schema. A complete unledgered schema may be baselined after the same strict
verification. Unknown, partial, or outdated schemas fail closed.

If `DB_NAME` does not exist yet, the migration command creates that database
through `DB_MAINTENANCE_NAME` (default: `postgres`) before applying the
schema.

Application startup does not run migrations.

## Applying schema changes

The repository uses one consolidated schema baseline split across
`backend/src/database/migrations/baseline/` for fresh installs and `db:reset`.
Never edit that baseline for an ordinary schema change. Every schema change
should normally be delivered as a new dated forward migration file in
`backend/src/database/migrations/` (for example
`2026-08-10_add_tiktok_consent.sql`) so existing databases can be upgraded
in place. Apply forward migrations with the same migration command, and
verify existing databases after applying them.

Environments may be reset from the baseline only when complete PostgreSQL and
Redis data loss is explicitly approved. A production reset is a deliberate
replacement, not an in-place upgrade: stop the applications first and follow
the reset-only procedure in `docs/deployment.md`.

The post-migration helpers perform only idempotent seed/data work. They do not
create tables, alter columns, create indexes, or modify constraints.

Archived communication history has administrator-configurable retention.

```bash
pnpm db:reset
```

`db:reset` force-terminates connections to `DB_NAME`, drops the entire
database (thereby removing every table, function, view, extension, and row),
recreates it from `template0`, applies only the numbered baseline, verifies the
result and its one-row `full_schema.sql` schema ledger, reruns the seed helpers,
and executes
`FLUSHALL` on the configured Redis instance. **It
permanently destroys the configured application database and all data in the
configured Redis instance.** Set `DB_RESET_REQUIRE_STOPPED_BACKEND=true` when
an environment must refuse resets while Sponsor.krd backend connections are
active.

Use `db:reset` only when complete data loss is intended.

## Seeded data

Production business creation uses approved signup applications. Any business
created by environment seed helpers is an explicitly configured local
development record, not part of public or administrator-manual onboarding.

The baseline seeds only what the application cannot run without: the platform
administrator, retention and media policy, and the permission and billing
catalogues. Businesses entitled to the advertising
feature also get a **draft** advertising page so the editor opens on real rows;
nothing is published until the owner publishes it.

No demo or fixture businesses are created — every business in a database is a
real one, created through the platform administrator.
