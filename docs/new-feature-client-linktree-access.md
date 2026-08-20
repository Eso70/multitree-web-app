# New Feature: Temporary Client Linktree Creation Access

## Status

**Planning only — not implemented.**

This document records a possible future MultiTree feature. It does not describe
current application behavior and must not be treated as an implemented API,
database schema, entitlement, or security control.

## Summary

A business can generate a private temporary link and send it to a client through
WhatsApp, SMS, or another communication channel. The client can use the link to
create and submit one Linktree without becoming a business member or receiving
access to the business dashboard.

After submission, editing access ends. The business reviews and publishes the
Linktree. A separate temporary, read-only results link can then show the client
aggregated analytics for that Linktree for a configurable period.

Client email is not required. Access is authorized through a high-entropy
capability link with an optional separately shared PIN.

## Product assessment

This is a useful and conventional feature for businesses and advertising
agencies that create campaign landing pages for clients. It follows the common
guest-editor, delegated-creation, or client-intake pattern.

The feature can reduce manual work because clients enter their own profile,
description, images, contact information, and destination links. It is a good
fit for businesses managing TikTok website-engagement campaigns.

The feature should remain deliberately narrow. A temporary client must never be
treated as a business user, business member, or platform administrator. Giving
the client ordinary dashboard access would create unnecessary tenant,
authorization, privacy, and usability risks.

## Recommended experience

```text
Business creates a private invitation
                |
                v
Client receives the link through WhatsApp or SMS
                |
                v
Client opens the link and optionally enters a separate PIN
                |
                v
Server creates a restricted temporary guest session
                |
                v
Client prepares one Linktree draft
                |
                v
Client submits the draft once
                |
                v
Business reviews and publishes the Linktree
                |
                v
Client receives a separate temporary read-only results link
                |
                v
Results access expires or the business revokes it
```

## Business invitation configuration

The business dashboard should provide an **Invite a client** action in Linktree
management. The business can configure:

- An internal client label or campaign name. This is for the business and does
  not establish the client's identity.
- Creation-link expiration: for example, 1, 3, or 7 days.
- Results-access duration: for example, 1, 3, 7, 14, or 30 days.
- Whether an additional PIN is required.
- The allowed Linktree template or template set.
- The maximum number of links.
- Whether image uploads are permitted.
- Whether the client can save a draft across temporary sessions.
- Whether a scheduled unpublish date is required for the campaign.
- An optional strict IP allowlist for exceptional fixed-network use cases.

Business review before publication should be the default and the initial
implementation. Automatic publication may be considered later as an explicit,
permission-controlled business choice.

The server must check the business's status, permissions, entitlements, and
public-page quota when the invitation is created and again when it is redeemed.
Pending invitations should have their own bounded quota to prevent abuse and
uncontrolled reservation of resources.

## Security model

### Capability link

The invitation link is a bearer capability: possession of the secret grants
the restricted invitation authority. It does not prove the real-world identity
of the person using it.

The server should generate a cryptographically secure random token with at
least 256 bits of entropy and store only its SHA-256 or HMAC digest. The raw
token must never be stored in PostgreSQL, Redis, audit metadata, application
logs, request telemetry, analytics, or error responses.

The token must be:

- Bound to exactly one business.
- Bound to exactly one invitation.
- Limited to creating exactly one Linktree.
- Time-limited.
- Revocable.
- Invalidated for editing after successful final submission.
- Checked using constant-time comparison where applicable.
- Protected by rate limits and bounded failed-attempt handling.

### URL token handling

Prefer carrying the raw secret in the URL fragment:

```text
https://client-business.example.com/client-linktree#SECRET
```

Browsers do not normally send the URL fragment to the server, proxy logs, or
HTTP referrer headers. Client-side bootstrap code should exchange the fragment
through a same-origin `POST`, remove it immediately with browser history
replacement, and receive a restricted server-side session cookie.

If a query-string token is used instead, the first valid request must exchange
and remove it immediately. The implementation must verify that Caddy, Next.js,
NestJS, request telemetry, analytics, error reporting, and infrastructure logs
do not retain the raw query string.

The invitation surface must send private/no-store caching, `noindex`, an
appropriate strict referrer policy, and MultiTree's normal nonce-based CSP.

### Link previews must not consume invitations

WhatsApp, Facebook, antivirus products, messaging services, and corporate
security tools may automatically open shared links to create previews or scan
them.

Therefore:

- A `GET` request must never consume an invitation.
- Loading the page must not create a session or Linktree.
- Link-preview crawlers must receive no private invitation information.
- Only an explicit same-origin token-exchange `POST` can start a session.
- Only a successful final submission consumes the creation authority.

### Optional PIN

