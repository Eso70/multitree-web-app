# Tracking

How an allowlisted public marketing page reports what happened on it, and how
owner-scoped TikTok Pixel and Events API delivery are wired to that.

This is the procedure for every new public marketing surface. There is one
page registry, tracker, and delivery pipeline.

---

## The scope rule

TikTok tracking is an explicit allowlist. It is never inferred from a route
merely being unauthenticated.

| Owner    | Allowed surfaces                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Business | subdomain `/`, `/linktree/:uid`, `/bio/:slug`, `/advertising`, `/advertising/video-code`                 |
| Platform | root `/`, `/join`, `/join/application`, platform-owned `/linktree/:uid`, and platform-owned `/bio/:slug` |

Authentication, callbacks, dashboards, platform administration, legal pages,
errors, previews, API routes, and static assets are excluded. Adding another
route requires a `public_pages` identity and an update to the central frontend
and backend allowlists.

The business's TikTok **configuration** UI is untouched by this rule — entering
a pixel id and an Events API token in the dashboard is configuration, not
reporting. What is scoped is where the pixel _renders_ and which page types get
forwarded to the Events API.

Three things enforce it, so a mistake fails loudly rather than quietly shipping:

1. `frontend/src/components/analytics/pixel-placement.spec.ts` fails if
   `TikTokPixel` is mounted outside the specialized page renderers and the
   fixed-route allowlist component, or if any file other
   than `features/analytics/tiktok-dispatch.ts` (the queue), the pure snippet
   builder `features/analytics/tiktok-base-code-snippet.ts`, or the debug
   reporter touches `window.ttq`.
2. `forwardsToTikTok` in
   `backend/src/analytics/unified-analytics.service.ts` decides whether an
   ingested event gets a `marketing_event_outbox` row. It applies two rules:
   `TIKTOK_FORWARDED_PAGE_TYPES` scopes it to registered public page types, and
   `ENGAGEMENT_ONLY_EVENTS` drops an engagement event that resolved to no
   registered action. Internal analytics still records every public page and
   every engagement signal; only the outbound half is scoped.
3. `PublicPageAnalyticsService` is the only resolver for pixel ids. Customer
   owners require the live `feature.tiktok` entitlement; the non-billable
   platform workspace uses only the group saved in Platform Settings.

Platform pixels are never inherited by or combined with customer pixels. Page
ownership selects exactly one destination group.

### Automatic delivery

TikTok Pixel and Events API delivery starts automatically on every allowlisted
public marketing surface when its owner has an active pixel configuration.
There is no visitor-facing marketing-cookie prompt and no consent cookie or
local-storage gate. The legacy `consentState` transport/database field remains
for backward compatibility and first-party CRM records, but it does not decide
whether an otherwise eligible marketing event reaches TikTok.

---

## The deduplication contract

Everything below follows from one rule, which is TikTok's, not ours:

> TikTok merges a Pixel event and an Events API event into one conversion only
> when the **`event_id`**, the **event name**, and the **pixel id** all match,
> within a 48-hour window.

So:

- **One id per event, minted once.** `createPageTracker` generates it and gives
  the same value to the pixel call and to the queued event the server forwards.
  Never generate an id on one side only.
- **One event name, owned by the server.** It comes from
  `public_page_actions.tiktok_event`, which the browser is _told_ and the
  server _reads_. Neither side derives it. A TypeScript copy of that mapping
  used to exist beside the SQL one; when two copies of a deduplication rule
  disagree, every conversion is counted twice and nothing looks broken.
- **Suppress the whole report, not half of it.** The tracker's repeat window
  drops the pixel call and the queued event together. Gating only the pixel is
  how a double tap became two conversions: the browser fired once, and the
  queue sent a second event under a fresh id.

## More than one pixel on a page

A business may have up to three active pixels. `trackTikTokEvent` addresses
them by count:

- **One pixel** (and the no-pixel-ids case): a single bare `ttq.track`. This is
  the path nearly every business is on and it is deliberately unchanged.
- **Two or more**: one `ttq.instance(<id>).track(...)` per pixel, so each
  receives the event explicitly rather than leaving the fan-out to the SDK.
  All of them get the _same_ `event_id` — the server sends one outbox row per
  active pixel under that same id, and deduplication is per pixel.

`instance` is added by the real `events.js`. Before it lands — and if every
lookup misses — the call falls back to `ttq.track`, which the stub queues and
replays. Dropping the event would be worse than an uncertain fan-out.

