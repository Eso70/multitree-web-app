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

## Billing boundary

This release records paid activation but does not charge a card. A later
payment integration should update `paid_started_at` only from a verified,
idempotent provider webhook. Checkout success in a browser must never directly
grant access.
