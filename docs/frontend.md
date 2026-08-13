# Frontend

## Private business onboarding

`/join?token=...` validates an administrator-issued, one-time 24-hour invitation before showing
Google authentication. `/join/application` additionally requires HttpOnly
signup-session cookie and is blocked by proxy otherwise. Both routes use
private no-store caching and `noindex, nofollow, noarchive`. The invitation's
expiry timestamp is not displayed on the signup screen, but an expired token
still resolves to the dedicated expired-invitation error state. The compact,
single-page application requires only business name, phone, and an available
editable subdomain. Submission records the current terms/privacy versions and
acceptance time on the server after the user follows the legal notice. Country,
city, social-profile URLs, and brand uploads are not part of the application.
Validation appears beside the affected field and
entered values remain available after recoverable failures. Signup request
payloads are built explicitly from backend DTO fields; never spread UI-only
form state into a strict API request. Platform administrator selects plan during
review. Tenant `/business/login` offers Google and a six-digit email code for
approved active business members. The root-domain platform login and the
invite signup page offer the same Google or email-code choice, with the email
option verifying identity before it creates a platform/application session.
`/business/auth/consume` exchanges the single-use handoff while rendering only
a loading state; invalid or expired handoffs return automatically to the tenant
login without exposing a stale retry screen. Tenant login loads the public business name, logo, favicon, and website color before
applying the shared authentication design; the tenant color reaches the page's text selection and window scrollbar through the
same document-level theme variables used by the public pages. Tenant-free shells (platform admin login, invite signup, signup
wizard) mark their surface with `data-multitree-theme` instead, so text selection, scrollbars, and brand utilities resolve to the
MultiTree lime everywhere on the auth sheet. Handoff consumption is guarded against duplicate React
effects, uses an eight-second client/proxy deadline, and performs a hard
dashboard navigation after the session cookie is stored. Initial dashboard
session, access-manifest, and page requests run concurrently.
Newly approved businesses enter the real dashboard with its entire surface
marked inert behind a non-dismissible required form. The single setup screen
uses the same
stacked brand asset control and grouped fields as business management: optional
brand assets and MultiTree default color, editable name and phone, read-only
assigned subdomain, and plan-limited TikTok Pixel/Events API configuration.
System page defaults are applied automatically rather than presented as a
separate step. It also shows the verified owner account name and email as
read-only identity fields. The legacy `/business/getting-started` URL only
redirects to `/business`; onboarding never uses a separate authentication page.

## Platform-administrator impersonation

The platform business directory exposes an "open dashboard" action on every
active business that has a subdomain, in both the table and grid views. It is a
button, not a link: it posts to the impersonation endpoint and navigates to the
single-use URL that comes back. `PlatformAdminDashboard` opens the target tab
synchronously on the click and assigns its location once the response lands,
because a `window.open` issued after an `await` is treated as an unrequested
popup and blocked. The returned URL is single-use and short-lived; it must
never be stored, logged, or shared.