If you add a second pixel, confirm it in TikTok Events Manager, for both pixel
ids. `?ttdebug=1` cannot answer this on its own: `recordTikTokDebug` is called
once per report in `page-tracking.ts`, outside `trackTikTokEvent`, so the
console shows a single `pixel` entry whether one instance received the event or
three. It proves the browser half fired and which id it carried — the fan-out
itself is only observable at the destination.

---

## The two event vocabularies

They are different and must not be conflated.

|           | Internal (`PageEventName`)                      | TikTok (`PublicPageTikTokEvent`)                |
| --------- | ----------------------------------------------- | ----------------------------------------------- |
| Answers   | "how many WhatsApp taps did this business get?" | "what should the ad algorithm optimise for?"    |
| Chosen by | the caller, from what the visitor did           | the action row, written when the page was saved |
| Example   | `whatsapp_click`                                | `Contact`                                       |

A WhatsApp tap is `whatsapp_click` internally and `Contact` to TikTok. Both are
correct. Never pass a TikTok name where an internal one belongs.

---

## The contract a page receives

Both public reads serve one shape, `PublicPageAnalytics` in
`packages/types/analytics.types.ts`:

```ts
{
  pixelIds: string[];                    // empty without feature.tiktok
  actions: Record<string, {              // keyed by public_page_actions.action_key
    id: string;
    pixelEvent: PublicPageTikTokEvent;
  }>;
}
```

Specialized pages resolve with `forSource`; fixed routes resolve their
`page_type='route'` identity through `/api/public/tracking/:routeKey`.

`pixelIds` is re-checked against `feature.tiktok` on **every read**, never
trusted from when the pixel was saved. A plan can lapse and nothing rewrites
`business_tiktok_pixels`; without the live check a downgraded business keeps
injecting a pixel it no longer pays for. The same predicate gates the outbox
insert, so the server half stops at the same moment the browser half does.

It is deliberately **not** in the linktree Redis cache. Content is safe to cache
for two hours; entitlement and action identity are not.

### Base code delivery

For Linktree and mini-website pages, the pixel base code is server-rendered
inline (`TikTokPixelBaseCode`, carrying the request CSP nonce), not injected
only after hydration. TikTok's "verify Pixel setup" and Event Builder
read the served document, and a tag that appears only once React has hydrated
is invisible to a snapshot taken before that — Pixel Helper still sees it
because it runs inside the live page. The inline snippet loads `events.js` at
parse time and is idempotent (`ttq._i` is consulted per pixel), so a soft
navigation that re-renders the page never injects the SDK twice. It does not
call `ttq.page()`: the first page view is the client tracker's job, and it is
the half that carries the shared `event_id`. `pixel-placement.spec.ts` pins
the base-code component to the same two pages the client pixel is pinned to.

---

## Adding tracking to a new feature

### 1. Register the action server-side

Nothing is trackable until the database says it exists.

- **Mini website**: add it in `buildMiniWebsiteActions`
  (`backend/src/mini-websites/mini-website-actions.ts`). Pick the `pixelEvent`
  that matches what the visitor did — `Contact` for a conversation started,
  `Lead` for details handed over, `InitiateCheckout` for a priced item chosen,
  `CompletePayment` for a purchase, `Download` for a file, `ClickButton` for
  everything else.
- **Linktree**: links are registered automatically by
  `fn_sync_linktree_public_page` in `full_schema.sql`, keyed `link:<uuid>`. A
  new _kind_ of linktree action needs a row there and a matching key in
  `LinktreePage.tsx`. Those two are the only pair that has to agree by hand.

Only register things that actually go somewhere. An action row for a card with
no button reports a permanent zero and pads every breakdown with noise.

### A link keeps its identity across a save

Clicks are stored in `analytics_action_daily` against a
`public_page_actions` id, and that row is tied to a `links` row by
`source_link_id`. So a link row's uuid _is_ the identity of its click
history, and `LinksService.syncLinks` must preserve it.

It used to delete every link and re-insert the submitted set. Each surviving
button came back with a new uuid, the trigger registered a new action for it,
and the old action was archived — which the breakdown query filters out
(`action.status <> 'archived'`). Every click a page had ever recorded
disappeared the first time its owner edited it. Views kept counting the whole
time, because those hang off `public_pages`, whose id never changed. "Views
count but clicks do not" was that, and nothing to do with the tracker.

