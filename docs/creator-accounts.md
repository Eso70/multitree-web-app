# Self-service Creator accounts

Creator accounts are root-domain customer accounts for people who want to
build one public page without belonging to a normal business tenant. They are
not invitations and they do not use a business subdomain.

## Product rules

- Signup and login live at `/signup` and `/login` on the root domain.
- Signup and login use only the shared Google OAuth flow.
- Google must return a verified email; no email-code or phone login fallback is
  exposed for Creator accounts.
- One stable Google subject, verified email, and remembered device can claim
  only one Creator trial.
- A Creator can own exactly one Linktree **or** one mini website at a time.
- Creator navigation exposes the same Linktree and mini-website workspaces used
  elsewhere. After the first page is committed, the opposite workspace is
  disabled in the dashboard and the server remains the authoritative lock.
- Creators cannot delete their public page. Only a platform administrator with
  `platform:creators:manage` may delete it; that action is audited and does not
  erase the durable trial claims or grant another trial.
- The trial starts when the first page is created, not when signup completes.
- `CREATOR_TRIAL_DAYS` is either 7 or 30 days. A three-day read-only grace
  window follows the trial. The root public page is unavailable after grace.
- Until a payment provider is integrated, a platform administrator explicitly
  activates or cancels paid access from the Creator users page.

## Security model

Creator sessions use their own `creator_session` cookie and the shared hashed
session store. They cannot authenticate through business or platform guards.
All Creator APIs derive the workspace id from that session; a client-supplied
business id is never accepted.

Google validates the token signature, issuer, audience, expiry, nonce, PKCE
verifier, stable subject, and verified email. The application stores no Google
access or refresh token. Permanent HMAC claims prevent the same Google subject,
verified email, or remembered device from receiving repeated trials. Redis
holds single-use OAuth state and layered device and IP-prefix rate limits.
These controls reduce abuse but must not be described as fingerprinting or as
an absolute guarantee that a determined person cannot change every identity.

Root page slugs are protected by `root_public_slugs`. The database primary key
is the final concurrency control, so two requests cannot claim the same route.
Public queries serve Creator content only while the account is active and paid,
trialing, or inside grace.

## Shared UI and services

The Creator dashboard is a thin workspace configuration around the same
Linktree editor, mini-website editor, grid/table views, analytics modal,
skeletons, uploads, and public renderers used by business and platform
workspaces. Shared behavior must be changed in the shared implementation and
verified in all applicable workspaces. Platform-only administration controls
remain behind platform capabilities.

A Creator owns the page it inspects, so `BusinessPageAnalyticsModal` runs in
its full mode there — the same loading skeleton, stat cards, conversion tiles,
sort controls, per-button list, refresh, and clear controls a business sees.
Only the endpoints differ: totals and action rows are read from
`/api/creator/{linktrees,mini-websites}/:id/analytics` and
`.../analytics/actions`, which resolve the workspace from the `creator_session`
and prove ownership before reading. The business `/api/analytics/v2` routes are
never called from a Creator workspace. The advanced-analytics button is hidden
because `/business/analytics` is a business-only route; platform administration
keeps the summary-only mode, since it reviews pages it does not own.

The `/account/linktree`, `/account/mini-website`, and `/account/settings`
workspaces also use the same `DashboardSidebar`,
`DashboardHeader`, viewport shell, profile menu, theme persistence, responsive
mobile drawer, page container, surfaces, statistic cards, tabs, and skeletons
as the Business and Platform dashboards. `/account/settings` provides a
read-only Google-backed account view and the shared session-management panel.
Creator account routes are private, no-store, and excluded from indexing.

Only the minimum verified Google profile is retained: stable provider subject,
normalized verified email, display name, and avatar URL. The authenticated
Creator response deliberately omits internal user/business/account ids,
provider subject, identity claims, device/IP HMACs, and risk level. Platform
management may see name, email, avatar, verified-email status, last Google
authentication, last login, account creation time, and active-session count;
OAuth tokens and anti-abuse identifiers are never returned.

Creator security settings list only that Creator workspace's active sessions
and Creator audit events. The current session cannot be revoked through the
single-session endpoint, while "sign out all other sessions" preserves it.
Every lookup and revoke derives the workspace from the isolated
`creator_session`; no client-supplied owner id is accepted.

Creator Settings uses the same segmented settings surface as Business. Its
first tab uses the shared read-only account identity fields to present the
verified profile image, account name, and email without exposing provider or
security metadata. It is followed by session security and the shared
TikTok Pixel/Events API configuration. TikTok settings are resolved only from
the authenticated Creator workspace, allow at most one Pixel group, return only a
token-presence flag and last four characters, and become read-only when page
editing becomes read-only. The encrypted Events API token is never returned.

## Operations

Configure Google OAuth as described in `backend.md`, then set the trial length:

```env
CREATOR_TRIAL_DAYS=7
```

The server fails closed when Google OAuth or Redis is not configured. Creator
tables and Google-backed trial claims now live directly in
`migrations/baseline/92_creator_accounts.sql`. Recreate a disposable database
from the consolidated baseline before enabling the feature; valuable databases
require an explicitly reviewed backup-and-replacement procedure.

The platform permission catalog contains `platform:creators:read` and
`platform:creators:manage`. Suspension revokes all active Creator sessions.
`DELETE /api/platform/creators/:id/page` requires the manage capability and an
audit event. Creator-scoped page DELETE routes always return a forbidden
response, independently of which controls are visible in the browser.

## Billing boundary

This release records paid activation but does not charge a card. A later
payment integration should update `paid_started_at` only from a verified,
idempotent provider webhook. Checkout success in a browser must never directly
grant access.