The business may require an additional PIN. The PIN must not be placed in the
URL and should preferably be sent separately from the link.

The PIN should:

- Be a sufficiently long random code, preferably an eight-character code such
  as `K7F4-P9RX` rather than a short predictable value.
- Be stored only as a keyed hash.
- Allow a small bounded number of attempts.
- Use per-invitation and per-IP rate limits.
- Apply a temporary lock after repeated failures.
- Be replaceable by the business.
- Never be written to logs, analytics, or audit metadata.

Sending the PIN separately provides stronger protection. Sending it in the
same message still helps against automated preview scanners and accidental
link exposure, but does not protect against theft of the entire message.

### Temporary guest session

After the capability and optional PIN are validated, the backend should create
a server-side restricted session. The session token should be cryptographically
random, stored only as a digest, and delivered through a host-only `HttpOnly`,
`Secure`, `SameSite=Lax` cookie.

Recommended session properties:

- Approximately 30 minutes of idle lifetime.
- A bounded absolute editing lifetime of several hours.
- No remembered-session option.
- One active editing session per invitation.
- Immediate invalidation when the invitation is revoked, expires, or is
  submitted.
- Recorded creation, renewal, expiration, and revocation lifecycle events.
- No credential storage in `localStorage` or readable JavaScript cookies.

The server must derive the business ID, invitation ID, draft ID, allowed
operations, restrictions, and expiry from the authenticated guest session.
Client-provided ownership identifiers must never be trusted.

### IP address and device handling

Normal client access should not be hard-bound to one IP address. Mobile devices
legitimately change addresses when switching between Wi-Fi and cellular
networks, reconnecting, or passing through carrier-grade NAT. Multiple users
may also share one public IP.

IP address and user-agent information can be recorded as risk and audit signals,
but they are not reliable proof of identity. A substantial mid-session change
may terminate the session and require the business to reset or reissue access.

Strict IP allowlisting should be an optional advanced control for clients using
known fixed networks. Invasive browser fingerprinting should not be introduced.

No system can honestly guarantee that temporary link access is fully secure on
every mobile device. The target is strong defense in depth, bounded authority,
safe failure behavior, revocation, and useful audit evidence.

## Restricted client editor

The frontend should reuse MultiTree's existing shared Linktree editor,
validation, URL mapping, preview, and link synchronization logic. It should add
a restricted guest mode rather than duplicate the editor or business logic.

The first version may allow:

- Page name.
- Short description.
- Profile image.
- One approved template or a restricted template selection.
- Approved background options.
- Contact information.
- Standard links and link ordering.
- Linktree preview.
- Draft saving within the invitation's allowed lifetime.
- Final submission.

The temporary client must not be allowed to access or change:

- Other Linktrees or mini-websites.
- Business profile, branding, defaults, members, or settings.
- TikTok Pixel or Events API configuration.
- Business-wide analytics.
- CRM leads, contacts, notes, or audience exports.
- Analytics deletion.
- Billing, plans, entitlements, or quotas.
- Communications or platform notifications.
- Developer API clients, keys, schedules, or webhooks.
- Platform-administration functionality.
- Imports or exports.
- Custom HTML, JavaScript, CSS, tracking code, or arbitrary embeds.

Every editable field should have server-side validation and explicit length,
count, and format limits. URL schemes must use an allowlist. Client-provided
URLs must not cause the backend to fetch arbitrary resources; any future URL
preview feature must include SSRF protection.

## Upload security

Guest uploads should use the existing `StorageService` and platform media
policy. They must not introduce a separate or less restrictive upload path.

Uploads must:

- Be authorized against the guest session and invitation.
- Use a narrow image-type allowlist.
- Validate actual magic bytes rather than trusting the extension or declared
  content type.
- Enforce request, file-size, image-dimension, and per-invitation limits.
- Generate server-controlled filenames and storage keys.
- Keep resolved paths within the configured storage root.
- Re-encode supported images where appropriate.
- Record ownership so unused temporary media can be cleaned safely.
- Never fall back to base64 or data URLs after rejection.

## One-time submission

One-time use should mean one successful final creation/submission, not one page
view or one editor session.

Final submission must run in a database transaction that:

1. Locks or conditionally claims the invitation.
2. Verifies that it is active, unexpired, unrevoked, and unconsumed.
3. Verifies the guest session and optional PIN state.
4. Rechecks business status, authorization, entitlement, and quota.
5. Validates every submitted field, link, and uploaded-asset reference.
6. Creates or finalizes exactly one business-owned Linktree.
7. Synchronizes links through the existing reconciliation behavior so link and
   analytics identities remain stable.
