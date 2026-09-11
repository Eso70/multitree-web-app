# Backend

## Platform TikTok tracking

Platform Settings exposes guarded TikTok configuration and delivery-health
endpoints. The controller never accepts an owner id: `PlatformSettingsService`
resolves the internal platform workspace and uses the shared encrypted
`TikTokPixelConfigService`. `PublicPageAnalyticsService` and the analytics
outbox select destinations from the canonical public-page owner, requiring a
live customer entitlement for business owners and allowing the non-billable
platform owner explicitly.
Business TikTok updates and approved delete actions must always retain at least
one active Pixel group once configuration exists.

## Google business identity configuration

Set `APP_BASE_URL` to root frontend origin. Configure `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`; redirect URI must be
exact root-domain `/api/auth/google/callback` URL registered in Google Cloud.
Integration requests only `openid email profile` and retains no Google access
or refresh token. Missing configuration disables Google signup/sign-in with a
safe service-unavailable response.
Tenant OAuth handoff redirects must be built with `buildTenantUrl`; never assign
a path containing `?` directly to `URL.pathname`, because that percent-encodes
the query marker and routes the callback to a nonexistent page.

## Business email-code login

Approved active business members can request a login code from their own
subdomain through `POST /api/auth/email/request`, then verify it through
`POST /api/auth/email/verify`. Configure `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_APP_PASSWORD`, and `EMAIL_FROM_NAME` on the
backend. For Gmail, `SMTP_APP_PASSWORD` must be a Google App Password, not the
normal account password. Missing mail credentials safely disable only this
login method.

An owner who originally verified an invitation by email may later choose
Google on the same business login page. On the first successful attempt, the
backend links Google's stable subject only after Google verifies the exact
email and PostgreSQL confirms an approved signup application plus active owner
membership for that exact subdomain. Conflicts are rejected.

## Platform-admin and signup email login

Platform administrators can sign in from the root domain through
`POST /api/platform/auth/email/request` and `POST /api/platform/auth/email/verify`;
the code is sent only to an email that both matches a `platform_admins` row and,
when set, the configured summary `PLATFORM_ADMIN_EMAIL`. Unknown emails receive
no code. Verified sign-in creates a `platform_admin_session` and redirects to
the configured `PLATFORM_ADMIN_PATH`.

Invite sign-up also supports email identity. With a valid invitation token,
`POST /api/signup/email/request?invite=<token>` sends a code to the invited
email (or the entered email when the invitation is not bound to one), and
`POST /api/signup/email/verify` verifies the code and creates the applicant's
user plus `signup_session` when the email matched. Codes are stored only as
HMAC digests keyed by `SESSION_SECRET`, expire after 10 minutes, allow a bounded
number of attempts, and are rate limited per email and per IP.

Both Google and email verification accept the shared private-device choice.
Normal business sessions last 12 hours; remembered business sessions last 30
days. Platform sessions last 30 minutes or 7 days when remembered. The
business sign-in path warms the Redis session cache before redirecting so the
parallel dashboard bootstrap does not repeat PostgreSQL identity lookups.
business onboarding API is `GET/PATCH /api/auth/onboarding`, with uploads at
`POST /api/auth/onboarding/assets` and final setup completion at
`POST /api/auth/onboarding/complete`. All four routes require an authenticated,
tenant-bound business session. The onboarding update can revise business name,
phone, branding, and plan-limited TikTok groups. Events API tokens use the same
encrypted storage and masked readback as business settings; the assigned
subdomain is returned read-only and cannot be changed by this endpoint.

