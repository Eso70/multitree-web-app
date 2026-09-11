# Architecture

## Invite-only business identity

Business identity uses invite-only Google OAuth authorization-code flow. One
fixed root-domain callback verifies PKCE, state, nonce, token signature,
issuer, audience, expiry, and verified email. Approved owners begin sign-in on
their tenant page; callback creates a 60-second, single-use Redis handoff that
tenant consumes before receiving a host-only business cookie. Durable users,
Google identities, memberships, applications, reviews, and legal acceptances
remain in PostgreSQL. Platform-administrator authentication stays separate.

## Hotspot ownership boundaries

Large feature entry points remain orchestration layers; cohesive behavior must
live behind domain modules rather than expanding those entry points further.

- Repository classes provide the initial persistence seam for the high-change
  analytics-read, business-administration, and billing domains.
  They own reusable query projections and tenant-scoped lookup SQL; application
  services retain validation, authorization-aware workflows, cache/storage
  coordination, and transaction orchestration. Mutation SQL that participates
  in an existing service transaction remains with that transaction until it can
  be moved as one cohesive repository operation.
- All presentation shared by business and platform surfaces has one
  implementation with thin surface adapters. Platform-admin-only actions are
  introduced through explicit permission or capability configuration; they do
  not justify forking the surrounding shared component, workflow, or state.
- `PlatformContentWorkspaceService` is the single resolver for the internal
  owner of all Sponsor.krd root-domain content. Feature names must not create a
  second platform workspace convention.
- `BusinessDashboard` owns page composition. Analytics-summary retrieval,
  normalization, lifecycle, and reset behavior are owned by
  `useBusinessAnalyticsTotals`. Dashboard access/profile refresh calls are
  owned by the business feature API rather than embedded transport parsing.
- Both public advertising routes read through
  `features/advertising/public-page-data.server.ts`. It owns subdomain
  resolution, the public fetches, and the branding/footer props the two
  components share. Each fetch carries its own failure handling: the business
  record and the advertising config gate the page, while the Linktree list is
  footer navigation that degrades to empty rather than
  taking a published page down.
- `lib/api/request.ts` is the neutral frontend JSON transport boundary.
  Feature API modules own endpoint paths and transport types; feature hooks own
  cancellation and local request state. Components do not define another
  response-envelope parser.
- Root-domain Linktrees reuse their existing domain rather than introducing a
  second page model. One non-customer
  `businesses.account_type='platform'` workspace owns their content,
  public-page, action, analytics, and media rows.
  `PlatformContentWorkspaceService` is the only resolver for that owner;
  platform-admin controllers never accept an owner identifier from the browser.
  Customer-facing business queries exclude this workspace explicitly.
- The same internal workspace owns the platform TikTok Pixel group and every
  platform public-page analytics identity. Customer and platform groups share
  encrypted persistence and delivery code but are selected strictly by the
  `public_pages.business_id` owner; they are never combined. Fixed marketing
  routes use `page_type='route'` identities and a positive route allowlist.

New persistence projections, renderer sections, and dashboard data lifecycles
must extend these seams instead of adding another parallel implementation to
the entry-point files.

This document is the boundary contract for the Sponsor.krd workspace. It
describes where code belongs, which dependencies are allowed, and what must
change before horizontal production scaling. The root [README.md](../README.md)
is a short summary that links here; this is the full reference. For the
concrete security controls referenced in the audit-trail section below, see
[docs/security.md](security.md).

## Request flow

```text
Browser
  |
  | root domain or business subdomain
  v
Caddy
  |-- /api/* ------------> NestJS / Fastify on :4000
  `-- all other traffic --> Next.js on :3011
                                |
                                `-- same-origin development API proxy

NestJS
  |-- PostgreSQL: durable application state
  |-- Redis: sessions, cache, and rate limits
  `-- local storage driver: uploaded files
```

The business UI and platform-administration UI are separate permission
domains. Shared behavior belongs in neutral feature or shared modules.
Backend controllers translate HTTP requests and apply authentication and
capability guards. Services own application behavior. PostgreSQL and Redis
details remain inside backend infrastructure modules.

See [Backend boundaries](#backend-boundaries) below for what each module
owns, and [Production scaling model](#production-scaling-model) for the
remaining horizontal-scaling requirements.

## Repository structure

```text
.
|-- backend/
|   |-- scripts/                         # migration, seeding, and maintenance helpers
|   `-- src/
|       |-- analytics/
|       |-- auth/
|       |-- billing/
|       |-- common/                       # dependency-free shared helpers
|       |-- communications/
|       |-- config/
|       |-- database/
|       |-- links/
|       |-- linktrees/
|       |-- platform-admin/
|       |-- public/
|       |-- redis/
|       `-- storage/
|-- frontend/
|   |-- public/                          # static assets and default local uploads
|   `-- src/
|       |-- app/                         # Next.js App Router routes
|       |-- components/                  # business, public, home, and shared UI
|       |-- features/                    # domain feature modules
|       |-- hooks/
|       `-- lib/
|-- packages/types/                      # frontend/backend transport contracts
|-- docs/                                # this reference set
|-- Caddyfile
|-- ecosystem.config.json
|-- package.json
|-- pnpm-workspace.yaml
`-- .env.example
```

