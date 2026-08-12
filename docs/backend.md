# Backend

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
membership for that exact subdomain. Conflicts are rejected and the link is
recorded in the security audit log.

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
covers the analytics/CRM/activity pipeline, upload storage, environment
configuration, and backend commands.

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
server-side and return only `INTERNAL_SERVER_ERROR`. `/api/v1` errors include
version metadata while retaining their established top-level compatibility
fields.

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

Platform business, billing-subscription, API-client, webhook, and rate-policy
tables use server-side pagination and filtering. The shared list contract
defaults to 20 rows and rejects limits above 100. Responses include stable
`page`, `limit`, `total`, and `totalPages` metadata plus aggregate summaries
computed independently of the current page.

The business list is a summary projection and never includes TikTok access
tokens, pixel configuration, defaults, or default-link payloads. The platform
console loads that configuration only from the authorized single-business
detail endpoint when an administrator opens the edit flow. API rate-policy
limits and monthly usage are joined in batch; dashboard loading performs a
fixed number of queries rather than entitlement and usage queries per tenant.

Mini-website query projection SQL and its raw database row contract live in
`mini-website.projection.ts`. The service imports this projection while
retaining normalization, validation, transaction, and tenant-ownership
orchestration. Projection changes require the focused projection and service
characterization suites.

## Persistence repositories

Persistence extraction is incremental. `MiniWebsitesRepository`,
`AnalyticsReadRepository`, `BusinessAdministrationRepository`, and
`BillingRepository` own the stable read projections currently shared by their
application services. Services still own response shaping, business workflows,
cache invalidation, storage coordination, and multi-statement transactions.
New reusable reads in these domains should extend the existing repository.
Do not split the SQL inside a service-owned transaction across layers unless
the complete transaction can move behind one repository operation.

The public business projection may include `trusted_partners`, but only from
enabled `partners` sections and enabled partner items on published mini
websites owned by that same business. The projection returns at most 24 unique,
non-empty logo records and exposes only the already-derived safe public URL;
draft, paused, archived, cross-tenant, disabled, or image-less records never
reach the homepage.

## Public analytics, CRM, and activity

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
pages, public actions, daily page/action/dimension rollups, attribution
fields, conversion values, consent state, and bot classification.

Form submissions and lead events populate the CRM model. Analytics and CRM
reads remain business scoped.

The business Dashboard reads its CRM workload through
`GET /api/analytics/v2/crm/summary`. This endpoint aggregates status counts
across every public page owned by the authenticated tenant and uses the same
`business:analytics:details-read` capability as page-scoped CRM summaries. It
does not return contact details or lead records. Its optional `from` and `to`
date bounds filter leads by creation time. The Dashboard also sends those same
bounds to `GET /api/analytics/v2/pages` and
`GET /api/analytics/v2/tiktok/health`, keeping all time-based overview results
on one range while page publication state and active Pixel connections remain
current-state facts.

TikTok Pixel IDs are exposed to two public surfaces only — the public linktree
page and the public mini website page — resolved by
`PublicPageAnalyticsService` and re-checked against `feature.tiktok` on every
read. TikTok Events API secrets remain encrypted server-side (see
[docs/security.md](security.md#secrets-and-encryption)). Eligible events from
those same two page types are inserted into a durable marketing outbox; a
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

The platform Activity page combines `security_audit_events`,
`http_request_events`, `analytics_events`, and `marketing_delivery_attempts`
— see [docs/architecture.md](architecture.md#audit-trail) for the full data
flow and retention behavior of that union.

## Module dependencies

PostgreSQL and Redis are the only global Nest modules. Domain modules declare
authentication, billing, webhook, observability, and storage imports wherever
their controllers or providers consume those services. Request tracking is
imported by the application root for its controller and bootstrap hook but is
not globally injectable.

`AccessRuleEnforcementService` belongs to `auth` because it protects every
authentication domain. Business and platform guards apply it after resolving
their principals; the developer API guard applies it after resolving the API
client; anonymous public controllers resolve the tenant or Linktree target
before evaluating it. `main.ts` applies MultiTree-wide rules to endpoints without
a more specific target.

## Upload storage

Backend application code writes through `StorageService` and the injected
`LocalStorageDriver`. The default directory is:

```text
<repository>/.runtime/uploads
```

Keeping mutable uploads outside `frontend/public` prevents the Next.js
development watcher from rebuilding and resetting in-progress forms whenever
an image is uploaded. The frontend serves `/images/upload/*` from the runtime
directory. It also reads the former `frontend/public/images/upload` location as
a compatibility fallback, including `_legacy/flat` one-segment image names.
When `UPLOAD_DIR` is overridden, use an absolute path and provide the same value
to both backend and frontend processes.

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

### Secrets and telemetry

| Variable                          | Current use                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`                  | Required 32+ character cookie/session secret and fallback cryptographic key                             |
| `API_KEY_PEPPER`                  | Optional dedicated HMAC pepper for developer API keys; falls back to `SESSION_SECRET`                   |
| `APP_ENCRYPTION_KEY`              | Optional dedicated key for encrypted secrets and private communications; falls back to `SESSION_SECRET` |
| `ANALYTICS_HASH_SECRET`           | Optional visitor/contact hashing secret; falls back to `APP_ENCRYPTION_KEY`, then `SESSION_SECRET`      |
| `REQUEST_TRACKING_SECRET`         | Optional frontend-to-backend telemetry key; falls back to `SESSION_SECRET`                              |
| `REQUEST_LOG_RETENTION_DAYS`      | Request telemetry retention; default `30`, allowed `1`–`365`                                            |
| `REQUEST_LOG_BATCH_SIZE`          | Telemetry insert batch size; default `250`                                                              |
| `REQUEST_LOG_FLUSH_INTERVAL_MS`   | Telemetry flush interval; default `250`                                                                 |
| `REQUEST_LOG_MAX_QUEUE_SIZE`      | Maximum in-memory telemetry queue; default `50000`                                                      |
| `REQUEST_LOG_CLEANUP_BATCH_SIZE`  | Rows targeted per retention batch; default `10000`                                                      |
| `REQUEST_LOG_CLEANUP_MAX_BATCHES` | Maximum batches per retention pass; default `100`                                                       |

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
initial/fallback profile and branding values. Platform password login is not
exposed, and the seed no longer requires a password.

These settings were previously named `SA_*`. Those names are still read as a
fallback so an already-deployed `.env` keeps working, but they are
deprecated — set the `PLATFORM_ADMIN_*` name and drop the `SA_*` one when
convenient. When both are present the `PLATFORM_ADMIN_*` value wins. The
resolution order lives in `backend/src/common/platform-admin-env.ts`.

## Operational endpoints

`GET /health/live` is an unauthenticated process liveness probe and performs
no dependency work. `GET /health/ready` checks PostgreSQL, Redis, the active
storage driver, and registered background-worker heartbeats. Readiness and
`GET /internal/metrics` require the `x-operations-key` header. Configure a
distinct 32-character-or-longer `OPERATIONS_SECRET` in production; the
request-tracking secret and then the session secret are rollout fallbacks.

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
