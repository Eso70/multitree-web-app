# Client Linktree Creation Access

## Status

Implemented as a server-backed, tenant-scoped feature. It replaces the former
browser-local demo and is available from the **Client invitations** tab on the
business Linktree page.

## Product workflow

1. A business enters only an internal client name.
2. The server creates a high-entropy invitation token and a random mandatory
   six-digit PIN.
3. The raw link and PIN are returned and displayed once. The business should
   send them separately.
4. The client opens `/client-linktree#TOKEN`. The browser removes the fragment
   immediately and exchanges it with the PIN through a same-origin `POST`.
5. The server issues a thirty-day, host-only HttpOnly guest-session cookie.
6. The client enters a tenant-branded dashboard and can create exactly one page
   with the shared Linktree editor.
7. Successful submission keeps the restricted session open and replaces the
   creation state with the shared Pages dashboard treatment and read-only
   analytics for that one page. The client dashboard also exposes the exact
   shared Templates catalogue in read-only form, using the session's
   server-derived plan template keys. Business-only edit, delete, search,
   invitation, and analytics-clear actions are not exposed.
8. A submitted invitation can be reopened with its original link and PIN until
   the business removes the client's access. This disables the credentials and
   every guest session while preserving the business-owned page and analytics.

There is no business-selected date, template, link count, result grant, or
publication workflow. An invitation remains usable after submission for its
restricted dashboard and analytics, until the business removes client access.
The editor receives all Linktree template keys currently available to the
inviting business's current plan; access and Linktree quota are checked again
during submission.

Guest profile and background images use a guest-authorized path through the
existing validated storage policy. The endpoint applies session/IP limits,
magic-byte and MIME validation, platform size/format/optimization policy,
tenant-scoped storage, audit logging, and ownership verification again during
submission. A caller cannot attach another tenant's upload by submitting its
URL.

Client creation includes the shared WhatsApp question editor, enabled with the
standard starter questions. The public sponsorship footer is hidden for
client-created pages; the server enforces the hidden state regardless of the
client payload.

## Backend API

Business endpoints use `BusinessGuard`, `AuthorizationGuard`, existing
Linktree capabilities, tenant ownership checks, and audit interception:

| Method | Route                                                | Purpose                                                                                      |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GET`  | `/api/client-linktree-invitations`                   | List this business's invitations and resulting pages                                         |
| `POST` | `/api/client-linktree-invitations`                   | Create from `{ clientLabel }`; return the raw link secret and PIN once                       |
| `POST` | `/api/client-linktree-invitations/:id/revoke-access` | Permanently disable client credentials and every guest session without deleting the Linktree |

Guest endpoints expose no business identifier:

| Method | Route                                           | Purpose                                                               |
| ------ | ----------------------------------------------- | --------------------------------------------------------------------- |
| `POST` | `/api/client-linktree-access/exchange`          | Validate token and PIN and issue a restricted cookie                  |
| `GET`  | `/api/client-linktree-access/session`           | Return the client label, current template keys, and submission state  |
| `GET`  | `/api/client-linktree-access/check-name`        | Check a proposed page name inside the invitation tenant               |
| `GET`  | `/api/client-linktree-access/check-slug`        | Check a validated page slug inside the invitation tenant              |
| `GET`  | `/api/client-linktree-access/analytics`         | Return read-only totals and link clicks for the invitation's one page |
| `GET`  | `/api/client-linktree-access/analytics/summary` | Return the shared analytics modal summary for that one page           |
| `GET`  | `/api/client-linktree-access/analytics/actions` | Return the shared analytics modal action rows for that one page       |
| `POST` | `/api/client-linktree-access/upload`            | Validate and store a rate-limited tenant-owned editor image           |
| `POST` | `/api/client-linktree-access/submit`            | Create one normal business-owned Linktree                             |
| `POST` | `/api/client-linktree-access/logout`            | Clear the browser guest cookie                                        |

## Security invariants

- Invitation and session secrets use 256-bit cryptographic randomness.
- PostgreSQL stores SHA-256 token digests only. PINs use an HMAC-SHA-256 digest
  keyed by `SESSION_SECRET`; raw secrets never enter audit metadata.
- PIN exchange has per-IP and per-invitation Redis limits plus a persisted
  five-attempt, fifteen-minute invitation lock.
- Only explicit `POST` exchange creates a session; a page `GET` cannot consume
  the invitation.
- The token is carried in the URL fragment, which is not sent in HTTP requests,
  then removed from browser history before exchange.
- The guest cookie is HttpOnly, host-only, `SameSite=Lax`, production `Secure`,
  scoped to `/api/client-linktree-access`, and protected by the global
  same-origin mutation check.
- Session lookup derives invitation and business ownership entirely from the
  server-side digest. Guest payloads cannot choose a business or analytics
  page.
- Linktree creation reuses `LinktreesService`, including plan quota, template
  entitlement, validation, asset ownership, webhook, and tenant behavior.
- A shared advisory lock serializes submission, session revocation, and manual
  expiry. `linktrees.client_invitation_id` is unique, preventing duplicate page
  creation and allowing idempotent recovery if finalization is interrupted.
- Removing client access never deletes its Linktree or analytics.
- Sessions have a thirty-day absolute expiry and can be reopened with the
  original two-part credential while client access remains active. This keeps
  a stolen browser cookie bounded without adding a business-selected date.
- Uploads reuse the platform multipart ceiling and media policy, are rate
  limited per session and address, and must be inventoried as owned by the
  invitation tenant before submission accepts any uploaded URL.

## Database ownership

- `client_linktree_invitations` owns business scope, the invitation/PIN
  digests, lifecycle status, and persisted PIN lock state.
- `client_linktree_sessions` owns guest-session digests, absolute expiry,
  revocation, and bounded request observations.
- `linktrees.client_invitation_id` records delegated origin and has a unique
  foreign key with `ON DELETE SET NULL`, so invitation cleanup cannot delete
  business content.

The schema is delivered by
`backend/src/database/migrations/2026-08-29_client_linktree_access.sql`. Do not
fold it into the consolidated baseline until the next deliberate rebaseline.

## Operational behavior

- At most 20 active unused invitations may exist per business.
- One active guest session is retained per invitation; a new successful PIN
  exchange revokes the previous one.
- A business has one access-removal action. It permanently disables the link,
  PIN, and every client session while preserving the Linktree and its data.
- Submission marks the invitation `submitted`, keeps the restricted session
  active, and exposes only that page's read-only analytics. The Linktree remains
  manageable through normal business tools.
