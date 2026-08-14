# Future Feature: Separate Platform and Tenant Domains

## Status

**Planned for the future. Not implemented.**

This document records the intended architecture for hosting the MultiTree
platform and business tenants on different root domains. It is a design and
migration reference, not a description of current behavior.

## Objective

MultiTree should be able to use one domain for the platform itself while
keeping every business on a separate tenant domain.

Example target:

| Surface                        | URL                                              |
| ------------------------------ | ------------------------------------------------ |
| Public MultiTree website       | `https://multitree.com`                          |
| Business signup                | `https://multitree.com/join`                     |
| Platform administrator console | `https://multitree.com/<private-console-path>`   |
| Google OAuth callback          | `https://multitree.com/api/auth/google/callback` |
| Tenant apex                    | `https://sponsor.krd`                            |
| Business public website        | `https://acme.sponsor.krd`                       |
| Business login                 | `https://acme.sponsor.krd/business/login`        |
| Business dashboard             | `https://acme.sponsor.krd/business`              |

`multitree.com` is the **platform domain**. `sponsor.krd` is the **tenant root
domain**. A business subdomain remains globally unique within the tenant root.

## Why a Code Change Is Required

The current system treats one configured root domain as both:

1. the root of the MultiTree platform; and
2. the suffix used for business subdomains.

That assumption exists in frontend hostname routing, backend tenant
resolution, generated URLs, onboarding redirects, OAuth handoffs, CORS
fallbacks, and API responses. Changing only `ROOT_DOMAIN` or
`NEXT_PUBLIC_ROOT_DOMAIN` would therefore produce incorrect links or route one
of the two domains incorrectly.

`APP_BASE_URL` is also currently used to build both root URLs and tenant URLs.
If it points to `multitree.com`, a tenant handoff can incorrectly become
`acme.multitree.com`. If it points to `sponsor.krd`, platform signup and root
links can incorrectly remain on `sponsor.krd`.

The domains must be represented as two explicit concepts instead of inferred
from one value.

## Proposed Configuration

Use names that communicate ownership and avoid the ambiguous term `root`:

```env
# Platform/control-plane origin
PLATFORM_BASE_URL=https://multitree.com
NEXT_PUBLIC_PLATFORM_URL=https://multitree.com

# Business/tenant namespace
TENANT_ROOT_DOMAIN=sponsor.krd
NEXT_PUBLIC_TENANT_ROOT_DOMAIN=sponsor.krd

# Fixed OAuth callback on the platform domain
GOOGLE_OAUTH_REDIRECT_URI=https://multitree.com/api/auth/google/callback

# Explicit browser origins; do not rely only on fallback behavior
CORS_ORIGIN=https://multitree.com,https://www.multitree.com,https://sponsor.krd,https://*.sponsor.krd
CORS_ALLOWED_ORIGINS=https://multitree.com,https://sponsor.krd
```

Production secrets continue to come from the deployment secret store. They
must never be placed in committed environment files.

### Compatibility transition

During migration, existing variables may be read as temporary fallbacks:

| Current variable          | Temporary fallback for           |
| ------------------------- | -------------------------------- |
| `APP_BASE_URL`            | `PLATFORM_BASE_URL`              |
| `NEXT_PUBLIC_APP_URL`     | `NEXT_PUBLIC_PLATFORM_URL`       |
| `ROOT_DOMAIN`             | `TENANT_ROOT_DOMAIN`             |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `NEXT_PUBLIC_TENANT_ROOT_DOMAIN` |

Fallbacks should emit a startup deprecation warning without logging values.
After all environments are migrated, remove the old variables and fallback
code in a later release.

## Domain Responsibilities

### Platform domain

The platform domain owns:

- the MultiTree marketing and root landing pages;
- invitation entry and business signup;
- legal terms and privacy pages;
- the platform administrator login and console;
- Google OAuth start and callback endpoints;
- root-domain email-code authentication;
- platform sessions;
- creation of one-time tenant authentication handoffs.

Business dashboard routes must not be served on the platform domain.

### Tenant root domain

The tenant root and its wildcard subdomains own:

- business public landing pages;
- public Linktrees and mini websites;
- business advertising pages where enabled;
- business login and dashboard routes;
- tenant-scoped email-code authentication;
- consumption of one-time authentication handoffs;
- host-only business sessions.

The platform console and signup flow must not be served from business
subdomains.

The tenant apex (`sponsor.krd`) should have an explicit product decision. The
recommended behavior is a small branded informational page that links to
`multitree.com`, rather than treating the apex as a business or duplicating the
full platform site.

## URL Construction

All URLs should be produced by shared, typed helpers. Feature services must not
concatenate domains directly.

Required concepts:

```ts
platformUrl(path);
tenantOrigin(subdomain);
tenantUrl(subdomain, path);
isPlatformHost(hostname);
extractTenantSubdomain(hostname);
isTenantHost(hostname);
```

Expected output:

```text
platformUrl('/join')
  -> https://multitree.com/join

tenantUrl('acme', '/business/login')
  -> https://acme.sponsor.krd/business/login
```