8. Marks the invitation consumed for editing.
9. Invalidates every editing session related to the invitation.
10. Creates a separate optional read-only results grant.
11. Records safe audit events without secrets or sensitive values.
12. Creates a business notification that the draft is ready for review.

The database must enforce the one-invitation-to-one-Linktree relationship with
a uniqueness constraint. Conditional updates or row locking must prevent two
concurrent submissions from creating two pages.

After submission, the client cannot resume editing. A requested revision should
use a separate, explicit revision invitation rather than silently restoring the
consumed creation permission.

## Review and publication

The recommended initial workflow is:

```text
Client submits -> business reviews -> business publishes
```

This protects the business from accidental or malicious destinations,
incorrect contact information, inappropriate uploads, copyright issues, and
content published under its tenant identity without review.

The business review should clearly show that the Linktree originated from a
temporary client invitation. The business should be able to edit, reject,
publish, revoke, or delete the draft under its existing permissions and quota
rules.

Automatic publication may be considered later, but it should be an explicit
business choice with a dedicated authorization rule and complete audit trail.

## Temporary results access

Creation access and results access must be separate grants with separate
secrets and permissions.

| Grant | Allowed authority |
| --- | --- |
| Creation grant | Create, edit, preview, and submit one restricted draft |
| Results grant | Read aggregated analytics for the resulting Linktree only |

After submission or publication, the system can generate a separate read-only
results link. The business can copy and resend this link through WhatsApp or
SMS. It must be independently revocable and expire after the selected period.

The temporary client results page may show:

- Linktree name and public URL.
- Publication or campaign status.
- Total views.
- Unique visitors.
- Interactions.
- Interaction rate.
- Conversions.
- Aggregated clicks per link.
- A bounded daily trend.
- Remaining results-access time.

It must not expose:

- Visitor identities or individual journeys.
- IP addresses, user agents, or raw analytics events.
- CRM contacts, leads, notes, or form submissions.
- TikTok credentials or internal delivery-error details.
- Other Linktrees, mini-websites, or business-wide totals.
- Business settings, audit records, permissions, sessions, or private
  operational information.

Results-access expiry affects only the client's view. The analytics remain
available to the business according to MultiTree's normal analytics and data
retention rules.

## Public Linktree lifecycle

Temporary client access and temporary public-page publication are different
concerns.

- The client's editor or analytics access may expire.
- The public Linktree should remain stable unless the business explicitly
  schedules it to unpublish.

Automatically deleting a public Linktree when client access expires could
break an active TikTok campaign, waste advertising spend, and fragment
analytics history. If the campaign page itself must be temporary, use a
separate business-controlled `unpublishAt` workflow. Prefer unpublishing over
deletion so the page, audit trail, and analytics history remain available.

## Suggested architecture

### Backend ownership

Introduce a focused domain module such as `client-linktree-access`. It should
orchestrate temporary invitations and sessions while delegating Linktree
creation, link reconciliation, storage, billing checks, analytics reads,
notifications, and auditing to the existing owning services.

Do not add this workflow directly to a large controller or duplicate Linktree
persistence.

Possible tables:

| Table | Purpose |
| --- | --- |
| `client_linktree_invitations` | Business ownership, token digest, PIN digest, restrictions, status, expiry, and resulting Linktree identity |
| `client_linktree_sessions` | Hashed temporary session tokens, invitation scope, expiry, observations, and revocation |
| `client_linktree_results_grants` | Hashed read-only token, one Linktree scope, expiry, and revocation |

The resulting page remains a normal row in the existing `linktrees` table and
belongs to the inviting business. Its links remain in the existing `links`
table. An optional source or invitation reference can identify delegated
creation without changing tenant ownership.

### Frontend ownership

Add a feature module such as `frontend/src/features/client-linktree-access/`.
It should compose existing shared editor fields, dialogs, uploads, validation,
preview, error states, skeletons, and request transport.

The guest feature must not import business-dashboard or platform-admin
orchestration. Any Linktree editor behavior genuinely needed by both the
business and guest flows should be moved into the existing neutral link-editor
feature rather than copied.

### Existing systems to reuse

The implementation should reuse or extend:

- `SecurityAuditService` for invitation lifecycle evidence.
- Existing Linktree creation and update validation.
- `LinksService.syncLinks` reconciliation behavior.
- Billing entitlement and public-page quota checks.
- `StorageService` and the configured media policy.
- Existing analytics read repositories and projections.
- Standard API envelopes, exception handling, and request IDs.
- Business notifications and communication infrastructure.
- Origin/CSRF validation, CSP, access rules, and request telemetry.

### Suggested business capabilities

Possible capabilities include:

- `business:client-linktree-invitations:read`
- `business:client-linktree-invitations:manage`
- `business:client-linktree-invitations:revoke`

