# Security

## Invite-only Google business authentication

Business password authentication has been removed outright: there is no
password route, no password field on any DTO, and no `password_hash` column on
`businesses` or `platform_admins`. Manual account-provisioning HTTP routes are
likewise gone. Platform administrator creates a random 256-bit invitation; only
its SHA-256 hash is stored, and it expires after 24 hours by default. The
`SIGNUP_INVITATION_TTL_HOURS` setting accepts 1 through 168 hours. Valid invitation
creates exactly one durable application and owner identity. Repeated OAuth
completion resumes that application instead of creating another tenant.

Google authentication uses authorization code flow with PKCE, 256-bit state,
and separate nonce. OAuth state is stored in Redis for ten minutes and
atomically consumed once. Backend verifies ID-token RS256 signature against
Google's rotating JWK set plus `iss`, `aud`, `exp`, nonce, `email_verified`,
and stable Google `sub`. A verified Google identity may link to an email-signup
owner only when the normalized email matches exactly, the signup application
is already approved, and that same user has an active membership in the exact
requested business subdomain. Existing or conflicting Google identities fail
closed, and successful first-time links are audited. An arbitrary email match
without those durable ownership checks never links an account.

Approved owners start sign-in on business subdomain. Fixed root callback
issues random one-use handoff stored in Redis for 60 seconds and bound to exact
business/subdomain. Tenant consumes it and receives host-only
`business_session`. Business session tokens are random 256-bit values;
PostgreSQL and Redis keys store SHA-256 token hashes. A business may keep at
most five active sessions; creation trims the oldest excess session. The UI
derives a friendly browser/OS label from the stored user agent and shows IP,
activity, expiry, and remembered status. It does not create a persistent device
fingerprint.

Approved active business members may instead request a six-digit code on that
same tenant login page. Lookup is bound to the normalized email and exact active
subdomain, while the public response remains the same for unknown accounts.
Codes are generated cryptographically, stored only as a keyed hash in Redis,
expire after ten minutes, allow five attempts, have a 60-second resend
cooldown, and are atomically consumed. Request rate limits apply per IP and per
hashed email. Successful verification creates the same host-only
business session as Google. SMTP credentials remain server-only.