While such a session is active, the business dashboard layout renders
`BusinessImpersonationBanner` above `BusinessDashboard`. The banner is
deliberately non-dismissible, names both the business and the administrator,
and owns the exit action, which performs a full navigation rather than a router
push because the session cookie is cleared server-side. Its presence is driven
by the `impersonation` object on `GET /api/auth/session` — never by a client
flag. See
[docs/security.md](security.md#platform-administrator-impersonation).

## Large feature composition

Large pages and templates compose focused modules rather than owning every
data lifecycle and renderer inline. The liquid-glass mini-website template uses
dedicated shared-frame, visual-utility, and informational-section modules.
Business dashboard analytics totals are loaded and normalized by
`useBusinessAnalyticsTotals`; the dashboard consumes the hook and remains
responsible for page composition and cross-feature coordination. Cached
domain responses are validated before feature hooks consume them. A legacy
or malformed Linktree-list cache entry is discarded and refetched instead of
reaching dashboard sorting or rendering code.

Add new liquid-glass sections in focused renderer modules and add new dashboard
network lifecycles as feature hooks. Do not place new independent persistence,
fetching, or rendering systems directly in the large entry components.

## Request and state boundaries

JSON API transport is owned by `frontend/src/lib/api/request.ts`. It applies
same-origin credentials and no-store defaults, serializes explicit `json`
bodies, unwraps the standard backend envelope, converts normalized failures to
`ApiRequestError`, and preserves `AbortError` for effect cleanup. Feature code
must not duplicate response parsing or error-envelope extraction.

Domain endpoints belong in feature API modules such as `features/business/api`,
`features/communications/api`, and `features/platform-admin/api`. React hooks
own loading, refresh, cancellation, and local presentation state; components
compose those hooks and domain operations. The local-storage cache delegates
network transport to the same request primitive and caches the unwrapped domain
value. Direct `fetch` remains appropriate only where the `Response` itself is
required, such as streamed downloads, upload progress/raw multipart handling,
the Next.js proxy, or calls to third-party services.

Do not introduce a global state library without a concrete state lifecycle
that cannot be represented by server rendering, a feature hook, or a focused
context.

## Motion architecture

The frontend uses the current Motion for React package through `motion/react`
as its single authored-motion runtime. `AppMotionProvider` owns the application
default easing, duration, and operating-system reduced-motion preference. Do
not add the legacy `framer-motion` package alongside `motion`, nest another
page-level `MotionConfig`, or create project-owned CSS keyframes.

Prefer the shared primitives in `components/motion/MotionPrimitives.tsx` for
spinners, pulses, status pings, shines, fades, and reveals. Use the shared
`components/ui/marquee.tsx` for measured continuous rails. A feature may use
`motion` directly when it owns a distinct interaction or visual sequence, but
it must still inherit the application provider and honor reduced motion.

CSS transitions remain appropriate for immediate visual state feedback such
as color, border, shadow, filter, and focus changes. Entrance and exit
sequences, continuous movement, loading motion, measured movement, and
multi-step transforms belong to Motion. Do not use Tailwind `animate-*`
utilities, inline `animation` declarations, injected keyframe styles, or
manual DOM animation loops for these behaviors.

MapLibre remains the owner of geographic map tilt and building extrusion. It
is an independent map renderer and must not be wrapped in or replaced by an
unrelated motion or rendering abstraction.

Next.js 16 (App Router) / React 19. See
[docs/architecture.md](architecture.md#frontend-boundaries) for feature and
component ownership and the enforced ESLint boundaries between business and
platform-administration UI. This file covers the implemented product surface,
routing, and frontend commands.

## Public platform and business pages

### Advertising-service frontend preview

The business dashboard exposes `/business/advertising` as the frontend preview
of a reusable tenant advertising-service feature. It composes the shared
dashboard header, statistic cards, segmented tabs, skeletons, tenant theme, and
public navigation/footer rather than creating a parallel dashboard shell. The
editor covers public copy, availability, contact, currency, payment labels,
packages, estimated outcomes, durations, and FAQs. Its public counterpart is
served at `/advertising` on a business subdomain and uses the current tenant's
public branding.

Until the backend domain is implemented, configuration is browser-local mock
state stored under a versioned key. The dashboard labels this limitation and
must not claim that edits are published across devices. This temporary frontend
state must not collect payments, TikTok credentials, authorization codes, or
customer orders. A future backend implementation must persist configuration per
business, calculate prices server-side, enforce tenant ownership, encrypt and
redact authorization codes, verify payment webhooks idempotently, and expose
only enabled public configuration.

The business homepage navigation links to the public advertising route. The
advertising surface follows the public site's left-to-right page structure and
reuses `BusinessPublicFooter`, the same tenant footer composition used by the
business homepage, including published Linktree, mini-website, and configured
contact columns. Public-route loading uses the current full-width 60px navbar
footprint rather than the retired floating-header skeleton.

The advertising surface also installs the tenant accent as the public cursor,
text-selection, native/custom scrollbar, and theme color, restoring MultiTree
defaults when it unmounts. Its metadata uses the tenant favicon plus logo or
default-avatar fallback for browser and social-preview imagery. Authenticated
business routes use short English browser-tab suffixes, and public content
titles are whitespace-normalized and bounded so user-entered names cannot
create excessively long browser tabs.

`BusinessPublicSiteShell` is the single visual and behavioral frame for both
the tenant homepage and tenant advertising page. It owns the public navbar,
continuous `BusinessGridBackdrop`, light/dark page surfaces, tenant theme
variables, custom scrollbar and cursor lifecycle, selection color, and shared
business footer. Public business features must compose this shell rather than
copying those concerns. Advertising sections use the same transparent section
surfaces, responsive spacing, heading scale, soft cards, and
`BusinessSectionDecorations` pattern as the homepage, so future shell-level
style changes propagate to both routes. Public business landing sections have
no separators on either route; only the shared footer retains its top boundary.

Both public hero sections render `BusinessHeroAccentBackdrop`. It provides the
same tenant-colored radial atmosphere and restrained top highlight while
leaving the shared grid visible beneath it. The component is decorative,
non-interactive, theme-aware, and is the single place to tune this effect for
the homepage and advertising page together.

The advertising route uses a compact introductory title instead of a second
marketing hero. It contains no badge, CTA, preparation note, floating label,
or secondary action. A concise Kurdish description sits below the title;
public advertising copy uses `تیکتۆک` and omits sentence-ending periods for a
consistent editorial style.

Its sponsorship journey is a dedicated interactive tutorial rather than a
generic card row. Five keyboard-operable steps explain sponsor type, package
selection, payment, receipt/video-code submission, and activation. The visual
examples use the established landing-section surfaces and Motion transitions,
show the bundled FIB, QiCard, FastPay, and Korek marks, and clearly identify
receipt and training media as examples. The public tutorial never collects
payment credentials, account passwords, receipts, authorization codes, or
orders; submission continues through the configured contact channel until a
tenant-scoped backend workflow exists.
The sponsor type, price rows, and payment-provider choices are local selection
controls rather than decorative options. A stable mockup frame owns
the guide header, content stage, and bottom navigation bar. Desktop uses a
descriptive step rail; mobile uses five compact English-number controls and
keeps the active Kurdish title immediately above them without horizontal
scrolling. Visible step descriptions and redundant `Step` labels are omitted.
English Back and Next controls and a progress indicator move through the
journey while preserving all illustrative selections.
The second tutorial stage uses one compact responsive semantic pricing table.
It shows only the sponsor type selected in the first stage, lets visitors
select an individual price row, and displays the complete English-number IQD
price and estimated-view schedule for that type. This tutorial state remains
illustrative and browser-local.
The changing stage is visually flat inside that frame: it does not wrap option
groups in another bordered card. Blue, violet, amber, rose, and emerald tones
differentiate the five steps, while individual sponsor, package, and provider
choices use distinct restrained tints and a consistent selected-state control.
The mockup header uses the shared full-color TikTok mark on its native dark
surface. Its full-width footer progress track uses five softly differentiated
segments matching the tutorial's blue, violet, amber, rose, and emerald steps;
future segments remain visible at reduced opacity.

- The root domain renders the MultiTree landing page.
- Published platform announcements can appear as root-domain banners or
  feature cards.
- Each active business owns one unique subdomain.
- A business subdomain homepage shows that business's published linktrees
  and mini-websites.
- The business homepage uses one concise customer-facing composition in both
  light and dark themes: the same shared floating navigation used by the
  MultiTree homepage, a centered grid-backed hero, a responsive public
  workspace, and the shared public footer. The workspace intentionally has no
  separate heading or description; the hero action leads directly to its
  compact `max-w-6xl` preview. The preview keeps page-edge gutters and a bounded
  internal content area rather than becoming full-width or full-viewport. It
  uses the same dark-ink/light-surface CTA palette in light mode and inverted
  white/dark-surface palette in dark mode across its shell, AI controls, focus
  treatment, and fallback cards. The shell and all structural panels inherit
  one solid surface per theme; neutral borders provide their separation. Tabs
  retain that shared surface and distinguish selection only through semantic
  state, stronger type, and a neutral inset edge rather than another fill
  color. The public helper uses the MultiTree logo and MultiTree AI label. It contains no tenant
  accent glow or colored blur. Its top rail owns the public content tabs,
  while a compact
  sidebar offers a deterministic public helper on larger screens. The helper
  handles a simple greeting locally and directs Linktree or mini-website
  requests to the business owner; it performs no network request, collects no
  visitor data, and must not claim access to private business information. The
  main panel renders the real destinations as a dense responsive visual gallery. It uses
  accessible, keyboard-operable tabs only for published Linktrees and published
  mini websites; tabs without data are omitted and the workspace is omitted
  when neither content type is published. Every
  destination opens its real published route. Public contact remains outside
  the workspace in the configured navigation action and footer. Additional
  homepage sections must remain separate instead of being embedded as workspace
  tabs. The navigation receives tenant branding and the standard persisted
  theme toggle.
  A finished, fully bordered workspace may be followed by a full trusted-by
  section using the same heading scale, responsive section spacing, and content
  width as the other landing sections. Its larger logo rail is populated only
  from enabled partner items belonging
  to published mini websites for the same tenant, deduplicates repeated logos,
  and is omitted when no real partner logos are configured. Its visual base
  sequence and visible rail are measured at runtime by the shared
  `components/ui/marquee.tsx` primitive. The business-specific component only
  supplies the heading, tenant partner content, and visual treatment. The
  sequence is repeated only enough to exceed 1.4 times the visible width,
  duplicated once, and translated by exactly half its combined width. Duration
  is derived from the measured travel distance and configured viewport-crossing
  time. The trusted-by adapter uses a slower mobile crossing time without
  changing desktop motion, so screen size and logo count cannot unexpectedly change
  perceived speed. Repeated visual fillers are hidden from assistive technology
  and cannot create duplicate keyboard stops. The hidden measurement unit uses
  `width: max-content`, no wrapping, and non-shrinking children so its observed
  box changes when natural logo dimensions resolve.
  The preview is a functional MultiTree composition built from real published
  tenant content, not a copied third-party interface. It never presents an
  internal dashboard mockup,
  management or login actions, plan information, analytics, drafts, or other
  operational data. Sections with no public data are omitted, and published
  page content is referenced from its real source rather than copied into
  homepage-only mock content.
  The digital-presence showcase uses the reusable Motion-based
  `BusinessCardStack`. Its three stacked cards are the visible and accessible
  selection targets and automatically cycle when reduced motion is not
  requested. The stable right-side container updates only its changing detail
  and preview regions through Motion. `BusinessCardPreview` remains front-only,
  uses the standard physical card aspect ratio, and sizes its internal spacing,
  typography, icon, and decoration from its own container rather than the page
  viewport so the complete card remains visible at every responsive width.
  Neither component requests,
  validates, stores, or submits payment-card numbers, expiry values, or CVV.
  All project-owned phone previews use the shared `PhoneMockup`; feature code
  must not draw another device frame inline. The component owns the same dark
  metal hardware, side controls, Dynamic Island, status indicators, home
  indicator, and strict screen clipping used by the Templates catalog. Its
  content surface is always a 390 x 858 logical mobile viewport, scaled as one
  unit into the chosen device width. This keeps template layout, safe-area
  spacing, and overflow behavior consistent in the Templates catalog, the
  MultiTree homepage, and business public pages while allowing each consumer
  to provide its own screen content and theme. The
  registry-driven stack keeps three straight phones visible on mobile and five
  from the small-tablet breakpoint upward, with one focused device and an equal
  number of overlapping phones on either side. The centered device is the
  tallest and occupies the top layer, its immediate neighbors are slightly
  shorter beneath it, and the outer devices form the shortest rear layer. It
  preserves this hierarchy and the common footer baseline after every carousel
  move by keeping layout movement and scale emphasis on separate Motion layers.
  It cycles through every
  registered template one at a time. Each device is cropped by ten percent at
  the bottom to keep the composition compact. All five cropped devices share a
  single bottom baseline that meets the following footer boundary without an
  empty trailing gap. Dedicated previous and next buttons own navigation;
  preview phones are deliberately non-interactive. The stage reserves
  width-derived responsive headroom above the enlarged center device throughout
  the complete mobile range, then switches to fixed tablet and desktop stage
  heights. Device and control sizing is slightly reduced below 381px so no
  phone clips into the preceding content on narrow screens. A
  standard landing-section heading and description
  introduce the stack, while the device stage itself has no decorative surface,
  controls, or canvas background: template surfaces render directly inside
  transparent device hosts. Strict paint containment prevents template UI from
  escaping the device screen. Linktree
  phones reuse `DynamicTemplate`
  and the same shared preview fixtures as the dashboard Templates page, with the
  same MultiTree fixture data and standardized WhatsApp, Viber, and phone
  actions shown in the Templates catalog. Mini-website
  phones use the real registered template component and published tenant
  content. Heavy template trees are isolated behind a memoized phone-content
  boundary, while the five-device composition uses Motion position-only layout
  transitions and transform-based spring emphasis. Navigation controls use
  Motion hover and press feedback rather than authored CSS animation. Reduced
  motion is honored, and the previews remain non-interactive so they cannot
  trigger contact actions or expose dashboard or private data.
  The public homepage route renders the shared `SkeletonPublicLandingPage`
  composition while server-side business, Linktree, and mini-website requests
  are pending. It preserves the navbar, hero, workspace, and following-section
  footprints using the existing theme-aware `Skeleton` primitive. Registered
  phone-template content is synchronous and does not introduce a second local
  skeleton or artificial loading flash.
  Business landing sections share one page-level `BusinessGridBackdrop` rather
  than rendering independent section grids. Hero, workspace, trusted partners,
  about, digital presence, and device previews sit above the same continuous
  pattern, which begins at the first page pixel behind the transparent business
  navbar, fades only at the lower landing-content boundary, and retains the
  established light and dark palettes. The footer keeps its solid landing
  surface and is intentionally excluded from the grid.
  Each landing section reuses `BusinessSectionDecorations` for small floating
  compact floating chips inspired by the hero reference treatment. They use
  short section-related text and
  distinct softly tinted surfaces, borders, shadows, and dots. They remain
  non-interactive and assistive-technology hidden and appear only at spacious
  desktop widths. Each section uses a different deterministic placement, dot
  direction, and professional secondary color while retaining one
  tenant-colored treatment. This creates a random visual rhythm without
  hydration instability or position changes between renders. Section surfaces
  remain neutral and no page-level accent blur is introduced.
  The unique Kurdish phrase pairs are centralized with the landing section IDs;
  no decoration name or phrase is reused between sections. A centralized
  twelve-color palette also assigns two distinct treatments to each of the six
  sections; the tenant color is used once in the hero and no authored color is
  repeated elsewhere.
  The floating business navbar exposes Kurdish anchor links for the workspace,
  about, digital-presence, and device-preview sections. The business logo and
  name return to the homepage-root `سەرەتا` anchor instead of duplicating it as
  a text item or reloading the page. Stable
  section IDs, smooth document scrolling, and shared scroll margins keep
  headings clear of the fixed navbar; compact viewports use the existing
  dismissing navigation menu. Its contact action opens the tenant's configured
  WhatsApp destination in a new tab only when WhatsApp is enabled and the
  normalized number is valid.
  All business landing fragment IDs and matching hrefs come from
  `business-landing-sections.ts`; components must not repeat literal section
  hashes. `PublicSiteNavbar` uses a native anchor for same-document fragments and
  retains Next.js `Link` for route navigation, preventing fragment routing from
  mixing with application routes.
  The shared `components/public/PublicSiteNavbar.tsx` replaces the former
  floating navbar on both MultiTree and tenant pages. It uses a full-width,
  fixed 60px header with a centered inner container, square page edges, and the
  stable MultiTree page surface and a transparent business surface at the top.
  After scrolling, the business appearance adds a restrained glass version of
  its background in both themes with no visible border, lower surface opacity,
  stronger backdrop blur and saturation, and a compact shadow. Its mobile menu
  spans the full header width, supports Escape dismissal and `aria-expanded`,
  and preserves tenant branding, actions, anchors, and persisted theme behavior.
  The business-only glass state begins at the first non-zero scroll position and uses explicit
  theme-aware RGBA surfaces so it does not depend on generated opacity classes;
  returning to scroll position zero restores a fully transparent background.
  Motion animates the business background opacity, backdrop blur, saturation,
  and shadow in both directions with a soft easing curve; reduced-motion users
  receive the same state change immediately without animation.
  Trusted Partners remains a conditional landing section and responsive
  marquee when tenant partner data exists, but is intentionally omitted from
  navbar navigation to keep the primary section list concise.
  About Us follows the same centered heading scale, responsive spacing, content
  width, neutral bordered surface, and light/dark palette as the surrounding
  sections. Its Kurdish descriptions remain centered in one non-nested content
  surface, with only a compact divider and the existing service identity labels
  retained as section-specific details.
  The business hero redistributes a fixed total vertical padding toward its top
  edge so the text group sits slightly lower and reads as visually centered,
  without changing the hero height or moving the workspace below it.
  Its public-pages action uses the tenant's configured business color and the
  shared contrast-aware ink calculation so its label remains readable.
- Public linktrees render at `/linktree/:uid`. The same route also resolves a
  linktree by its SEO name.
- Linktrees support branding, an avatar, a subtitle tagline under the name, a
  longer description helper text, configurable footer, WhatsApp questions,
  ordered links, TikTok tracking, and 12 selectable templates.
- Public mini-websites render at `/bio/:slug`.
- These two routes are the only ones that load a business's TikTok pixel, and
  both report through `createPageTracker`
  (`features/analytics/page-tracking.ts`). Adding tracking to anything on
  either page follows [docs/tracking.md](tracking.md); mounting the pixel on a
  third surface fails `components/analytics/pixel-placement.spec.ts`.
- On full public mini-websites, the theme and share controls sit in a utility
  row below the cover beside the overlapping profile area, so they remain
  readable without obscuring the business's cover image.
- Why-choose-us items use a rotating accessible color palette for their icon
  badges, with translucent fills that remain visible in light and dark modes.
- The public services/products section uses prominent two-column showcase
  cards with large imagery, numbered overlays, stronger depth, and larger
  content/actions. Each card keeps the shared neutral surface while its text,
  icons, number, and price use a distinct content accent; action buttons retain
  their configured platform/brand color. Service images open in the shared
  keyboard- and touch-friendly image viewer; compact dashboard previews retain
  their horizontal rail.
- Mini-websites support four visual variations (`soft`, `glass`, `minimal`,
  and `warm`) and the currently enabled section types: social links,
  locations, business hours, gallery, FAQ, services, appointment booking,
  team members, certificates and achievements, videos and reels, partner
  brands, business-authored reviews, before-and-after comparisons, languages,
  payment methods, special offers, events and workshops, audio and podcasts,
  business advantages, impact stats, a process/how-it-works timeline,
  documents and downloads, owned brands and pages, education history, work
  experience, a lead-capture enquiry form, pricing plans, and stories
  (persisted and editable, but not yet rendered on the public page).
- Appointment cards can open a business's public Calendly, Cal.com, Google
  Calendar, or custom HTTPS booking page, or start a WhatsApp conversation.
  MultiTree stores the appointment details and click analytics; availability,
  confirmation, cancellation, and reminders remain with the selected
  provider.
- Team members can include a photo, role, experience, biography, and an
  optional link, phone, or WhatsApp action.
- Certificates can include an image, issuer, year, description, and optional
  HTTPS verification link.
- Videos play inline through public YouTube, TikTok, Instagram, Facebook,
  Vimeo, Dailymotion, Streamable, and Loom embeds, or through direct HTTPS
  MP4, WebM, and Ogg files. Unknown HTTPS pages remain external links.
  Partner logos can link to their brands and render in a continuously
  looping, pause-on-hover marquee.
- Before-and-after sections support up to 12 titled image pairs, optional
  descriptions and custom labels, and a comparison slider controlled by
  touch, mouse, or keyboard.
- Languages support up to 30 entries, each with an optional supporting
  detail.
- Payment methods support up to 32 entries with built-in neutral icons for
  common Iraqi providers and general methods, optional account instructions,
  and an optional uploaded provider logo.
- Special offers support up to 20 promotions with prices, coupon codes,
  expiry dates, images, and optional HTTPS destinations.
- Events and workshops support up to 20 dated entries with a location,
  image, description, and optional HTTPS registration link.
- Audio and podcasts support up to 20 direct audio files or public Spotify,
  SoundCloud, Apple, YouTube, and other HTTPS episode links.
- Why Choose Us supports up to 20 short advantages with selectable built-in
  icons and supporting descriptions.
- Impact stats support up to 20 entries, each with a value, an optional
  suffix, a label, and a selectable built-in icon.
- The process/how-it-works timeline supports up to 20 steps, each with a
  title, description, selectable built-in icon, and an optional action link.
- Documents and Downloads supports up to 24 externally hosted HTTPS files
  with titles, descriptions, file types, and display sizes.
- Owned Brands & Pages supports up to 20 properties with an ownership or
  leadership relationship, type, logo, description, official HTTPS link,
  optional founding year, and optional featured public content. Facebook
  Pages, public Facebook posts, public Instagram posts and reels, YouTube
  videos, playlists, and channel uploads use official embeds when their
  platforms allow them; every entry retains a reliable official-link card as
  a fallback.
- Education supports up to 20 résumé-style entries with an institution,
  degree or qualification, field of study, location, current or completed
  status, start and end years, grade, description, institution logo, and
  optional HTTPS verification link. Current study automatically displays
  `Present`.
- Work experience supports up to 20 entries with a title, organization,
  employment type, location, start and end dates, current/completed status,
  description, image, and optional HTTPS verification link.
- The lead-capture form supports up to 12 custom fields (with up to 20
  options each), an optional consent checkbox, and a configurable success
  message; submissions are posted directly from the public page and become a
  CRM contact and lead.
- Pricing supports up to 6 plans with up to 20 features each, a price,
  billing period, one featured/recommended tier, and a call-to-action;
  missing features are automatically shown as gaps relative to the richest
  plan.
- Locations support exact pins or approximate-radius display, multiple
  branches, contact details, images, and map links.
  - Public pages are server rendered with business-scoped metadata and return
    a themed not-found page when the business or page cannot be resolved.
  - All error-page markup and styling lives in the single shared
    `components/error-pages/ErrorPage.tsx` component. Page-level 403, 404, 410,
    500, 502, 503, and 504 states replace the homepage content while retaining the
    real public navbar and footer. The error-content region fills the small viewport,
    keeping the footer below the initial fold until the visitor scrolls. Root
    pages pass the MultiTree theme, while business pages pass the current
    business color, favicon, logo, and name. Every error-page home action points
    to `/` on the current host; error pages never link to a dashboard or login.
    Authorization failures use 403 only when the authenticated user may safely
    know the page exists. Concealed private routes and cross-tenant resources
    continue to use 404. Public Linktree and mini-website URLs return 410 only
    when a tenant-scoped deletion tombstone proves that the content previously
    existed and was permanently removed; unknown URLs remain 404. A 429 response
    uses the same large presentation as 500
    inside the active page region; on login it replaces the full right-side
    form panel while preserving the left branding panel rather than replacing
    the whole page. A 502 response means a critical upstream service returned an
    invalid response. It replaces public tenant or dashboard content, and on
    login it replaces the form-side panel; optional integrations keep a local
    error. A 503 response represents a temporary maintenance or
    upstream-service outage and includes a retry action that reloads the current
    page. Critical 503 and network failures replace public tenant content and
    business or platform dashboard content with that shared page. On business
    and platform-administrator login screens, the 503 state replaces the full
    form-side panel while retaining the branding panel. Optional requests such
    as branding, analytics, and secondary feature data keep a local fallback and
    must not turn the whole screen into a 503 page. A 504 response means a
    critical upstream request exceeded its deadline and uses the same placement
    rules and retry behavior as 502. The frontend API proxy returns 504 when its
    30-second backend deadline aborts a request; other connection failures remain 503.
    Recoverable request failures (400, 409, 413, 415, and 422) do not replace
    the page. They render through the shared
    `components/shared/InlineRequestError.tsx` alert inside the affected form,
    dialog, or upload area so entered data remains available for correction.
    Upload selectors validate size and declared media type before sending, while
    the backend remains authoritative and validates the actual file signature.
    Next.js `error.tsx`, `global-error.tsx`, and `not-found.tsx` files remain
    thin required route boundaries with no visual implementation. Platform
    administration intentionally has no local error boundary and inherits the
    root pages.

## Business dashboard

The authenticated business dashboard is available at `/business` on the
business's own subdomain. It provides:

`/business` is the operational **Dashboard** (`داشبۆرد`), while Linktree
management lives at `/business/pages`. The Dashboard uses only tenant-owned,
persisted system data: current and previous filtered analytics totals,
published public-page status, filtered top-page performance, aggregate CRM
activity, TikTok delivery health, effective-plan quotas, and conditions that
actually require action. It does not estimate revenue, fabricate activity, or
duplicate the detailed Analytics screen. Optional CRM and TikTok requests run
only when effective access permits them; unavailable optional data does not
erase the core dashboard summary.
The page follows the same management composition as Linktree and Mini Website:
six shared statistic cards precede one shared dashboard surface containing the
page header, controls, and operational content. Its shared period selector
supports today, 7, 30, and 90 days plus lifetime; comparisons use the immediately
preceding equal-length period, while lifetime deliberately has no fabricated
comparison. Changing the selector dynamically reloads summary analytics,
per-page rankings, CRM activity, and TikTok delivery results with the same date
range. Current inventory and subscription quotas remain unfiltered snapshots.

Its sidebar footer uses the tenant's effective subscription as its source of
truth, shows an upgrade action only below the highest plan, and keeps support
available in both expanded and collapsed layouts. The navigation region scrolls
independently on shorter screens so the account controls remain reachable.

Dashboard metrics use the shared `components/shared/StatCard.tsx` component.
Its `standard`, `funnel`, `live`, `comparison`, and `story` variants preserve
the visual requirements of each context without duplicating metric markup.
Color, icon, compact sizing, descriptions, actions, and loading state remain
configurable. The component's loading state selects the matching
`SkeletonStatCard` shape so data arrival does not change the card's footprint.
Linktree and mini-website initial data, lazy page bundles, grids, tables, edit
forms, and analytics content use the matching shared skeleton composition.
Advanced Analytics, CRM, Event Tracking, TikTok configuration, Settings,
sessions, business messages, and communication inboxes follow the same rule:
their initial placeholders preserve metrics, tabs, headers, and the expected
chart, table, form, or list body instead of showing only a spinner or leaving
the rest of the page blank.
The business Templates route uses a catalog-specific skeleton while template
permissions load, including its metrics, category tabs, header, and phone
preview footprints. Linktree previews retain their lazy shared skeleton. The
Mini Website category tab is intentionally retained with one empty monitor
frame and a catalog count of zero; it imports and renders no sample website
until dedicated mini-website template previews are implemented.
Background refreshes preserve the existing content, while saves, uploads,
destructive actions, and other explicit operations retain compact progress
feedback instead of hiding their surrounding context.
The business dashboard header refresh control coordinates one in-place refresh
of shared business identity/access data, the notification inbox, and loaders
registered by the currently mounted page. It deduplicates overlapping clicks,
keeps the current route, filters, tabs, pagination, dialogs, and visible
content in place, and reports partial failures without performing a browser
reload. Editors and settings forms must not register a loader that replaces
unsaved local input; they may refresh only independent read-only data.
The Linktree and mini-website management pages each expose six equivalent
metrics—owned page count, views, unique visitors, interactions, interaction
rate, and conversions—but query them through separate analytics page-type
boundaries. Linktree summaries use `pageType=linktree`; mini-website summaries
use `pageType=mini_website`. Clearing analytics from either management page is
also scoped to that page type and must never remove the other type's data.

- linktree creation, editing, deletion, publication status, default-page
  selection, slug checks, link ordering, link batch synchronization, image
  uploads, template selection, footer settings, and WhatsApp modal settings;
- mini-website creation, editing, deletion, publication status, slug checks,
  section management, image uploads, and public preview;
- template browsing subject to the business's plan;
- profile and branding management, including logo, favicon, default avatar,
  website color, business name, username, phone, and email;
- default linktree template, background, footer, and WhatsApp settings;
- TikTok Pixel and Events API configuration;
- active-session listing and revocation;
- analytics summaries, daily and range reporting, breakdowns, visitor
  journeys, action performance, funnel, retention, and realtime reporting;
- CRM lead summaries, lead lists, lead-status updates, and lead notes;
- TikTok delivery health and retry controls;
- analytics deletion for one public page or the complete business;
- business notifications, announcement banners, and conversations with the
  platform administrator.

Dashboard navigation and backend actions are controlled by the business's
effective access manifest. Effective access combines capability rules,
subscription entitlements, field rules, approval requirements, and quotas —
see [docs/security.md](security.md#authorization).

Routes: `/business`, `/business/mini-website`, `/business/analytics`,
`/business/crm`, `/business/tiktok-config`, `/business/templates`,
`/business/profile`, `/business/settings`.

## Platform-administration console

The platform-administrator console is exposed only on the root domain through
the configured `PLATFORM_ADMIN_PATH`. A dynamic route validates that configured
segment directly; there is no physical public implementation route.

The console provides:

- business editing, deletion, session revocation, profile-change
  request review, session revocation, asset uploads, TikTok configuration,
  and linktree import/export;
- global linktree template availability and configuration;
- IP/CIDR allow and deny rules scoped to MultiTree, platform administrators,
  businesses, business administrators, public linktrees, or the business API
  (see [docs/security.md](security.md#ip-allowdeny-rules) — this feature is
  currently unenforced);
- a permission catalog, permission profiles, field-level rules, approval
  rules, explicit denies, and access simulation;
- typed entitlements, subscription products, plan configuration, template
  access, permission assignment, business subscriptions, usage counters, and
  approval review;
- a combined activity view over immutable security audit events, HTTP
  request telemetry, public analytics events, and marketing-delivery
  attempts, with filters, detail views, summaries, pagination, and bounded
  CSV export;
- announcements for all businesses, selected plans, or selected businesses,
  with business-bell, dashboard-banner, and public-homepage channels;
- encrypted administrator/business support conversations and notifications;
- developer API clients, key rotation and suspension, scopes, IP allowlists,
  per-business rate policies, API catalog groups, version notices, webhook
  endpoints, webhook-secret rotation, webhook tests, and generated API
  documentation — see [docs/api-standards.md](api-standards.md);
- administrator profile, branding, sessions, platform statistics,
  Redis cache clearing, upload policy, unused-media cleanup, data-retention
  policy, and manual retention runs.

The billing implementation is an internal access, plan, subscription, and
quota system. It does not collect money. There is no payment-provider
checkout, payment-method management, invoice generation, refund processing,
or payment reconciliation.

Routes (mounted beneath the private console path): `/`, `/templates`,
`/blocklists`, `/access-control`, `/billing`, `/activity`,
`/communication-center`, `/api`, `/settings`.

## Routing and tenancy

Assume `ROOT_DOMAIN=example.com` and a business subdomain of `acme`.

| URL                                         | Result                       |
| ------------------------------------------- | ---------------------------- |
| `https://example.com/`                      | Platform landing page        |
| `https://example.com/<PLATFORM_ADMIN_PATH>` | Platform console             |
| `https://www.example.com/`                  | Treated as root domain       |
| `https://acme.example.com/`                 | Business public landing page |
| `https://acme.example.com/linktree/:uid`    | Public linktree              |
| `https://acme.example.com/bio/:slug`        | Public mini-website          |
| `https://acme.example.com/login`            | Redirect to business login   |
| `https://acme.example.com/business/login`   | Business login               |
| `https://acme.example.com/business`         | Business dashboard           |

The frontend proxy:

- derives the subdomain from the `Host` header;
- checks business subdomains against the backend;
- attaches `x-subdomain` to internal requests;
- blocks `/business` on the root domain;
- blocks the private platform path on business subdomains;
- keeps the retired physical console path concealed as a compatibility and
  security tombstone;
- checks the platform-administrator session before serving the configured
  private console path;
- submits non-API page telemetry in the background;
- generates a fresh CSP nonce per rendered request, supplies the policy to
  Next.js through the request headers, and returns the identical policy to the
  browser so framework scripts receive the nonce automatically;
- rejects authenticated browser mutations whose `Origin`/`Referer` does not
  match the effective request origin (see
  [docs/security.md](security.md#csrf--origin-protection)).

Caddy removes inbound client `x-subdomain` headers before proxying. Business
services still scope owned records by the authenticated business ID.

### Retained compatibility aliases

The retired `/system` path remains a deny-only proxy tombstone so old links
cannot expose the platform-administrator console. Persisted administrator
notifications that still begin with `/system/` are normalized to the active
configured console path when opened. Likewise, legacy
`/images/upload/system/` URLs are read through the new `multitree` media
namespace. These aliases are read-only compatibility behavior: no route,
notification, or upload is newly created with the retired term.

## Commands

| Command                             | Action                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev:fe`                       | Start the frontend development server on port `3011` with Webpack (the stable fallback for local route compilation) |
| `pnpm build:fe`                     | Copy root `.env` to `frontend/.env` when present, then build                                                        |
| `pnpm --filter frontend dev`        | Sync the MapLibre worker and run Next.js on port `3011`                                                             |
| `pnpm --filter frontend build`      | Sync the MapLibre worker and create a production build                                                              |
| `pnpm --filter frontend start`      | Run the production build on port `3011`                                                                             |
| `pnpm --filter frontend lint`       | Run ESLint                                                                                                          |
| `pnpm --filter frontend lint:fix`   | Run ESLint and apply fixes                                                                                          |
| `pnpm --filter frontend type-check` | Run TypeScript without emitting files                                                                               |
| `pnpm --filter frontend test`       | Run the Vitest suite once                                                                                           |

Default local address: `http://localhost:3011`. For subdomain routing in
development, use a wildcard localhost domain such as `http://acme.lvh.me:3011`
and include every browser origin, including its port, in `CORS_ORIGIN`. Add
local hostnames used for device testing to `ALLOWED_DEV_ORIGINS`.