## Workspace boundaries

The repository is a pnpm workspace with three independently buildable areas:

- `frontend`: Next.js user interfaces and the same-origin API proxy.
- `backend`: NestJS HTTP API and application services (Fastify adapter).
- `packages/types`: transport types shared by both applications.

Shared packages must contain transport contracts, not database access,
framework services, or UI behavior. The frontend and backend may depend on
shared packages; shared packages must not depend on either application.

Endpoint response shapes that cross the frontend/backend boundary are defined
once in `@linktree/types`. Contracts use endpoint-specific names (for example,
`PublicLinktree` and `PlatformBusinessSummary`) instead of generic database-row
names. Frontend features import these contracts directly and must not maintain
local mirrors. Values backed by configurable data, such as subscription-plan
codes, are represented as dynamic strings rather than fixed unions.

## Frontend boundaries

The frontend follows this dependency direction:

```text
app routes -> feature modules -> shared components/hooks/lib -> @linktree/types
```

Feature ownership (`frontend/src/features/`):

- `platform-admin`: platform administration screens, hooks, and types.
- `business`: business-console composition, hooks, and types.
- `link-editor`: reusable linktree editing fields, steps, validation, payload
  mapping, and editor UI.
- `templates`: template selection and management.
- `analytics`: reusable analytics presentation.
- `communications`: announcement banners, the shared notification inbox hook,
  bell dropdown/detail modal, and the business/platform-admin conversation
  panel. Business and platform adapters supply scoped endpoints and action
  routing; platform approval cards remain a permission-specific extension of
  the shared bell rather than a second inbox implementation.

Component ownership (`frontend/src/components/`):

- `business`: business-console-only presentation.
- `public`: public linktree presentation.
- `templates`: the selectable Linktree catalog.
- `analytics`, `home`, `shared`, `ui`: neutral, reusable across both
  permission domains — `shared` is the largest of these and holds the bulk of
  cross-cutting UI primitives.

Business UI and platform-administration UI must not import one another. ESLint
enforces both directions: files under `components/business/**` and
`features/business/**` may not import `@/features/platform-admin/**`, and
files under `features/platform-admin/**` may not import
`@/components/business/**` or `@/features/business/**`
(`frontend/eslint.config.mjs`). If both sides need the same behavior, move it
into a neutral feature or shared module and keep permission-specific
orchestration in the owning feature.

Do not combine screens merely because they look alike. Share visual
primitives and pure domain functions; keep API calls, permissions, state
transitions, and data contracts in their owning feature.

## Backend boundaries

NestJS modules own their HTTP controllers and application services
(`backend/src/`):

- `auth`: login, sessions, guards, capability authorization, the append-only
  security-audit writer, and the audit interceptor/decorator that record
  decorated mutations.
- `billing`: effective entitlements, quota checks, and template access.
- `platform-admin`: platform business administration and platform settings.
- `linktrees` and `links`: tenant-owned linktree behavior.
- `analytics`: ingestion, rollups, reporting, and the TikTok delivery
  outbox.
- `communications`: announcements, notifications, and conversations.
- `public`: anonymous read APIs.
- `database`: PostgreSQL access and migration infrastructure.
- `redis`: cache, sessions, and bounded key deletion.
- `storage`: a stable storage facade (`StorageService`) backed by an injected
  `STORAGE_DRIVER` provider token.
- `observability`: public process liveness, protected dependency readiness,
  bounded in-process HTTP/worker metrics, and worker heartbeat registration.
- `config`: global environment-variable validation (Joi schema, loaded once
  at startup) and a Caddyfile smoke test.
- `common`: dependency-free helpers shared across modules.

There is no generic `queue` module. Background processors stay with the
feature that owns their work: `analytics` runs the TikTok delivery outbox and
`analytics` owns its TikTok delivery outbox and database flush.