NestJS 11 on the Fastify adapter (not Express). See
[docs/architecture.md](architecture.md#backend-boundaries) for module
ownership and boundaries, and [docs/security.md](security.md) for
authentication, authorization, and every other security control. This file
covers the analytics/activity pipeline, upload storage, environment
configuration, and backend commands.

## Default linktree page seeding

`POST /linktrees/default` creates the business default page on the server,
without opening the link editor. It must produce the same page the editor
would: name, tagline, helper text, footer credit, WhatsApp modal wording and
its starter questions.

The shared values live in `@linktree/types` as `LINKTREE_DEFAULT_*`. The link
editor reads them directly. `LinktreesService` cannot — the package is
source-only and Node will not resolve its extensionless re-exports at runtime —
so `common/linktree-defaults.ts` mirrors them, and
`common/linktree-page-defaults.spec.ts` asserts the copy matches. Change a
default in `@linktree/types` and that spec tells you to update the mirror.

Pages created before the seeder filled this in are backfilled by
`2026-08-18_fill_default_linktree_page_copy.sql`, which only writes columns
that are still empty.

## Linktree template_config guards

`template_config` is free-form jsonb, so `normalizeTemplateConfig` in
`LinktreesService` is the gate. Two keys are validated on every write and read:

- `background_image` — only same-origin `/images/upload/` paths survive
  (`common/linktree-background-image.ts`). The value reaches a CSS `url()` on a
  public page.
- `background_pattern` — only catalogue values survive
  (`common/linktree-background-pattern.ts`). An unknown key would draw nothing
  and leave the owner with a setting that looks saved and never applies.

Both mirror `@linktree/types` and both carry a spec asserting the copy matches,
because the shared package is source-only and Node cannot resolve it at
runtime.

## Dependency graph test

`src/app.module.di.spec.ts` compiles the whole `AppModule` so every provider in
every module is instantiated.

Nothing else catches an unregistered provider. `tsc` and `nest build` only
compile, and the service specs construct their subject with `new`, bypassing
the injector — so a constructor parameter whose provider is missing from its
module compiles, passes its unit tests, and fails at boot with
`UnknownDependenciesException`.

A default parameter value does **not** make an injected parameter optional.
Nest resolves constructor parameters from the emitted type metadata and never
consults the default, so `private readonly thing: Thing = new Thing(db)` reads
as optional in TypeScript while still requiring `Thing` to be a provider of
that module. `BusinessAdministrationService` uses that pattern for its
repositories, which works only because each one is listed in
`PlatformAdminModule`. Use `@Optional()` when a dependency is genuinely
optional.

## Per-linktree traffic totals

`AnalyticsReadRepository.linktreeTotalsForBusiness` returns lifetime
`unique_views`, `unique_clicks` and `total_clicks` per linktree for one
business, as a map keyed by linktree id.

Two screens ask that question and used to carry their own copy of the SQL: the
business dashboard's pages list (`GET /linktrees`, which had no analytics at
all, so the cards could not show traffic) and the platform admin's business
analytics modal. Both go through the repository now.

Uniques are counted from `analytics_events`. Daily rollups intentionally hold
only additive view, click, and conversion totals. `total_clicks` comes from the
rollup, while exact unique counts come from distinct visitor IDs in the event
log.

`getAllLinktrees` attaches the totals with one aggregate for the whole list
rather than a query per card, and defaults a page with no traffic to zeroes so
the card never has to tell "no data" apart from "not loaded". A failure there
is logged and degrades to zeroes rather than failing the request: traffic is
supplementary to the pages list, and an owner must still be able to see and
edit their pages during an analytics outage.

The aggregate is driven from a `pages` CTE holding the business's own pages,
not from the event log. Filtering `analytics_events` by `event_name` first
makes the planner read every matching event for **every tenant** and discard
the rest on the join — confirmed with `EXPLAIN`, which chose
`idx_analytics_events_name_time`. Starting from the small, business-scoped set
lets each branch reach the event log through
`idx_analytics_events_page_visitor_name (public_page_id, visitor_id,
event_name)`, which is the shape it needs. This endpoint loads on every
dashboard open, so the difference is not academic.

## Linktree availability checks

`GET /linktrees/check-slug` answers whether a `seo_name` is free. `seo_name` is
unique per business, so a taken slug is a hard error in the editor.

`GET /linktrees/check-name` answers the same question for the display name, and
exists only to feed a warning. `linktrees.name` carries no unique constraint and
none is wanted — two pages may legitimately share a display name at different
slugs — so the editor shows the answer and still allows the save. Both compare
case-insensitively against the trimmed value and accept an `excludeId` so
editing a page does not collide with itself.

## Platform-owned root-domain content

Platform administrators manage reusable Sponsor.krd-owned pages through
`/api/platform/linktrees`. The controller has separate read, create, update,
delete, and upload capabilities, uses the normal platform session and audit
guards, and never accepts a business/workspace ID from the request.