`syncLinks` now reconciles instead: it matches submitted links to stored ones
on `lower(platform)` + `trim(url)`, updates matches in place, inserts only
genuinely new links, and archives and deletes only the ones the save removed.
Changing a button's url retires it and creates a new one, which is correct —
a different destination is a different button and must not inherit the
previous target's numbers.

This depends on the editor sending a byte-identical url for a button nobody
touched. It does not send link ids: it extracts a display value from each
stored url and rebuilds the url from that value on save, so the round trip has
to be stable. `features/link-editor/link-url-roundtrip.spec.ts` pins that as a
matrix — every platform the editor offers, both with and without stored
`original_input`/`country_code` metadata (different code paths, and the
metadata one is what real links take), and every dialling code in
`lib/constants/country-codes.ts`. If you change `generateUrl` or
`extractValueFromUrl`, that test failing means live pages are about to lose
their click history — it is not a formatting nit.

Phone numbers are the sharp edge. A national number may legitimately begin
with digits that spell some country's dialling code: every Iraqi mobile
starts `75`, `77` or `78` and `7` is Russia/Kazakhstan, while Brazil dials
`55` and its national numbers also begin `55`. No length rule separates the
two — a ten-digit Brazilian national leaves eight digits after the prefix,
which is itself a valid subscriber number. So `formatPhoneNumber` never
guesses: input marked international with `+` or `00` already carries its
country, and anything else is national and gets the selected code prepended.
Earlier versions scanned for "any known dialling code" and stripped what they
found, which was survivable only while the list held seven countries.

Do not "simplify" this back to delete-all-and-insert.

The reverse is just as easy to miss: a link the trigger registers but the page
renders through something other than the normal button list. `splitGpsLinks`
pulls the GPS link out of the rendered buttons and `GpsLocationDisplay` draws
its own "open in Google Maps" anchor, so for a while that row reported a
permanent zero while a visitor asking for directions went uncounted. The
component takes an `onOpen` callback and every template hands it the same
`onLinkClick` the buttons use. Anything that renders a link outside the button
list must route back through that one handler.

### 2. Report it from the page

```tsx
// A registered action: fires the pixel, using the server's event name.
tracker.trackAction("mini:booking:abc", "booking_started", {
  label: "Book a table",
  destination: url,
});

// Engagement: internal only, never reaches TikTok. Enforced on both sides —
// no registered action means the browser fires no pixel, and `forwardsToTikTok`
// drops the server half. Gating only the browser is how engagement used to
// arrive at TikTok as a server-only conversion nothing could deduplicate.
tracker.trackEngagement("action_open", {
  actionKey: "mini:section:pricing",
  once: true,
});

// A conversion the server records from its own endpoint: pixel half only.
tracker.trackServerConversion("mini:leadForm", eventId);
```

Anchors carrying `data-mini-action` are picked up automatically by
`trackAnchor`; nothing else is needed for a plain outbound link.

Do not call `window.ttq` — the placement test fails the build if you do, and
an event fired outside the tracker has no server counterpart to deduplicate
against.

### 3. If the server also records the event

Some conversions are created by a server endpoint rather than by a click — the
mini website's lead form is the one today. The browser mints the id, fires the
pixel with `trackServerConversion`, and posts the id to the endpoint; the
endpoint ingests under that id with `browserDispatched: true` and the matching
`browserEventName`. Both halves then collapse into one conversion.

Queueing an event from the browser as well would double-count it internally,
which is why `trackServerConversion` fires the pixel and nothing else.

---

## Delivery

`marketing_event_outbox` rows are written inside the ingest transaction — one
per active pixel — and delivered by `TikTokOutboxProcessor` every two seconds.

- Claimed with `FOR UPDATE SKIP LOCKED`, so multiple backend instances share
  the work without blocking each other.
- Grouped by destination: one request carries every event claimed for the same
  pixel, because the body has one `event_source_id` and one access token.
- Events API v1.3 shape — `event_source` / `event_source_id` / `user` — not the
  older `pixel_code` + `context`, which is rejected outright.
- Identity fields (`email`, `phone`, `external_id`) are SHA-256 hashed at
  ingest, never at delivery, so no readable address is ever written to the
  outbox table. Email is lowercased and phone is normalised to E.164 first:
  unnormalised input silently halves the match rate.
- Eight attempts, exponential backoff capped at an hour, overridden by
  `Retry-After` when TikTok sends one.