Controllers translate HTTP requests and enforce guards/capabilities. Business
rules and transactional workflows live in services. Repositories own reusable
PostgreSQL query projections for domains that have adopted the persistence
seam. Database and Redis implementation details must not leak into frontend
contracts.

Global HTTP response handling lives in `common/api-response*`. Controllers and
guards throw framework exceptions or return success values; the boundary owns
JSON envelopes, validation-detail normalization, request correlation, and safe
unexpected-error handling.

Only `DatabaseModule` and `RedisModule` are global because they are universal
infrastructure. Authentication, billing, and observability
are ordinary modules. A domain that injects one of their
exported providers must list that module in its `imports`; `AppModule` imports
controller-owning modules but does not act as a service locator for domain
providers.

Platform settings and business administration are separate services even
though they share the same administrator role. This keeps unrelated data and
permissions from becoming one oversized service.

## Authentication and authorization

Authentication establishes either a `business` or `platform-admin` principal.
Authorization then checks explicit capabilities such as
`business:linktrees:manage` or `platform:businesses:manage`. The full
authorization chain, session/cookie configuration, and encryption details are
documented in [docs/security.md](security.md).

The configured browser path for the platform console reduces automated
discovery but is not a security boundary. Cookies, server-side sessions,
origin validation, tenant binding, guards, capabilities, and rate limiting
remain the actual controls.

Public analytics lives in the unified pipeline: `analytics_events` joined to
`public_pages`, with idempotent event IDs and indexed business/page ownership.
TikTok delivery uses the dedicated marketing outbox and delivery-attempt
tables described in [docs/tracking.md](tracking.md).

The superseded `page_views`, `link_clicks`, `analytics_totals`,
`integration_delivery_events` and other legacy analytics tables — along with
four legacy analytics
helper functions and the `links.click_count` column — are not created by the
current consolidated schema. No application code reads or writes any of
them. Databases that predate the unified pipeline are baselined rather than
replayed, so they never executed that cutover either.

## Data and migrations

PostgreSQL is the durable source of truth. Redis is disposable acceleration
and session infrastructure; cache-clearing operations delete only
owned key patterns and must never flush unrelated Redis data.

The complete PostgreSQL definition is maintained in the numbered files under
`backend/src/database/migrations/baseline/`. `pnpm db:migrate` applies those
parts transactionally to a fresh database and records the compatibility ledger
name `full_schema.sql`. Ordinary live-compatible changes are delivered as dated
forward migrations in `backend/src/database/migrations/`; periodic deliberate
rebaselines fold their final state into the numbered baseline and remove the
absorbed files. Production startup never applies schema changes.

An existing database is baselined only after its required tables, columns,
indexes, removed columns, and catalog data pass compatibility checks. A
partial, outdated, or unknown database, or one with ledger rows that do not
include `full_schema.sql`, is rejected without a baseline row or automatic
repair. The retention, media, and communications helpers now perform data/seed
work only; they do not execute
DDL outside the migration ledger.
For a changed schema, recreate disposable databases with `db:reset`. Valuable
databases require a separately reviewed backup, transfer, and replacement
procedure; `db:reset` is never a live upgrade mechanism. See
[docs/database.md](database.md) for the full schema catalog and the
operational detail of `db:migrate`/`db:reset`, and
[docs/deployment.md](deployment.md) for the hosted-update procedure.

## Storage

Application code uses `StorageService`, not the filesystem directly.
`LocalStorageDriver` provides the current single-server upload behavior. See
[docs/backend.md](backend.md#upload-storage) for the current upload directory,
size limits, and validation.

For multiple backend/frontend nodes, implement an object-storage driver for
S3, R2, or MinIO, register it against the `STORAGE_DRIVER` injection token in
`storage.module.ts`, migrate existing uploads, and serve uploads through a
shared public origin or CDN. The service contract should remain unchanged.

## Production scaling model

The application code can run as multiple stateless processes when all
instances share PostgreSQL and Redis. The following infrastructure work is
still required before calling the deployment horizontally scalable:

1. Replace local upload storage with shared object storage.
2. Put PostgreSQL behind an appropriate connection pooler and set
   per-instance pool limits. The application exposes `DB_POOL_MAX` and
   database timeout controls, but the infrastructure connection budget must
   still be chosen for the hosted database.
3. Move retry-sensitive external event delivery to a durable queue or
   transactional outbox.
4. Export the existing structured request logs and bounded operational metrics
   to centralized log/metric storage, then add distributed traces and alerts.
5. Exercise backup restore, migration rollback strategy, and multi-instance
   failover in staging.

These are intentional production infrastructure steps, not reasons to couple
application features. New code must preserve the boundaries above.
