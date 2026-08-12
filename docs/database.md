# Database

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

The consolidated baseline is:

```text
backend/src/database/migrations/full_schema.sql
```

It requires the PostgreSQL `pg_trgm` and `pgcrypto` extensions.

## Schema groups

The active schema is grouped as follows:

| Area                             | Tables                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform identity and access     | `platform_admins`, `platform_admin_sessions`, `access_rules`, `platform_permission_denies`, `auth_permissions`, `permission_approval_requests`, `security_audit_events`                                                                                                                                                                                                            |
| Businesses and sessions          | `businesses`, `business_branding`, `business_defaults`, `business_profile_change_requests`, `business_sessions`, `business_tiktok_pixels`                                                                                                                                                                                                                                          |
| Linktrees and public content     | `linktrees`, `links`, `whatsapp_questions`, `template_global_settings`, `public_pages`, `public_page_versions`, `public_page_actions`, `public_page_tombstones`                                                                                                                                                                                                                    |
| Mini-websites                    | `mini_websites`, `mini_website_sections`, `mini_website_social_links`, `mini_website_locations`, `mini_website_hours`, `mini_website_items`, `mini_website_lead_forms`, `mini_website_versions`                                                                                                                                                                                    |
| Advertising service              | `advertising_pages`, `advertising_sections`, `advertising_package_categories`, `advertising_package_tiers`, `advertising_results`, `advertising_testimonials`, `advertising_faqs`, `advertising_payment_providers`, `advertising_page_versions`                                                                                                                                    |
| Billing and access configuration | `billing_entitlements`, `billing_plans`, `billing_plan_configurations`, `billing_plan_entitlements`, `billing_plan_permissions`, `billing_plan_templates`, `billing_subscription_plans`, `business_subscriptions`, `billing_usage_counters`, `billing_policy_audit_events`                                                                                                         |
| Analytics and CRM                | `analytics_visitors`, `analytics_sessions`, `analytics_events`, `analytics_page_daily`, `analytics_action_daily`, `analytics_dimension_daily`, `crm_contacts`, `crm_leads`, `crm_lead_status_history`, `crm_lead_events`, `crm_notes`, `crm_tags`, `crm_lead_tags`, `crm_audience_exports`, `crm_audience_export_members`, `marketing_event_outbox`, `marketing_delivery_attempts` |
| Communications                   | `communication_announcements`, `communication_announcement_deliveries`, `communication_notifications`, `communication_conversations`, `communication_messages`, `communication_homepage_placements`                                                                                                                                                                                |
| Developer API                    | `api_clients`, `api_rate_limit_policies`, `api_usage_daily`, `api_idempotency_keys`, `api_external_resource_mappings`, `api_assets`, `api_webhook_endpoints`, `api_webhook_subscriptions`, `api_webhook_events`, `api_webhook_deliveries`, `api_webhook_delivery_attempts`, `api_versions`, `api_catalog_groups`, `api_linktree_schedules`                                         |
| Operations and media             | `http_request_events`, `http_request_event_daily_stats`, `platform_data_retention_settings`, `platform_data_retention_runs`, `platform_media_settings`, `uploaded_media_assets`, `schema_migrations`                                                                                                                                                                               |

`business_sessions.impersonated_by_platform_admin_id`,
`business_sessions.impersonation_reason`, and
`business_sessions.impersonation_started_at` mark a session that a platform
administrator opened rather than the owner. They are added by
`2026-08-12_add_business_session_impersonation.sql`, which also registers the
`platform:businesses:impersonate` row in `auth_permissions` — the application
refuses to boot when a catalog permission has no row, so a capability and its
catalog entry always ship in the same migration. A `NULL` value in the first
column is an ordinary owner session; the partial index covers only the
impersonated rows, which are excluded from the per-business session cap.

`trg_business_default_subscription` creates a default subscription immediately
after a business row is inserted. Any workflow that creates a business with an
explicit reviewed plan must upsert `business_subscriptions` on `business_id` so
the reviewed plan replaces that trigger-created default. A second plain insert
will violate `business_subscriptions_business_id_key`.

The former `page_views`, `link_clicks`, `analytics_totals`,
`mini_website_events`, `mini_website_analytics_daily`, and
`integration_delivery_events` tables are not created by the consolidated
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

For an empty database, this applies `full_schema.sql` transactionally and
records that single filename in `schema_migrations`. For an existing database
with the baseline row, the command verifies the required tables, columns,
indexes, removed columns, and required catalog data without replaying the
schema. A complete unledgered schema may be baselined after the same strict
verification. Unknown, partial, or outdated schemas fail closed.

If `DB_NAME` does not exist yet, the migration command creates that database
through `DB_MAINTENANCE_NAME` (default: `postgres`) before applying the
schema.

Application startup does not run migrations.

## Applying schema changes

The repository uses one consolidated schema baseline
(`backend/src/database/migrations/full_schema.sql`) for fresh installs and
`db:reset`. Never edit that baseline for a schema change. Every schema change
must be delivered as a new dated forward migration file in
`backend/src/database/migrations/` (for example
`2026-08-10_add_tiktok_consent.sql`) so existing databases can be upgraded
in place. Apply forward migrations with the same migration command, and
verify existing databases after applying them.

Disposable environments may be reset from the baseline, while valuable
environments require an explicitly reviewed backup, data-transfer, and
database-replacement procedure that includes the forward migrations. Never
use `db:reset` as a production upgrade command.

The post-migration helpers perform only idempotent seed/data work. They do not
create tables, alter columns, create indexes, or modify constraints.

The baseline excludes the obsolete
`platform_data_retention_settings.audit_log_days` column. Security audit
events are permanent application evidence; only request logs, API history,
and archived communication history have administrator-configurable retention.

```bash
pnpm db:reset
```

`db:reset` force-terminates connections to `DB_NAME`, drops the entire
database (thereby removing every table, function, view, extension, and row),
recreates it from `template0`, applies only `full_schema.sql`, verifies the
result and its one-row schema ledger, reruns the seed helpers, and executes
`FLUSHALL` on the configured Redis instance. **It
permanently destroys the configured application database and all data in the
configured Redis instance.** Set `DB_RESET_REQUIRE_STOPPED_BACKEND=true` when
an environment must refuse resets while MultiTree backend connections are
active.

Use `db:reset` only when complete data loss is intended.

## Seeded data

Production business creation uses approved signup applications. Any business
created by environment seed helpers is an explicitly configured local
development record, not part of public or administrator-manual onboarding.

The baseline seeds only what the application cannot run without: the platform
administrator, the API platform catalogue, retention and media policy, and the
permission and billing catalogues. Businesses entitled to the advertising
feature also get a **draft** advertising page so the editor opens on real rows;
nothing is published until the owner publishes it.

No demo or fixture businesses are created — every business in a database is a
real one, created through the platform administrator.