- Bot traffic is never forwarded.
- Engagement that resolved to no registered action is never forwarded
  (`ENGAGEMENT_ONLY_EVENTS`). **Expect reported conversions to fall after this
  ships**: `action_open` and `engaged_view` were arriving as `ClickButton`, and
  `form_view` as a second `ViewContent` on top of the page's own. The lower
  number is the correct one — those were server-only events with no browser
  half to deduplicate against — but a dashboard watcher will read it as a
  regression unless told.

### When delivery breaks

A permanent failure is invisible from the configuration form — the fields are
filled in and conversions simply stop arriving — so it is surfaced in two
places.

The business sees it on its own TikTok configuration page
(`TikTokDeliveryStatusPanel`, reading `GET /api/analytics/v2/tiktok/errors`).
That endpoint groups `marketing_delivery_attempts` by pixel, status code and
message, because eight retries across fifty queued events are one problem, not
four hundred lines. `retrying` and `permanent` are distinguished: the first may
still succeed on the next pass, the second needs a configuration change.

Platform administrators get a `tiktok_delivery_failure` notification when an
event reaches `failed_permanently`. It is raised **after** the delivery
transaction commits and can never throw into it — inside the transaction a
failed insert would roll back the terminal status, and the event would retry
forever because of the notification about it being stuck. It is throttled to
one per pixel per six hours, scoped on `source_id = destination_id`, so a
business running three pixels still learns which one broke.

Note what is _not_ reported: a pixel that fails in the visitor's browser leaves
no server-side record, so there is no error to quote for it. The panel derives
that case instead — events queued while none carried a browser dispatch is what
a pixel that never fires looks like from the server — and labels it as derived.
`?ttdebug=1` remains the only way to see a real `pixel_failed`, and only for
the person with the console open.

`ttclid` arrives once, on the ad click that starts the session, and the URL
loses it at the first soft navigation. `analytics_sessions` keeps the first
value it saw and the ingest reads it back, so a conversion three taps later
still carries the click id it was earned by.

---

## What each public page reports on its own

Beyond the clicks a visitor makes, both pages report two page-level facts:

| Signal         | When                               | Reaches TikTok        |
| -------------- | ---------------------------------- | --------------------- |
| `page_view`    | on mount, once per tracker         | yes, as `ViewContent` |
| `engaged_view` | after 15 seconds on the page, once | no                    |

`engaged_view` is what separates a visit from a bounce, and both pages use the
same threshold so one report can compare them. The mini website additionally
reports `action_open` per section reached, because it is long enough that
"nobody scrolls to the pricing table" is a finding; a linktree is one screen
and has nothing equivalent to measure.

The linktree also reports `action_open` when the WhatsApp question chooser is
opened, keyed `link:<uuid>:questions`. A visitor who opens the chooser and
picks a question therefore produces both that engagement signal and the
`whatsapp_click` conversion — the first is internal-only, the second is the one
TikTok sees, and the conversion is deliberately withheld until a question is
actually chosen. Opening the chooser and abandoning it is now visible instead
of looking identical to never tapping WhatsApp at all.

## Automatic tracking behavior

Every allowlisted public marketing page loads its configured Pixel and queues
eligible Events API delivery without waiting for a visitor choice. New browser
events carry `consentState='granted'` for compatibility with the existing API
and schema. The backend does not use that legacy field as a marketing-delivery
gate, so events queued by an older frontend follow the same automatic rule.
Bots, non-allowlisted page types, and unregistered engagement-only signals
remain excluded.

## Debugging a live page

Append `?ttdebug=1`, then in the console:

```js
window.__ttDebug.report();
```

It lists every pixel dispatch and queue handoff with its event name, event id
and action key — enough to confirm the two halves share an id. `?ttdebug=0`
turns it off. It costs one disabled boolean check when off.

With debug on, `loadTikTokPixel` also records the SDK script's own `onload` /
`onerror` under a `pixel_loaded` / `pixel_failed` entry — a pixel blocked by an
ad blocker or refused by the network is visible in the report instead of being
silent. The report's `flushes` row answers "did the server accept it?": the
queue dispatches `mt:analytics-flush` on every batch outcome with the HTTP
status and the server's `accepted` / `deduplicated` counts.

---

## Checklist

- [ ] The action is registered in `public_page_actions` with the right `tiktok_event`.
- [ ] The page reports through `createPageTracker`, not `window.ttq`.
- [ ] Internal event name describes what the visitor did; the TikTok name comes from the action row.
- [ ] Engagement signals use `trackEngagement` and do not reach TikTok.
- [ ] A server-recorded conversion shares its `event_id` with the browser.
- [ ] No pixel was added to a third surface — `pixel-placement.spec.ts` still passes.