This document describes MultiTree's actual security implementation: what
mechanism protects what, where it lives in the code, and where it currently
falls short. The root [README.md](../README.md) is a short summary that
links here; this is the full reference. For the routing/tenancy model, see
[docs/frontend.md](frontend.md#routing-and-tenancy). For the generic
security principles every change is expected to follow, see the Security
Rules section of [AGENTS.md](../AGENTS.md).

Every claim below is grounded in the current source. Where a limit or
threshold is stated as a number, that number was read directly from code, not
assumed.

## Authentication

Business owners use Google OAuth or a tenant-bound email code; platform
administrators use Google OAuth or a root-domain email code; invite sign-up
supports Google OAuth or an invitation-checked email code. No password login
endpoint exists on any surface. Platform Google login begins at
`GET /api/platform/auth/google/start` on the root domain and returns through
the fixed Google callback shared by business authentication. OAuth state is
PKCE-protected, Redis-backed, single-use, and expires after ten minutes.

Platform access requires a verified Google email that exactly matches
`PLATFORM_ADMIN_EMAIL` and resolves to the seeded `platform_admins` row, or an
email code sent only to an email that matches both a `platform_admins` row and,
when set, the same allowlist. Any other email is rejected before session
creation and the attempt is audited.
The former `POST /api/platform/auth/login` password route is removed along
with the credentials it checked, so it cannot bypass this allowlist. Google starts are limited to five attempts per
IP per five minutes and continue through `platform_admin` access rules. The
OAuth session cookie uses `SameSite=Lax` so it survives Google's top-level
callback; single-use state and PKCE protect that callback from login CSRF.

- Platform Google starts are Redis-rate-limited to five attempts per IP per
  five minutes. Google and email login accept the same explicit private-device
  choice; it changes session lifetime only and never bypasses identity checks.
- Successful Google login creates a durable platform session, caches it in
  Redis, revokes every older platform session, and records a security audit
  event with the Google provider marker.
- Sessions are stored durably in Postgres (`business_sessions` /
  `platform_admin_sessions`) and cached in Redis with a cache-aside pattern: a
  Redis miss falls back to Postgres and re-populates the cache.
- Business session TTL is 12 hours normally or 30 days when remembered. Up to
  five sessions may coexist and each non-current session can be revoked.
- Platform session TTL is 30 minutes normally or 7 days when remembered. A new
  platform session still revokes every older platform session.
- Cookies are `httpOnly`, host-only (no `domain` attribute), and become
  `secure` automatically over HTTPS. The business cookie (`business_session`)
  uses `SameSite=Lax`; the Google-issued platform cookie does too. Both remain
  host-only and HttpOnly.
- `BusinessGuard` re-derives the subdomain from the request (`x-subdomain`
  header or `Host`) on **every** protected request, not just at login, and
  rejects if it no longer matches the subdomain stored in the session. A
  session issued on one subdomain cannot be replayed against another. The
  `x-subdomain` header itself is trusted only when paired with a matching
  `x-tenant-proxy-key` header proving the request came from the Next.js
  proxy (`backend/src/common/internal-proxy-trust.ts`, constant-time
  comparison against `REQUEST_TRACKING_SECRET`/`SESSION_SECRET`); Caddy
  strips any inbound `x-subdomain` before it reaches either process, but
  that is infrastructure, not application, defense, so a caller that
  reaches the backend directly without the proxy key falls back to `Host`
  parsing instead of an unverified header.

## Authorization

`AuthorizationGuard` reads the `@RequireCapabilities` metadata on a route and
short-circuits to allowed for an authenticated platform administrator —
platform-admin authorization is all-or-nothing; there is no capability system
on that side, only session validity and role.

For a business principal, `AuthorizationService.authorizeBusiness` runs a
fixed chain, in this order, and stops at the first failure:

1. the authenticated business ID matches the resource's owning tenant;
2. the business status is `active`;
3. the subscription status is `trialing`, `active`, or `grace_period`, and has
   not expired;
4. no matching row exists in `platform_permission_denies` (an explicit,
   emergency-use deny that overrides everything else);
5. the effective plan/permission-profile rule allows the capability;
6. any per-field access-mode restriction on the specific fields being
   written;
7. any required entitlement (`billing_entitlements`) is present;
8. any quota (`quotaKey`) has remaining usage;
9. if the rule says the action requires approval rather than a flat allow, a
   `permission_approval_requests` row is created instead of applying the
   change immediately. Business settings are the exception: `updateSettings`
   deliberately ignores an `approval` outcome and applies the change, because
   profile edits are governed by the 30-day cooldown below rather than by
   review.

This is the literal implementation of "capability rules + subscription
entitlements + field rules + approval requirements + quotas" — all five exist
and are combined in one function, not distributed guesswork across the
codebase. The resolved policy (permissions, entitlements, templates, pending
approvals) is cached per business in Redis for 60 seconds and explicitly
invalidated on policy-changing writes.

`business:mini-websites:create` is distinct from Linktree creation. Both create
capabilities use the backward-compatible `limit.linktrees` entitlement, whose
product meaning is the maximum number of active public pages. Its authoritative
usage is one database query that counts Linktrees plus non-archived
mini-websites for the authenticated business. The seeded plan limits are five
public pages and one active TikTok Pixel group for Basic, twenty public pages
and two Pixel groups for Pro, and unlimited public pages plus three Pixel
groups for Ultra.

Only the Ultra plan grants `business:profile:update`. Basic and Pro cannot
submit profile changes.

Every field the profile section owns — `name`, `username`, `phone`, `logo`,
`favicon`, `default_avatar`, `website_color` — applies immediately and then
locks the whole section for 30 days (`PROFILE_CHANGE_COOLDOWN_DAYS`). Changing
any one field locks all of them: there is a single `businesses.profile_changed_at`
timestamp, so editing only the website color locks the logo and the name too.

Profile approval is removed outright, not merely switched off by plan
configuration. `AuthController.updateSettings` no longer creates approval
requests for any settings section — an `approval` outcome from a plan
configuration that predates the cooldown is treated as allowed rather than
trusted to be absent — and the platform-console review panel, its two routes,
its service methods, and its DTO are deleted. The cooldown is therefore the only
limit on how often a business can rebrand, so it is enforced server-side in
`updateBusinessSettings`, inside the same `profile-change:<businessId>` advisory
lock that guards the monthly quota, and it triggers on a real value difference
rather than on which keys the client submitted. A client that omits the fields,
or resubmits them unchanged, neither starts nor trips the window. The frontend
disables the inputs and shows the unlock date, but that is a convenience:
failing open there only costs a rejected save.

`2026-08-13_profile_change_cooldown.sql` cancels the requests still queued when
it runs — `rejected` in `business_profile_change_requests`, `canceled` in
`permission_approval_requests` — because nothing can review them any more.
The `platform:businesses:profile-requests:*` capabilities keep their catalog and
plan rows so existing grants stay valid, but no route uses them.

The verified owner account name and email are shown read-only in the profile
tab through the shared `BusinessOwnerIdentityFields`. They come from the active
owner membership rather than the business record, so the settings page,
first-login setup, and platform business editing all name the same account.

Settings authorization and approval payloads include only values actually
provided by the client. Optional DTO properties whose value is `undefined`
must be removed first; otherwise an absent optional property can be mistaken
for a submitted one and block an unrelated branding edit.

## Platform-administrator impersonation

A platform administrator holding `platform:businesses:impersonate` can open a
business dashboard as that business without the owner's credentials and
without resetting anything. The capability is separate from
`platform:businesses:read` and is registered as `critical`, so it can be
withheld through `platform_permission_denies` from administrators who only
need to view businesses.

`POST /api/platform/businesses/:id/impersonation` does not return a
credential. It stores a single-use payload in Redis under the SHA-256 digest
of a 32-byte code with a 60-second TTL — the same `auth:handoff:` mechanism
Google sign-in uses — and returns the tenant URL carrying that code. The
tenant's existing `POST /api/auth/handoff` endpoint is the only thing that
turns a handoff into a session, so there is exactly one code path that writes
a `business_session` cookie. `auth-handoff.ts` owns the key and payload
contract; `kind` distinguishes the two flows.

The resulting session is deliberately weaker than an owner session:

- **Tenant access, not platform access.** It carries `role: 'business'`, so
  the business's plan entitlements, quotas, field-level rules, and approval
  requirements apply exactly as they do for the owner. Impersonation never
  confers the platform administrator's own authority inside the tenant.
- **Short and never remembered.** 30 minutes
  (`IMPERSONATION_SESSION_TTL_SECONDS`), with `remembered` forced to `false`
  regardless of what the caller asks for.
- **Unattributed.** `business_sessions.user_id` is `NULL`, so administrator
  activity is never recorded as a specific owner's work.
- **Marked in PostgreSQL, not only in Redis.**
  `impersonated_by_platform_admin_id`, `impersonation_reason`, and
  `impersonation_started_at` are part of the session lookup projection, so a
  cache eviction cannot rebuild a borrowed session as an ordinary one.
- **Restricted.** `impersonation-policy.ts` is the single denylist, applied in
  `BusinessGuard` because every business route passes through it. It currently
  blocks plaintext readback of stored tenant secrets
  (`GET /api/auth/tiktok/:id/secret`) and revoking business sessions from
  inside the tenant (`DELETE /api/auth/sessions[/:id]`) — both remain
  available to the administrator through audited platform routes. Route
  handlers must not add private exceptions; widen or relax the policy in that
  one file.
- **Disclosed.** The owner's own device list
  (`getBusinessLoginSecurity`) includes impersonated sessions with the
  administrator's name, and the dashboard renders a non-dismissible banner for
  the whole session.
- **Bounded.** Impersonated rows are excluded from the five-session
  per-business cap in both directions, so opening a dashboard can never evict
  a real owner session.

Both the start request and the session cookie are minted independently of the
administrator's own root-domain console session. Business cookies are
host-only, so the two coexist and `POST /api/auth/impersonation/exit` returns
to an untouched console session.

Audit coverage is three events: `platform.business.impersonation.request` from
the route interceptor, `platform.business.impersonation.start` (including
`failure` outcomes for an inactive or subdomain-less target) and
`platform.business.impersonation.end` from `ImpersonationService`. Every
mutation performed during the session keeps the business as its effective
actor and additionally carries `impersonatedByPlatformAdminId` and
`impersonatedByPlatformAdminName` in its audit metadata.

Starting impersonation is rate limited to 10 attempts per administrator per
five minutes, requires an available Redis, and is refused for a suspended
business or one without a subdomain — the shared session lookup resolves
active businesses only, so such a session would silently stop working when its
cache entry expired.

## Secrets and encryption

`SecretCryptoService` derives its key as `sha256(APP_ENCRYPTION_KEY ||
SESSION_SECRET)` — the fallback chain described in
[docs/backend.md](backend.md#secrets-and-telemetry) is real, not
aspirational. Encryption is AES-256-GCM with a random
12-byte IV per call and the auth tag stored alongside the ciphertext. The
stored payload is versioned (`[version byte][iv][tag][ciphertext]`); a legacy
unversioned value is still read back as plaintext, which is the migration
path from an earlier unencrypted format.

This service encrypts TikTok Events API tokens and webhook signing
secrets/URLs at rest — both are decrypted only at the point of use (sending a
marketing event, delivering a webhook).

A business's TikTok credentials live in `business_tiktok_pixels` and nowhere
else: `encrypted_events_token` holds the ciphertext and `token_last_four`
holds the only readable fragment, which exists so an operator can tell a
configured token from a missing one. A `business_tiktok` mirror table used to
be written beside it, holding the same token in a plain `text` column and
again inside a `configs` jsonb blob; it has been removed, along with its five
write sites and two readers. `schema-secrets.spec.ts` fails if a second table
holding a pixel, or a plaintext `events_token` column, is reintroduced.

Developer API keys are handled differently and more strictly: they are
**not** encrypted for later retrieval. A key is HMAC-SHA256 hashed with
`API_KEY_PEPPER` (falling back to `SESSION_SECRET`) at creation, only the hash
is stored, and an incoming request's key is checked with a constant-time
(`timingSafeEqual`) comparison. The raw key is shown to the business exactly
once, at creation, and cannot be recovered afterward.

## Audit logging

`SecurityAuditService.record()` inserts append-only rows into
`security_audit_events`. Recording is wrapped in its own try/catch that only
logs a warning on failure — a broken audit write never blocks or fails the
request being audited, by explicit design.

`AuditInterceptor` fires automatically on any handler annotated with
`@AuditEvent(...)`, recording both success and failure outcomes. It strips a
fixed set of sensitive field names before logging changed fields — `password`,
`password_hash`, `current_password`, `new_password`, `events_token`, `token`,
`session_token` — and logs field _names_ only, never values, and never full
request or response bodies. Submitted IP addresses are validated before
storage; unparsable values are stored as `null` rather than raw.

Audit rows are permanent and append-only at the application boundary. There
is no update or delete path, and `DataRetentionService` never counts or purges
`security_audit_events`. The administrator-editable retention policy contains
no audit-log duration.

## CSRF / origin protection

The backend checks each request's `Origin`/`Referer` against the effective request
origin for cookie-authenticated mutations (not `GET`/`HEAD`/`OPTIONS`). A mismatch
is rejected with `403 Invalid request origin`, including production `/api/*` traffic
that Caddy routes directly to NestJS. The Next.js API proxy applies the same policy
when a request passes through Next.js.

If neither `Origin` nor `Referer` is present at all, the check allows the
request — it is specifically targeting cross-site _browser_ forgery, where a
browser reliably sends `Origin` on a cross-site mutating request. This check
plus `SameSite=Lax`/`Strict` cookies together are the CSRF defense; neither
alone is a complete answer, and unusual non-browser clients replaying a stolen
cookie are only covered by the `SameSite` cookie policy and standard session
theft mitigations, not this header check.

## Rate limiting

- Login: see [Authentication](#authentication).
- Developer API requests: a per-minute limit (default 60 if no
  `api_rate_limit_policies` row exists for the client) enforced with a
  UTC-minute-keyed Redis bucket whose TTL is the number of seconds remaining
  in that minute. A new fixed window starts at the next minute boundary.
- Developer API monthly quota: checked against summed `api_usage_daily`
  rows; a policy can enable automatic suspension, which flips the API
  client's status to `suspended` once the quota is exceeded.
- Public analytics ingestion: `POST /api/public/analytics/events` uses an
  IP-keyed Redis rate limit of 180 requests per 60 seconds and returns HTTP
  `429` when the limit is exceeded.
- Other anonymous endpoints, including public page reads, do not currently
  have a general-purpose or dedicated rate limiter.

## Input validation

`main.ts` installs a centralized request-boundary pipe and a global
`ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and
`transform: true`. Unknown DTO fields are rejected with `400`; validation
errors omit the original target and value. UUID route parameters and bounded
pagination queries are rejected before controller logic. Controllers use
explicit DTOs for bodies, nested arrays, and enum actions; business services
remain responsible for business rules, not malformed-input parsing.

Link synchronization is capped at 500 items per array. Each nested link has
bounded text fields and an absolute HTTP(S) URL, and batch deletion identifiers
must be UUIDs. These checks apply consistently to business and developer API
routes, including the legacy-compatible batch payload shape.

Platform administration list responses follow least-privilege projections.
In particular, `GET /api/platform/businesses` excludes decrypted TikTok event
tokens, pixel configuration, default-link data, and other edit-only settings.
Those fields are returned only by the guarded single-business detail route.
All high-volume administration lists are bounded to at most 100 rows per
request.

Database access is parameterized (`$1`, `$2`, ...) throughout the service
files exercised during this review, spanning authentication, authorization,
sessions, webhook delivery, API-key handling, and data retention. No
string-concatenated SQL was found in any of them.

## Upload validation

`StorageService` / `LocalStorageDriver` enforce validation at two independent
layers:

- **File content**: `validateImageUpload` checks actual file magic bytes
  (JPEG, PNG, or ICO signatures) against the declared type — not the
  filename extension or the `Content-Type` header — and rejects anything
  else. This is applied consistently at every upload call site in the
  codebase (business auth, linktrees, mini-websites, platform business
  administration, platform settings, developer API assets).
- **Path safety**: the storage driver resolves the target key and asserts the
  result stays within its configured root directory before writing, and the
  frontend's upload-serving route independently rejects `..`, `~`, and a
  leading `/` in the requested path, then re-checks the resolved absolute
  path against the upload directory before serving a file. Both sides
  protect against path traversal, not just one.

Three enforcement points protect upload size: the Next.js same-origin API
proxy rejects an oversized declared or actual request body before forwarding,
the Fastify multipart hard limit (`MAX_FILE_SIZE_MB`, default 10 MB) rejects
oversized multipart streams, and the
platform media policy (default 5 MB, JPEG/PNG/ICO only, 82% quality, 2048px
max dimension, unused-asset cleanup after a 72-hour grace period), which is
admin-configurable and sits under the hard limit.

Upload rejection is final: clients must never convert a rejected file to a
base64/data URL or use another fallback that bypasses storage validation.
Unsupported declared media types return 415, files whose declared supported
type does not match their magic bytes return 422, and oversized payloads return
413 through the normal safe API error envelope. Parser details are not exposed.

## IP allow/deny rules

`access_rules` supports six scopes, enforced at the database level via a
`CHECK` constraint: `multitree`, `platform_admin`, `business`, `business_admin`,
`public_linktree`, `business_api`. The platform console can fully manage
these rules (list, create, update, enable/disable, delete).

`AccessRuleEnforcementService` enforces active, unexpired rules using
PostgreSQL's native `inet`/`cidr` containment operator. Enforcement covers
MultiTree-wide endpoints, platform-administrator login and guarded requests, business
login and guarded requests, developer API clients, public business reads,
public Linktrees, public mini-websites, and public analytics ingestion. Every
winning match increments
`match_count` and updates `last_matched_at`.

Rule resolution is deterministic. The most specific applicable scope wins
(`public_linktree`, specialized admin/API scope, business, then `multitree`), then
the longest network prefix. A deny wins only when scope and prefix specificity
are equal. An explicit host allow such as `/32` can therefore override a
broader denied subnet, while an equally specific conflict fails closed.

## Webhook security

Webhook delivery (`api-platform`) validates a destination URL before every
attempt, not just at creation: it must be `https:`, may not contain
credentials or a custom port, and its resolved hostname/IP (checked at
delivery time, including DNS resolution) must not be `localhost` or a
private/loopback/link-local address, covering both IPv4 and IPv6 ranges.
Redirects are disabled on the delivery request (`redirect: 'error'`) so a
target cannot pass validation and then redirect the request into an internal
network afterward. Delivery has a 10-second timeout.

Deliveries are signed with HMAC-SHA256 over `${unixTimestamp}.${jsonBody}`,
sent as `x-multitree-signature: v1=<hex>`. Failed deliveries retry up to 6
times with backoff of 1m / 5m / 30m / 2h / 6h / 12h. An endpoint is
automatically disabled after 20 consecutive failures.

## Security headers and CORS

Backend CORS (`main.ts`) matches each configured `CORS_ORIGIN` entry exactly
or as a single-level wildcard subdomain pattern, plus a development-only
localhost fallback and a root-domain-and-subdomains fallback that requires
HTTPS in production. `credentials: true` is enabled. Requests with no
`Origin` header (server-to-server calls, curl, the developer API) are always
allowed — expected, since CORS defends browsers, not arbitrary HTTP clients.

**The backend sends no browser security headers of its own** — there is no
Helmet or equivalent middleware in `backend/src`. All of the following are
set by the Next.js frontend (`next.config.ts` and `proxy.ts`), and therefore
only protect traffic that goes through the frontend origin:
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, a `Content-Security-Policy`
with `frame-ancestors 'none'`, and — production only —
`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

`X-XSS-Protection` is deliberately not sent. The XSS Auditor it controlled
has been removed from every current browser, and in the versions that did
ship it the filter introduced its own side-channel leaks. The CSP is the
actual defense.

The proxy generates a cryptographically random nonce for every rendered
request, places the same policy in the request and response headers, and lets
Next.js apply that nonce to its streamed runtime scripts. `script-src` uses
the nonce plus `'strict-dynamic'` and does not include `'unsafe-inline'`.
Development alone includes `'unsafe-eval'` for React Refresh and debugging;
production does not. TikTok initialization is bundled application code and
loads only the external TikTok SDK, rather than injecting an inline bootstrap.
`style-src` still permits inline styles because several visual templates use
runtime style elements; that permission does not apply to scripts.

## Data retention

Request-log retention defaults to 30 days (`REQUEST_LOG_RETENTION_DAYS`,
range 1–365). Separately, `platform_data_retention_settings` gives a platform
administrator independent, configurable day-counts for three operational
buckets — request log, API history, and communication history — enforced by a
background job that runs automatically at most every 15 minutes when a
bucket is due, with manual-run support and a logged history in
`platform_data_retention_runs`. The API-history bucket purges completed and
failed webhook events and expired linktree schedules. The communications
bucket purges only already-read, archived, or expired rows — never active
conversations.

## Secret scanning

The security workflow runs Gitleaks against the complete Git history on every
push and pull request. `.gitleaksignore` contains only exact fingerprints for
reviewed false positives: test-only session tokens, template placeholders, a
test guard value, and fixed public seed identifiers. It does not exclude a
path, detector rule, or class of values. New findings therefore continue to
fail CI and must be investigated before any new fingerprint is added.

Environment templates keep secret values empty. Real values belong only in the
ignored root `.env` or the deployment platform's secret store; the generated
`frontend/.env` receives only its explicit frontend allowlist.

## Dependency install scripts

Installing a dependency normally lets it execute arbitrary `preinstall`,
`install`, and `postinstall` scripts on the machine running `pnpm install` —
developer laptops and CI runners alike. The root `package.json` restricts
that with `pnpm.onlyBuiltDependencies`, which allows build scripts for
exactly four packages that genuinely need to compile or fetch a native
binary: `bcrypt`, `msgpackr-extract`, `sharp`, and `unrs-resolver`. Every
other package in the tree is installed without running its scripts.

The key must stay in the root `package.json`. pnpm reads settings from
`package.json` in the version pinned by `packageManager` (pnpm 9); the
`pnpm-workspace.yaml` settings block is a pnpm 10+ feature and is ignored
there. Adding a dependency that legitimately needs a build step means adding
it to this list deliberately, which is the intended review point.

## Resolved security findings

The August 2026 security-hardening migration closed the five findings that
were previously listed here: password authentication has since been removed
entirely, access rules are enforced, audit rows are excluded from retention cleanup,
developer API fixed-window keys expire at the minute boundary, and production
scripts use request nonces instead of `'unsafe-inline'`. Regression coverage
for these boundaries is listed in [docs/testing.md](testing.md).