The implementation delegates page validation, template normalization, link
mapping, image rules, public-page synchronization, tombstones, and analytics
registration to the existing Linktree services. A write scope only suppresses
business subscription/template checks for the internal workspace; it does not
create a parallel Linktree implementation. Public reads
use `/api/public/platform/linktree/:identifier`, require a root-domain request,
apply the global IP rule and public rate limit, and use a separate cache key.

Platform Linktrees retain first-party public-page analytics and resolve only
the Pixel group configured in Platform Settings. They never inherit or combine
with a tenant's Pixel group; owner selection is derived from the internal
workspace rather than accepted from the request.

`GET /api/platform/linktrees/analytics/summary` reads Linktree-only totals for
the internal platform workspace. `GET /api/platform/linktrees/:id/analytics`
and `GET /api/platform/linktrees/:id/analytics/actions` accept the shared
`from`/`to` range and return the same page totals and per-button rows used by
the business analytics modal, after verifying that the Linktree belongs to the
internal platform workspace.
`DELETE /api/platform/linktrees/:id/analytics` performs the same ownership
check before clearing the page analytics and requires the platform Linktree
delete capability. Both endpoints power the shared page analytics modal rather
than a platform-specific modal implementation.

Platform campaign, archive, and publication status endpoints delegate to the
tenant-scoped Linktree service with the resolved internal workspace ID. The
browser never supplies an owner ID. Platform Linktree defaults are read from
the existing `business_defaults` and `business_branding` rows for that internal
workspace; no parallel platform page or analytics tables are used.

`DELETE /api/platform/linktrees/analytics` clears analytics for every
platform-owned Linktree and leaves other platform public routes untouched. It
uses the same delete capability and records a dedicated clear-all audit event.

## Request validation boundaries

The backend applies a global `RequestBoundaryPipe` before the global
`ValidationPipe`. UUID route identifiers and bounded pagination queries are
rejected with `400` before controller logic runs. DTO bodies use
`class-validator`/`class-transformer`; unknown DTO properties are rejected
(`whitelist` plus `forbidNonWhitelisted`) and validation errors omit the
original target and value. Both link synchronization payload formats use the
same nested DTO validation with a 500-link batch limit, HTTP(S) URL and field
limits, and UUID validation for deletion identifiers. Access-rule status and
profile-change review actions also use explicit DTOs rather than structural
object types. Upload handlers still validate multipart size, content, and
storage paths before writing files.

The HTTP boundary also applies a global response interceptor and exception
filter. Successful JSON responses expose `{ success: true, data }`; legacy raw
object fields remain mirrored temporarily for internal browser compatibility.
Failures expose a stable nested error with a machine-readable code, message,
optional validation details, and request ID. Unexpected exceptions are logged
server-side and return only `INTERNAL_SERVER_ERROR`.

## Business impersonation

`POST /api/platform/businesses/:id/impersonation` returns a single-use tenant
URL that opens that business's dashboard as the business. It requires
`platform:businesses:impersonate` and accepts an optional `reason` (200
characters), which is stored on the session row and the audit event.

