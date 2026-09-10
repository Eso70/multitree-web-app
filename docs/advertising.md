# Advertising service

This document describes the advertising service that exists in Sponsor.krd
today. It is an operational reference, not an implementation proposal.

## Product surface

Each entitled business has one advertising page at `/advertising` on its
business subdomain. The business dashboard editor is available at
`/business/advertising`. A companion public video-code guide is available at
`/advertising/video-code`.

The page supports:

- configurable hero and closing-call-to-action content;
- an ordered sponsorship journey;
- package categories and price tiers;
- results, testimonials, FAQs, and payment providers;
- section visibility and ordering;
- draft, publish, unpublish, version history, and restore workflows;
- validated business-owned image uploads; and
- public analytics through the shared page tracker.

The page is not a general website builder. There is one fixed advertising page
per business and no delete endpoint.

## Ownership and authorization

Dashboard endpoints resolve the business exclusively from the authenticated
session. They never accept a client-supplied business identifier.

All editor operations require the advertising page entitlement and the
corresponding read, update, or publish capability. Writes and publish/restore
operations are audited. Platform impersonation must obey the central
impersonation policy.

The public endpoint resolves a business from the request subdomain, applies
business access rules, and returns only published content. Draft, paused, and
archived content returns `404` and is never sent to the browser.

## API

Authenticated business routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/advertising` | Read the current draft |
| `PATCH` | `/api/advertising` | Save a draft |
| `POST` | `/api/advertising/save-and-publish` | Atomically save and publish |
| `POST` | `/api/advertising/publish` | Publish the current draft |
| `POST` | `/api/advertising/unpublish` | Remove the page from public access |
| `GET` | `/api/advertising/versions` | List saved versions |
| `POST` | `/api/advertising/versions/:version/restore` | Restore a version |
| `POST` | `/api/advertising/upload/image` | Upload a validated image |

Public route:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/public/advertising` | Read the published page for the request subdomain |

All successful API responses use `{ success: true, data }`.

## Persistence

The numbered database baseline defines the advertising domain:

- `advertising_pages` stores singleton page-level content and status;
- `advertising_sections` stores section visibility and position;
- `advertising_package_categories` and `advertising_package_tiers` store the
  pricing hierarchy;
- `advertising_results`, `advertising_testimonials`, `advertising_faqs`, and
  `advertising_payment_providers` store ordered repeatable content; and
- `advertising_page_versions` stores immutable published snapshots.

`public_pages` provides the public identity used by analytics. Business
ownership is enforced by foreign keys and tenant-scoped queries. Saving
repeatable content reconciles rows transactionally so omitted items are
removed without affecting another business.

Defaults come from
`backend/src/advertising/advertising.defaults.ts`. The backend owns defaults;
the frontend must not invent or repair missing server content.

## Publishing

The dashboard Save action uses the atomic save-and-publish endpoint. The
header visibility control can publish or unpublish independently. Publishing
creates a version snapshot and invalidates the affected public cache.

Restoring a version is a controlled write through the service; callers cannot
submit an arbitrary snapshot payload.

## Media

Advertising accepts images only. Uploads go through the shared image validator,
which checks file signatures rather than trusting the declared MIME type, then
through `StorageService` and business asset ownership registration.

Video content is a URL. Adding video upload would require a separate media
policy covering size, formats, transcoding, storage, and delivery.

## Frontend boundaries

The editor lives under `frontend/src/features/advertising/`. Public rendering
uses the same typed configuration returned by the backend. Shared sections are
standalone components; the route files remain thin data-loading boundaries.

The public page must never read dashboard-only state or browser local storage.
Unavailable public data uses the normal not-found behavior instead of rendering
a draft or fallback copy.

## Tracking

Advertising uses the shared page tracker for first-party analytics only.
Advertising components must not mount a TikTok pixel, and advertising events
must not enter the Events API outbox. Pixel placement and event-ID rules are
defined in [tracking.md](tracking.md).

## Verification

Changes to advertising must cover:

- DTO validation and projection round trips;
- tenant isolation and capability denial;
- draft/publish/unpublish and version restore behavior;
- transactional reconciliation of repeatable rows;
- public rejection of unpublished content;
- upload content validation and ownership;
- cache invalidation; and
- both business-editor and public-page integrations.

Run the proportionate checks from [testing.md](testing.md), and run the full
workspace verification before deployment.
