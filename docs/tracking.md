# Public-page tracking

Sponsor.krd has one first-party analytics pipeline. TikTok browser Pixel and
Events API delivery are an optional, narrower layer on top of that pipeline.

## Placement rule

TikTok marketing tracking is allowed only on published public Linktree pages.
It must not be mounted or forwarded from:

- the Sponsor.krd root website;
- platform administration or authentication;
- business dashboards or authentication;
- a business subdomain landing page;
- the public advertising page or video-code guide; or
- Creator and client workspaces.

Fixed public routes may collect first-party analytics through
`PublicRouteTracking`, but that component must never mount `TikTokPixel` and
the backend must never create TikTok outbox rows for `route` or `advertising`
page types.

The structural placement test in
`frontend/src/components/analytics/pixel-placement.spec.ts` enforces the
browser boundary. `forwardsToTikTok` and its tests enforce the server boundary.

## Shared page tracker

Public Linktree interactions report through
`frontend/src/features/analytics/page-tracking.ts`. A component must not call
the TikTok queue directly.

Every reported event receives one randomly generated event ID. When a browser
Pixel event and server Events API event represent the same conversion, both
must use that exact ID and the same TikTok event name. TikTok can then
deduplicate the pair.

The tracker:

- records a page view once;
- suppresses rapid duplicate actions;
- queues first-party events durably in the browser;
- hands navigation events off before leaving the page;
- fires a Pixel only for a registered action; and
- treats engagement-only events as first-party analytics, not conversions.

Analytics failures must never break public navigation or rendering.

## Registered actions

Every reportable public action has a `public_page_actions` row. The row binds:

- the action to one `public_pages` identity;
- a stable `action_key` used by the renderer;
- an internal action type and label;
- the allowed TikTok event name; and
- optional metadata and destination information.

Renderers use neutral keys such as `link:<id>` or `page:<purpose>`. New code
must not reuse names from removed page systems. An unregistered action can be
recorded internally, but it cannot fire a Pixel because the browser and server
would have no authoritative shared event name.

## Browser Pixel

`TikTokPixelBaseCode` provides the server-rendered base snippet for public
Linktree HTML. `TikTokPixel` handles client route state, and
`tiktok-dispatch.ts` is the only runtime owner of `window.ttq`.

Pixel IDs come from the business's database configuration. Events API tokens
are encrypted at rest and are never sent to the browser. Neither value may be
read from a shared environment variable because tracking ownership is
per-business.

## Events API

The backend ingests first-party analytics idempotently. Eligible Linktree
events create transactional `marketing_event_outbox` rows for active,
entitled business destinations. The outbox worker performs delivery, retry,
backoff, error recording, and permanent-failure notification.

Engagement-only events without registered actions do not enter the TikTok
outbox. Examples include section opens, form views, and engaged-view
milestones. They remain available to Sponsor.krd analytics.

## Privacy and security

- Never expose Events API tokens, internal owner IDs, IP addresses, or raw
  identity claims to public clients.
- Apply the configured retention policy to raw analytics and delivery data.
- Hash TikTok advanced-matching values in the required normalized form.
- Validate page and action ownership server-side; never trust IDs from the
  browser.
- Keep debug output free of secrets and sensitive personal data.
- Preserve tenant entitlement checks before creating outbox work.

## Adding a tracked Linktree action

1. Define a stable neutral action key.
2. Register its `public_page_actions` row through the supported backend write
   or seed path.
3. Use the shared page tracker in the public renderer.
4. Choose the internal event and TikTok event deliberately.
5. Verify that Pixel and Events API deliveries share the same event ID and
   event name.
6. Add tests for registration, tenant ownership, rapid-repeat suppression,
   navigation delivery, and TikTok eligibility.
7. Run the placement test to prove no new surface mounts the Pixel.

Any request to add TikTok tracking to a non-Linktree surface is an architecture
and privacy-policy change, not a component-level implementation detail.