Only validated database subdomains may be passed to tenant URL builders. URL
builders must reject invalid labels, credentials, paths that change origin,
and unexpected schemes.

## Authentication Flow

### Business signup

1. The invitation opens on `multitree.com`.
2. Google OAuth or email-code signup completes on the platform domain.
3. The application is reviewed by a platform administrator.
4. Approval assigns a business subdomain under `sponsor.krd`.
5. The user opens `https://<name>.sponsor.krd/business/login`.

Invitation, approval, expiration, and legal links must always use the platform
base URL.

### Business Google sign-in

1. Sign-in begins on `https://acme.sponsor.krd/business/login`.
2. The browser is redirected to Google.
3. Google returns to the fixed callback on `multitree.com`.
4. The backend verifies state, PKCE, nonce, identity, membership, and the exact
   requested tenant.
5. The callback creates a short-lived, single-use handoff bound to `acme`.
6. The browser is redirected to
   `https://acme.sponsor.krd/business/auth/consume?code=...`.
7. The tenant consumes the handoff and receives a host-only business session.

The handoff must remain single-use, short-lived, cryptographically random, and
bound to the exact tenant. It must never contain a session token in plaintext.

### Business email-code sign-in

Email-code login begins and completes on the exact business host. Membership
lookup remains bound to both normalized email and tenant subdomain. Email
messages may display MultiTree branding but must link back to the tenant host.

### Platform administrator sign-in

Platform administrator Google and email-code authentication remain entirely on
`multitree.com`. A platform session must never grant access to a tenant
dashboard without the existing explicit, audited impersonation flow.

## Cookie and Session Boundaries

The existing host-only cookie strategy should remain:

- platform session cookie: host-only on `multitree.com`;
- business session cookie: host-only on `acme.sponsor.krd`;
- no cookie with `Domain=.sponsor.krd`;
- no cookie shared between `multitree.com` and `sponsor.krd`;
- `HttpOnly`, `Secure`, and appropriate `SameSite` settings remain mandatory.

Because unrelated registrable domains cannot share cookies, all cross-domain
authentication must use the one-time handoff flow. Local storage, query-string
session tokens, or broad-domain cookies are not acceptable substitutes.

## Frontend Routing Changes

Frontend routing must classify each request as one of:

1. platform host;
2. tenant apex;
3. valid business subdomain;
4. unknown host.

The proxy and server components should share the same host-classification
logic. The following behavior is required:

| Host                | Platform pages                      | Business pages | Public tenant content |
| ------------------- | ----------------------------------- | -------------- | --------------------- |
| `multitree.com`     | Allowed                             | Blocked        | Blocked               |
| `www.multitree.com` | Redirect to canonical platform host | Blocked        | Blocked               |
| `sponsor.krd`       | Optional informational page only    | Blocked        | Blocked               |
| `acme.sponsor.krd`  | Blocked                             | Allowed        | Allowed               |
| Unknown host        | Reject or canonical redirect        | Blocked        | Blocked               |

Host parsing must remain port-aware for local development and must never trust
an arbitrary client-supplied tenant header. The existing internal proxy key
boundary remains required when forwarding the resolved subdomain.

## Backend Changes

The backend should:

- validate both platform and tenant configuration at startup;
- use `TENANT_ROOT_DOMAIN` only for tenant extraction and tenant URL creation;
- use `PLATFORM_BASE_URL` only for platform links and callbacks;
- accept explicitly configured CORS origins for both domain families;
- preserve tenant ownership checks on every protected business request;
- reject business authentication when the requested host is not under the
  configured tenant root;
- reject platform authentication when the request is not on the platform host;
- include both domain concepts in health/configuration diagnostics without
  exposing secrets.

No database schema change should be required for a single tenant root domain;
businesses may continue storing only their subdomain label. If MultiTree later
supports custom business domains or multiple tenant roots, that is a separate
feature requiring verified domain ownership and explicit domain records.

## DNS, TLS, and Reverse Proxy

Required DNS records:

```text
multitree.com       A/AAAA or CNAME -> MultiTree frontend
www.multitree.com   CNAME           -> multitree.com
sponsor.krd         A/AAAA or CNAME -> MultiTree frontend
*.sponsor.krd       wildcard        -> MultiTree frontend
```

Required TLS coverage:

- `multitree.com`;
- `www.multitree.com` if accepted;
- `sponsor.krd`;
- `*.sponsor.krd`.

The reverse proxy must preserve the original `Host`, remove untrusted inbound
tenant headers, route `/api/*` correctly on both domains, and apply security
headers consistently. Certificate renewal for the wildcard domain should use
the DNS challenge supported by the authoritative DNS provider.

## Google OAuth Configuration

The Google OAuth web client should include:

```text
Authorized JavaScript origin:
https://multitree.com

Authorized redirect URI:
https://multitree.com/api/auth/google/callback
```

Tenant wildcard callback URIs are neither needed nor desirable. The callback
stays fixed on the platform domain and returns users to tenants only through
validated one-time handoffs.

Local development can keep using `lvh.me:3011` until a dual-domain local setup
is needed. A future local test setup may use two loopback-resolving domains or
explicit hosts-file entries, but it must exercise the same host classification
and handoff boundaries as production.