These names are planning suggestions and are not currently registered
capabilities. The permission catalog, plan grants, effective-access manifest,
and UI rules would all need to be updated together if this feature is built.

## Audit and operational requirements

Record safe lifecycle events for:

- Invitation creation.
- PIN enablement or replacement, without recording the PIN.
- Successful token exchange.
- Repeated failed exchanges or PIN attempts.
- Guest-session creation, expiration, and revocation.
- Draft creation and final submission.
- Business approval, rejection, publication, or revocation.
- Results-grant creation, access, expiration, and revocation.

Do not record raw tokens, PINs, full request bodies, uploaded file contents,
visitor-level analytics, or sensitive field values.

Security audit events should remain low-volume lifecycle evidence. Ordinary
page requests and results-page reads should use the existing bounded request
telemetry rather than creating permanent security events on every refresh.

Expired invitations, sessions, and results grants should be cleaned in bounded
batches. Cleanup must not delete the business-owned Linktree, its analytics,
or permanent audit evidence.

## Threats that must be tested

The future implementation must include focused tests for:

- Stolen, expired, revoked, malformed, and already-consumed links.
- Token and PIN brute-force attempts.
- Automated link-preview requests.
- Token replay after exchange or final submission.
- Concurrent final submissions.
- Multiple invitations attempting to exceed the business quota.
- Business suspension or entitlement loss after invitation creation.
- Cross-tenant invitation, draft, upload, Linktree, and analytics identifiers.
- Guest attempts to call ordinary business or platform endpoints.
- Editing or analytics access after expiry or revocation.
- URL-scheme injection and unsafe redirects.
- SSRF through any future URL-preview functionality.
- Oversized, malformed, mismatched, or malicious uploads.
- CSRF and invalid-origin mutations.
- Stored and reflected XSS through every user-controlled field.
- Results pages exposing raw visitors, CRM data, or other business pages.
- Mobile IP changes and optional strict-IP behavior.
- Failure to invalidate sessions after submission or revocation.

## Security completion checklist

- [ ] Invitation and session tokens are high-entropy and stored only as digests.
- [ ] Raw secrets never enter logs, telemetry, analytics, or audit metadata.
- [ ] A `GET` or link preview cannot consume the invitation.
- [ ] Token exchange removes the secret from the browser URL.
- [ ] Optional PIN attempts are hashed, bounded, and rate-limited.
- [ ] Every guest request is scoped to one invitation and one business.
- [ ] The server never trusts a client-provided business or ownership ID.
- [ ] Creation, results, and business-dashboard permissions are isolated.
- [ ] Invitation consumption and Linktree creation are atomic.
- [ ] Database constraints prevent duplicate creation.
- [ ] Business status, authorization, entitlement, and quota are rechecked.
- [ ] Uploads use the existing validated storage path.
- [ ] URLs and all other fields use server-side allowlist validation.
- [ ] Guest mutations retain origin/CSRF protection.
- [ ] Expiration and business revocation invalidate all related sessions.
- [ ] Results access exposes only one page's aggregated analytics.
- [ ] Public-page expiry is independent from guest-access expiry.
- [ ] Relevant lifecycle events are audited without sensitive values.
- [ ] Cleanup is bounded and preserves business content and analytics.
- [ ] Cross-tenant, concurrency, replay, abuse, and security tests pass.

## Recommended MVP

The first release should include only:

1. A business-generated creation link with a maximum seven-day lifetime.
2. An optional PIN, enabled by default and shareable separately.
3. One restricted temporary editor session at a time.
4. A reduced Linktree editor that reuses existing components and validation.
5. One draft and one final submission.
6. Mandatory business review before publication.
7. A separate read-only results link lasting 1, 3, 7, 14, or 30 days.
8. Aggregated page analytics only.
9. Immediate revocation by the business.
10. Rate limiting, audit coverage, cleanup, and security regression tests.

Automatic publication, reusable client accounts, collaborative editing,
revision access, advanced device policies, and strict IP restrictions should
wait until real usage demonstrates a need.

## Recovery model

Without email, phone verification, or a client account, MultiTree cannot prove
who used a link or recover access for a person who loses it.

The safe recovery process is:

1. The business revokes the old creation or results grant.
2. MultiTree invalidates every related temporary session.
3. The business generates and sends a replacement link.

Security questions and recovery based on knowledge of page content should not
be introduced.

## Final recommendation

Build this feature later as a restricted capability-link workflow, not as
temporary business-dashboard access. Use an optional separately shared PIN,
one-time final submission, mandatory business review, and a separate
read-only results grant.

This design keeps the feature practical for clients contacted through
WhatsApp while preserving tenant isolation, least privilege, business
ownership, stable advertising destinations, and MultiTree's existing security
architecture.
