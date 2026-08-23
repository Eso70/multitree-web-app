# Linktree Analytics Reliability Fix Plan

## Status

Implementation is complete in the working tree. Production verification and
deployment remain owner-operated. No schema migration is required.

This plan covers first-party views and clicks for public Linktree and mini
website pages. It does not add tracking to dashboards, administration pages,
the platform site, business landing pages, or advertising configuration pages.
The ownership and TikTok deduplication rules in `docs/tracking.md` remain the
canonical contract.

## Reported production behavior

- Linktree views usually appear, but visitor clicks often do not.
- The owner's clicks count more reliably than real visitors' clicks.
- Local delivery works more reliably than production.
- Some privacy-restricted visitors also lose views.

This pattern is explained by confirmed delivery defects: a view has time to
finish while the visitor remains on the page, whereas a click immediately
backgrounds the page, opens another application, or begins navigation.

## Implementation sequence

### 1. Preserve queued events until event-level acknowledgement — complete

Files:

- `frontend/src/lib/utils/client-queue.ts`
- `frontend/src/lib/utils/client-queue.spec.ts`

Changes:

- The queue is no longer cleared before `fetch` completes.
- A successful HTTP status is not treated as sufficient confirmation.
- The client reconciles the backend's per-event results and removes only ids
  included in that response.
- Both accepted and permanently rejected results are retired; missing results
  remain queued for an idempotent retry.
- A click queued while a view flush is active waits and starts the next flush.
- Timer-triggered failures are handled without unhandled promise rejections.

Why retries are safe: `analytics_events.event_id` is unique and ingest returns
deduplicated acknowledgement for an event already stored.

### 2. Make exit delivery durable — complete

File: `frontend/src/lib/utils/client-queue.ts`

`navigator.sendBeacon()` returning `true` means the browser accepted a beacon
for attempted delivery. It does not mean the backend accepted the request.
Exit beacons therefore no longer delete queued events. If a later page visit
retries an event that the beacon delivered, backend idempotency absorbs it.

### 3. Support browsers that block storage — complete

Files:

- `frontend/src/lib/utils/visitor-id.ts`
- `frontend/src/lib/utils/visitor-id.spec.ts`

Valid visitor and session ids, and the current page's event queue, fall back to
memory when browser storage throws. The browser no longer sends an empty
visitor id that makes the backend reject the batch.

### 4. Isolate malformed events — complete

Files:

- `backend/src/analytics/dto/analytics-event.dto.ts`
- `backend/src/analytics/unified-analytics.controller.ts`
- `backend/src/analytics/analytics.controller.spec.ts`

The DTO still enforces an array of no more than 50 items, but the controller
validates each item independently. An invalid event receives an
`accepted: false` result under its event id while valid neighbors continue to
ingest. Only validated UUID page ids reach access-rule SQL.

The earlier diagnosis that a malformed page id produced a database `500` was
incorrect: nested DTO validation rejected the whole request with `400` before
the controller. The real problem was still batch-wide loss, now removed.

### 5. Preserve clicks from already-rendered pages — complete

File: `backend/src/analytics/unified-analytics.service.ts`

An action may be archived after a visitor loads the page but before the visitor
clicks it. Archived actions belonging to the same public page now resolve, so
the click reaches page and historical action rollups. An unknown action or an
action belonging to another page is detached from action rollups and cannot be
attributed across pages, but the genuine page-level click is not discarded.

### 6. Apply business access rules to source page ids — complete

File: `backend/src/auth/access-rule-enforcement.service.ts`

Public analytics sends Linktree or mini-website source UUIDs. Access-rule
resolution now matches `public_pages.id`, `source_linktree_id`, and
`source_mini_website_id`, preserving business scoping for every accepted page
identifier.

### 7. Prevent shared proxy addresses from exhausting visitor limits — complete

File: `backend/src/analytics/unified-analytics.controller.ts`

The normal 180-request allowance is keyed by address plus visitor id. A second
5,000-request address ceiling prevents unlimited visitor-id rotation. This
keeps ordinary visitors behind the same CDN or carrier address from consuming
one small shared bucket while retaining an address-level abuse bound.

The Caddy origin-address contract is unchanged. If production requires IP-based
business access rules to see the pre-Cloudflare address, the deployment must
first establish trusted-proxy/origin-locking policy; blindly trusting a
client-supplied `CF-Connecting-IP` header would weaken access controls.

### 8. Stop treating real CUBOT phones as bots — complete

File: `backend/src/analytics/unified-analytics.service.ts`

The bare substring `bot` was removed. Known crawlers and a boundary-delimited
generic bot token remain detected, while hardware names such as
`CUBOT_NOTE_20` are counted normally. The expression does not use bare
`whatsapp`, because that could hide legitimate in-app browser traffic.

Historical events already stored with `is_bot=true` are not backfilled by this
change. Any backfill needs a separate reviewed production procedure.

### 9. Preserve analytics during Platform Admin content imports — complete

Files:

- `backend/src/platform-admin/business-administration.service.ts`
- `backend/src/platform-admin/business-administration.service.spec.ts`

A Linktree import is content replacement, not an analytics-clear operation. It
no longer deletes `analytics_events`, `analytics_page_daily`, or
`analytics_action_daily`. Explicit analytics clearing remains behind its
existing critical permissions and approval flow.

## Production verification

Run these read-only checks after deployment for the affected business UUID:

```sql
SELECT event_name, is_bot, count(*)
FROM analytics_events
WHERE business_id = $1
  AND occurred_at > now() - interval '24 hours'
GROUP BY event_name, is_bot
ORDER BY event_name, is_bot;

SELECT day, total_views, total_clicks
FROM analytics_page_daily
WHERE business_id = $1
ORDER BY day DESC
LIMIT 14;

SELECT status, count(*)
FROM public_page_actions
WHERE public_page_id IN (
  SELECT id FROM public_pages WHERE business_id = $1
)
GROUP BY status;
```

Also check backend warnings for rejected analytics events and the security audit
log for `platform.business.linktrees.import` or approved analytics-clear
operations. An import before this fix could explain historical deletion, but it
cannot explain new post-deployment losses.

For a live browser check, open a public page with `?ttdebug=1`, click a normal
HTTPS link and an app-opening link, then run:

```js
window.__ttDebug.report();
```

The flush record should show an acknowledged `202`. If a page exits before the
normal response, the beacon may deliver the event; a later retry will be marked
deduplicated and removed safely.

## Verification checklist

- [x] Queue unit coverage for transient failure, permanent `4xx`, `429`,
      partial/per-event results, incomplete acknowledgement, blocked storage,
      active-flush click races, and multi-batch beacon attempts.
- [x] Controller coverage for mixed valid/invalid batches.
- [x] Action resolution coverage for archived and cross-page/unknown ids.
- [x] Access-rule coverage for source page identifiers.
- [x] Bot coverage for CUBOT and known crawlers.
- [x] Platform import coverage preventing analytics deletion.
- [ ] Production log and database checks after deployment.