## Email and Generated Links

Before rollout, audit every generated absolute URL:

- signup invitations and legal links use `PLATFORM_BASE_URL`;
- approval and rejection status links use `PLATFORM_BASE_URL`;
- business-login links use the exact tenant origin;
- public-page links use the exact tenant origin;
- platform notifications use the platform origin;
- business notifications use the intended tenant origin;
- no service derives a tenant hostname by prefixing `PLATFORM_BASE_URL`.

Email templates should display the destination domain clearly to reduce
phishing confusion when a flow moves from `multitree.com` to
`name.sponsor.krd`.

## Security Requirements

- Treat `Host`, forwarded host, and origin headers as untrusted input.
- Accept forwarded host information only from the trusted reverse proxy.
- Use exact platform-host comparison; suffix matching is only for the tenant
  root and must include the dot boundary.
- Keep CSRF origin validation aware of the exact surface and expected origin.
- Never allow an arbitrary return URL after OAuth.
- Bind every authentication handoff to a normalized tenant identifier.
- Keep session cookies host-only.
- Add both domain families explicitly to access-rule and audit context.
- Do not weaken CSP, CORS, rate limiting, upload validation, or tenant guards
  to make cross-domain navigation work.
- Log domain classification failures without logging codes, cookies, tokens,
  or secret configuration.

## Observability

Request and authentication telemetry should record a low-cardinality surface
classification such as `platform`, `tenant_apex`, or `tenant`, alongside the
existing tenant identifier where applicable. Alerts should distinguish:

- unknown-host traffic;
- invalid tenant suffixes;
- failed or expired cross-domain handoffs;
- callback-to-tenant redirect failures;
- TLS or DNS failures affecting only one domain family.

Do not use complete attacker-controlled host values as unbounded metric labels.

## Migration Plan

### Phase 1: introduce explicit domain concepts

- Add validated platform and tenant configuration values.
- Add shared platform/tenant URL and host helpers.
- Keep current variables as documented compatibility fallbacks.
- Add unit tests without changing the deployed domains.

### Phase 2: remove single-domain assumptions

- Update frontend proxy and server-side host routing.
- Update backend tenant extraction and CORS behavior.
- Update onboarding, OAuth, impersonation, invitations, notifications, and API
  URL generation.
- Audit every absolute URL and cookie write.

### Phase 3: infrastructure preparation

- Configure both DNS zones.
- Issue and automatically renew all certificates.
- Update reverse-proxy host handling.
- Register the new Google OAuth origin and callback.
- Configure production environment values through the secret store.

### Phase 4: staged rollout

- Deploy compatibility code before changing DNS.
- Verify platform authentication on the new platform domain.
- Verify one internal tenant on `sponsor.krd`.
- Verify public pages, dashboard login, email codes, Google OAuth, handoffs,
  uploads, analytics, TikTok tracking, and impersonation.
- Move public traffic only after the full matrix passes.

### Phase 5: cleanup

- Redirect the old platform root to `multitree.com` where safe.
- Do not redirect valid business subdomains away from `sponsor.krd`.
- Remove deprecated environment fallbacks after every environment is migrated.
- Update operational runbooks and incident-response documentation.

## Required Test Matrix

Automated coverage must include:

- platform root and `www` canonicalization;
- tenant apex behavior;
- two independent business subdomains;
- unknown and deceptive suffix hosts such as
  `acme.sponsor.krd.attacker.example`;
- platform routes rejected on tenant hosts;
- business routes rejected on the platform host;
- tenant isolation for sessions and protected resources;
- Google callback on the platform domain and handoff consumption on the exact
  tenant;
- expired, replayed, modified, and cross-tenant handoffs;
- platform and business email-code flows;
- host-only cookie attributes;
- CORS and CSRF decisions for both domain families;
- generated platform, tenant, invitation, public-page, and notification URLs;
- local development with ports;
- reverse-proxy forwarding with trusted and untrusted tenant headers.

## Acceptance Criteria

The feature is complete only when:

- `multitree.com` contains no business dashboard or tenant public content;
- `name.sponsor.krd` contains no platform signup or administrator console;
- signup and Google callback work on `multitree.com`;
- approved users reach the correct `name.sponsor.krd` dashboard through a
  single-use handoff;
- platform and tenant cookies are isolated and host-only;
- every generated absolute URL uses the correct domain family;
- tenant ownership and authorization checks remain unchanged or stronger;
- DNS, TLS, CORS, CSP, CSRF, rate limiting, logging, and monitoring cover both
  domain families;
- type checking, lint, unit tests, production builds, security scans, and the
  complete cross-domain E2E matrix pass;
- current architecture, frontend, backend, security, deployment, and testing
  documentation describe the implemented behavior.

## Non-goals

This feature does not automatically include:

- custom domains owned by individual businesses;
- multiple tenant root domains;
- sharing authentication cookies across domains;
- moving tenant data into separate databases;
- changing subscription plans or tenant ownership rules;
- changing TikTok tracking scope beyond the existing public Linktree and mini
  website surfaces.

Those capabilities should be designed separately if required later.