The tenant side reuses `POST /api/auth/handoff`; `GET /api/auth/session`
returns a non-null `impersonation` object for the duration, and
`POST /api/auth/impersonation/exit` ends the session and returns the console
URL. `ImpersonationService` owns minting and ending; `impersonation-policy.ts`
owns what such a session may not do. See
[docs/security.md](security.md#platform-administrator-impersonation) for the
complete control set — this feature is a security boundary, not a convenience,
and that section is mandatory reading before changing it.

## Administration list queries

Platform business and billing-subscription tables use server-side pagination
and filtering. The shared list contract
defaults to 20 rows and rejects limits above 100. Responses include stable
`page`, `limit`, `total`, and `totalPages` metadata plus aggregate summaries
computed independently of the current page.

The business list is a summary projection and never includes TikTok access
tokens, pixel configuration, defaults, or default-link payloads. The platform
console loads that configuration only from the authorized single-business
detail endpoint when an administrator opens the edit flow.

The registered `phone` and `email` are part of that summary: they sit on
`businesses` and need no join, and the directory shows them on every row.
Business details that are not part of the directory projection stay
detail-only, avoiding per-row joins and keeping dashboard loading bounded.

## Persistence repositories

Persistence extraction is incremental. `AnalyticsReadRepository`,
`BusinessAdministrationRepository`, and
`BillingRepository` own the stable read projections currently shared by their
application services. Services still own response shaping, business workflows,
cache invalidation, storage coordination, and multi-statement transactions.
New reusable reads in these domains should extend the existing repository.
Do not split the SQL inside a service-owned transaction across layers unless
the complete transaction can move behind one repository operation.

## Public analytics and activity

Public clients can submit batches of up to 50 idempotent events. Supported
event names are:

```text
page_view
engaged_view
button_click
whatsapp_click
call_click
email_click
social_click
product_click
service_click
form_submit
lead_created
booking_started
checkout_started
order_completed
download
action_open
form_view
share
custom
```

The unified analytics pipeline stores visitors, sessions, events, public
pages, public actions, daily page/action rollups, attribution
fields, conversion values, consent state, and bot classification.

Of those, `CONVERSION_EVENTS` decides which count as a conversion in a
business's own reporting: `lead_created`, `order_completed`, and the three
contact taps `whatsapp_click`, `call_click` and `email_click`. The contact
taps are included because a linktree is overwhelmingly an ad landing page —
the visitor arrives from a TikTok CTA and the tap is the campaign goal. With
only the first two, a linktree could never record a conversion at all, since
no linktree event emits either.

This is the internal vocabulary only and does not change what TikTok is told:
`tiktokEvent` maps by event name, and a contact tap already resolves to its
action row's `Contact`, so the deduplication contract is untouched. The set is
applied at ingest, so rollup rows written before a change to it keep their
original numbers and a date range spanning the change is not comparable to one
before it.

Outbound registered HTTP(S) actions use
`GET /api/public/analytics/open/:pageId/:actionId` as a first-party navigation
handoff. The destination is resolved from `public_page_actions`; the endpoint
never accepts an outbound URL from the caller. It commits the same event id
used by the Pixel and browser queue before returning a `302`, which prevents a
TikTok in-app WebView from losing the internal click when it suspends the page
to open WhatsApp. Analytics failures after destination resolution fail open so
the visitor still reaches the business. Native application schemes retain the
immediate-beacon and durable-queue path.

TikTok Pixel IDs are exposed only to explicitly approved public marketing
pages, resolved by
`PublicPageAnalyticsService` and re-checked against `feature.tiktok` on every
read. TikTok Events API secrets remain encrypted server-side (see
[docs/security.md](security.md#secrets-and-encryption)). Eligible events from
those same approved page types are inserted into a durable marketing outbox; a
background processor batches them per destination, records every delivery
attempt, and retries failed work.

`GET /api/analytics/v2/tiktok/errors` returns what TikTok answered when
delivery failed, grouped by pixel, status code and message, under the same
`business:analytics:tiktok-health-read` capability as `tiktok/health`. It is a
separate endpoint because the business Dashboard reads the health summary on
every load and has no use for error rows. A permanent failure also raises a
throttled `tiktok_delivery_failure` notification for platform administrators;
`AnalyticsModule` imports `CommunicationModule` for that one call.

[docs/tracking.md](tracking.md) is the full contract: what is allowed to
report, how a browser event and a server event deduplicate, the procedure
for adding tracking to a new feature, and what happens when delivery breaks.

## Module dependencies

PostgreSQL and Redis are the only global Nest modules. Domain modules declare
authentication, billing, observability, and storage imports wherever
their controllers or providers consume those services.

`AccessRuleEnforcementService` belongs to `auth` because it protects every
authentication domain. Business and platform guards apply it after resolving
their principals; anonymous public controllers resolve the tenant or Linktree
target before evaluating it. `main.ts` applies Sponsor.krd-wide rules to endpoints without
a more specific target.

## Upload storage

Backend application code writes through `StorageService` and the injected
`LocalStorageDriver`. The default directory is:

```text
<repository>/.runtime/uploads
```

Keeping mutable uploads outside `frontend/public` prevents the Next.js
development watcher from rebuilding and resetting in-progress forms whenever
an image is uploaded. The frontend serves `/images/upload/*` exclusively from
the runtime directory. When `UPLOAD_DIR` is overridden, use an absolute path
and provide the same value to both backend and frontend processes.

Upload validation and optimization use the configured platform media policy.
The backend multipart hard limit is `MAX_FILE_SIZE_MB`. The current storage
driver is local filesystem storage; no S3, R2, MinIO, or CDN driver is
implemented. See [docs/security.md](security.md#upload-validation) for the
file-content and path-safety validation this goes through.

## Environment

Copy the example to the workspace root and replace every placeholder:

```bash
cp .env.example .env
```

The backend configuration module and migration scripts load the root `.env`,
which is the single source of truth for both applications.

Next.js only reads environment files from its own package directory, so
`frontend/.env` is generated from the root file by
`frontend/scripts/sync-env.mjs` before `dev`, `build`, and `start`. The
generator copies only the variables the frontend actually reads; database,
Redis, SMTP, Google OAuth, and administrator credentials are never written
into the frontend build context. Adding a frontend variable therefore means
adding it to the root `.env` and to that allowlist. Do not edit
`frontend/.env` by hand and do not add a `frontend/.env.local`, which Next.js
loads afterwards and which would silently override the generated values.

**Do not commit `.env`.**

### Database and Redis

| Variable                                                  | Current use                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL application connection                                |
| `DB_MAINTENANCE_NAME`                                     | Maintenance database used by migration and reset commands        |
| `DB_RESET_REQUIRE_STOPPED_BACKEND`                        | Require the backend to be stopped before reset; default `false`  |
| `DB_POOL_MAX`                                             | Maximum PostgreSQL connections per backend process; default `20` |
| `DB_IDLE_TIMEOUT_MS`                                      | Idle connection timeout; default `30000`                         |
| `DB_CONNECTION_TIMEOUT_MS`                                | Connection timeout; default `10000`                              |
| `DB_QUERY_TIMEOUT_MS`                                     | Query timeout; default `30000`                                   |
| `REDIS_HOST`, `REDIS_PORT`                                | Redis connection                                                 |

See [docs/database.md](database.md) for how these are used by `db:migrate`
and `db:reset`.

### Secrets

| Variable                    | Current use                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`            | Required 32+ character cookie/session secret and fallback cryptographic key                             |
| `APP_ENCRYPTION_KEY`        | Optional dedicated key for encrypted secrets and private communications; falls back to `SESSION_SECRET` |
| `ANALYTICS_HASH_SECRET`     | Optional visitor/contact hashing secret; falls back to `APP_ENCRYPTION_KEY`, then `SESSION_SECRET`      |
| `INTERNAL_PROXY_SECRET`     | Optional key for trusted frontend proxy metadata; falls back to `SESSION_SECRET`                         |

Use distinct generated values for all production secrets even where a
fallback exists. See [docs/security.md](security.md#secrets-and-encryption)
for exactly what each key protects.

### Server, origins, domains, and uploads

| Variable                  | Current use                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                | `development`, `production`, or `test`                                                            |
| `PORT`                    | Backend port and frontend-config fallback; backend default `4000`                                 |
| `CORS_ORIGIN`             | Comma-separated exact or wildcard origins accepted by the backend                                 |
| `CORS_ALLOWED_ORIGINS`    | Optional frontend response-header origin list; falls back to `ALLOWED_DEV_ORIGINS`                |
| `ALLOWED_DEV_ORIGINS`     | Additional hostnames accepted by the Next.js development server                                   |
| `NEXT_PUBLIC_API_URL`     | Backend base URL used by frontend server code and the development API proxy                       |
| `NEXT_PUBLIC_APP_URL`     | Absolute application URL used for generated public URLs                                           |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain used by frontend hostname routing                                                     |
| `ROOT_DOMAIN`             | Root domain used by backend tenancy, API URLs, and CORS fallback                                  |
| `PLATFORM_ADMIN_PATH`     | Private root-domain console path; at least 20 letters, digits, `_`, or `-` after trimming slashes |
| `MAX_FILE_SIZE_MB`        | Backend multipart hard limit; default `10`                                                        |
| `UPLOAD_DIR`              | Optional local-storage root override                                                              |

`NEXT_PUBLIC_APP_NAME` was removed from `.env.example`; it is not read by the
current application code.

`ROOT_DOMAIN` and `NEXT_PUBLIC_ROOT_DOMAIN` may include the frontend port in
development (`lvh.me:3011`) so that generated URLs are reachable without a
reverse proxy. `backend/src/common/root-domain.ts` owns that interpretation:
host comparisons use `rootDomainHostname`, which strips the port, because
`URL.hostname` never carries one, and origin construction takes the port from
a single source so it is never appended twice. In production both are the bare
domain (`sponsor.krd`).

Local development uses `lvh.me`, a public DNS name resolving to `127.0.0.1`
for itself and every subdomain, so tenant subdomain routing works without
hosts-file changes. Production values are listed alongside each development
default in `.env.example`.

In development, an invalid or absent `PLATFORM_ADMIN_PATH` falls back to
`/platform-console`. In production, an invalid value disables the browser
rewrite, so the console cannot be reached through a public path.

### Initial platform administrator

`PLATFORM_ADMIN_USERNAME`, `PLATFORM_ADMIN_NAME`, and
`PLATFORM_ADMIN_EMAIL` define the initial platform administrator used by the
migration seed. The email is also the exact verified-Google-email allowlist;
platform login fails closed when it is absent. `PLATFORM_ADMIN_PHONE`,
`PLATFORM_ADMIN_WEBSITE_COLOR`, `PLATFORM_ADMIN_LOGO_WITH_BACKGROUND`,
`PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND`, and `PLATFORM_ADMIN_FAVICON` provide
initial/fallback profile and branding values. Platform administrators
authenticate with Google or a root-domain email code; the seed stores no
credential of its own.

Only the current `PLATFORM_ADMIN_*` names are supported. Their typed key list
and shared reader live in `backend/src/common/platform-admin-env.ts`.

## Operational endpoints

`GET /health/live` is an unauthenticated process liveness probe and performs
no dependency work. `GET /health/ready` checks PostgreSQL, Redis, the active
storage driver, and registered background-worker heartbeats. Readiness and
`GET /internal/metrics` require the `x-operations-key` header. Configure a
distinct 32-character-or-longer `OPERATIONS_SECRET` in production; the
internal-proxy secret and then the session secret are rollout fallbacks.

The metrics response is a bounded in-process snapshot of request count,
server-error count, status classes, latency buckets, and worker runs. Values
reset when a backend process restarts and are intentionally not a durable
analytics store.

## Commands

| Command                                          | Action                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `pnpm dev:be`                                    | Start the backend in watch mode                              |
| `pnpm build:be`                                  | Build the backend                                            |
| `pnpm --filter backend start:dev`                | Run NestJS in watch mode                                     |
| `pnpm --filter backend build`                    | Compile the backend                                          |
| `pnpm --filter backend start:prod`               | Run `dist/src/main.js`                                       |
| `pnpm --filter backend lint`                     | Run ESLint without writing changes                           |
| `pnpm --filter backend lint:fix`                 | Run ESLint and apply fixes                                   |
| `pnpm --filter backend type-check`               | Run TypeScript without emitting files                        |
| `pnpm --filter backend test`                     | Run Jest unit/property/integration specs under `backend/src` |
| `pnpm --filter backend test:e2e`                 | Run the Jest e2e configuration                               |
| `pnpm --filter backend test:cov`                 | Run backend tests with coverage                              |
| `pnpm --filter backend test:communication:smoke` | Run the communication database smoke script                  |

Default local address: `http://localhost:4000`. See
[docs/testing.md](testing.md) for the combined verification workflow and
[docs/deployment.md](deployment.md) for running the built backend under PM2.

## Client Linktree access

`ClientLinktreeAccessModule` orchestrates restricted guest invitations while
delegating actual page creation to `LinktreesService`. Business routes reuse
the existing Linktree read/create/update capabilities. Guest routes derive the
business and invitation only from a hashed HttpOnly session, expose no tenant
selector, and return the current plan's effective template keys. Submission,
manual expiry, and session revocation share an advisory lock; the database
uniqueness constraint provides the final exactly-once boundary. Guest uploads
reuse the shared media policy and require database-confirmed tenant ownership;
guest analytics resolve the only permitted page from the invitation rather
than a request parameter.
