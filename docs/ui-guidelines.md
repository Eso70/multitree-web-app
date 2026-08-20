# UI Guidelines

## Purpose

This document defines the UI standards for MultiTree.

The goal is to ensure every page, component, and interaction feels like part of the same product while keeping business and platform administration implementations properly separated.

General development principles are defined in `AGENTS.md`. This document focuses on the visual system and UI architecture.

---

# Design Principles

Every interface should prioritize:

- Consistency
- Clarity
- Simplicity
- Accessibility
- Responsiveness
- Reusability

Users should not feel like they are switching between different applications.

## Typography

Rabar is the product-wide typeface and must be inherited by public pages,
dashboards, dialogs, notifications, form controls, and generated interface
labels. Responsive headings and content cards must allow long Latin and Kurdish
text to wrap without clipping glyphs, truncating meaningful content, or causing
horizontal page overflow. Use comfortable line height and responsive gaps that
account for Rabar's metrics.

---

# One Product, Multiple Permission Domains

The application contains multiple permission domains:

- Business Dashboard
- Platform Administration
- Public Pages

Although their functionality differs, they should share the same visual language.

Business and Platform Administration code remain dependency-isolated (see `docs/architecture.md`), while shared visual patterns belong in neutral reusable components.

Never duplicate UI simply because it belongs to a different permission domain.

## Public business homepages

Public business homepages are customer-facing product-style sites, never
authenticated dashboards. Use strong typography, real business branding and
published media, restrained color, purposeful whitespace, and a product-style
public-content preview when it materially helps visitors discover published
destinations. Reuse the MultiTree homepage's shared floating navigation and
theme behavior, supplying tenant branding and public business links through
its configuration instead of creating a parallel navbar. Reference sites may inform hierarchy, spacing, contrast, and
interaction rhythm, but their proprietary code, assets, copy, branding, and
exact trade dress must not be reproduced. Once a reference-led homepage
direction is selected, keep the public business homepage concise: shared
navigation, one hero whose lower area contains a compact real-content workspace,
and the shared footer. Keep that workspace centered at `max-w-5xl` with page
gutters; it is not a full-width or standalone full-viewport section. Its visual
language may resemble a polished creative editor: a project-tab rail, a small
public helper sidebar on larger screens, a restrained secondary toolbar, and a
dense image-led gallery. The helper must remain deterministic and local: greet
visitors briefly and direct Linktree or mini-website requests to the business
owner without persisting input, calling a backend, or implying access to
private data. Light mode must provide an equally intentional
neutral counterpart instead of forcing the entire mockup dark.
Its tabs must be keyboard-operable, omit unavailable categories, and remain
limited to published Linktrees and published mini websites. Do not add a
workspace overview tab or a separate brand/status header inside the mockup.
Render both content types with the same reusable visual-card treatment so tab
changes do not alter the workspace's density or interaction language. Subtle
window framing, layered surfaces, and tenant-accent details may make the
preview feel tangible, but must remain decorative, accessible in light and
dark themes, and secondary to real published content.
The workspace tab rail must fit its available width without horizontal
scrolling. Every scrollable surface on a public business homepage, including
the workspace's internal content area, inherits the tenant accent for its
scrollbar. The custom cursor and text-selection highlight inherit that same
accent and restore the MultiTree default when the visitor leaves the page.
Business homepage hero and workspace copy may be written in Sorani Kurdish
while the page and workspace layout remain left-to-right. The shared footer
keeps its established content contract. Dynamic tenant content keeps automatic
text direction. Workspace content must explicitly hide horizontal overflow and
expose only its right-side vertical scrollbar.
When real partner logos exist, a trusted-by rail may follow the completed
workspace as a separate section. Match the reference pattern's quiet heading,
single optical logo line, edge fade, and restrained motion without copying
third-party logos or trade dress. Logos sit directly on the section surface,
without individual card containers. Use the shared marquee UI primitive
rather than implementing animation and measurement inside the feature
component. It measures one natural content pass and the visible rail, repeats
that pass only enough to make a viewport-safe block, duplicates the block
once, and translates exactly half the combined width. Its speed setting
represents an approximate viewport-crossing time and may define a deliberately
slower mobile crossing time, so perceived pace never accelerates on narrow
screens. Recalculate after image
loading, data changes, and resizing; pause on hover or keyboard focus. Never
invent endorsements: source logos only
from enabled partner content on the tenant's published mini websites, remove
duplicates, omit image-less entries, and hide the entire rail when empty.
Contact and any future homepage sections remain outside the workspace in their
appropriate page locations. Avoid unrelated secondary
marketing sections, decorative dashboard mockups, fake metrics or testimonials, repeated
generic card grids, glass panels, glowing gradients, floating shapes, and
unnecessary icons. Never expose login, management, subscription, analytics,
draft, notification, or platform-operation details to anonymous visitors.
Render only explicitly public contact fields and published tenant content;
omit unavailable sections instead of inventing content or displaying empty
placeholders.

---

# Component Ownership

The MultiTree root marketing website and tenant business websites share the
neutral `PublicMarketingSiteShell`. Surface-specific shells are thin adapters:
they may supply branding, navigation, actions, footer content, and explicit
capabilities, but must not duplicate navbar behavior, theme handling,
backdrops, scrolling, or page chrome. Root marketing sections live in
`features/public-site/components`-style feature files (currently directly
under `features/public-site`) and remain individually reusable across the home
and dedicated marketing routes.

Marketing previews must demonstrate the real product category without
pretending that mock people, revenue, traffic, endorsements, or pricing are
real. Use clearly illustrative templates and interface states. Keep all copy
and repeatable data in the centralized marketing content module so a future
platform content manager can replace the source without replacing the UI.

MultiTree marketing prose and primary calls to action remain Kurdish. English
is reserved for established product terms, concise top-level navigation, and
the intentionally LTR root footer. Root marketing primary CTAs use the fixed
MultiTree lime color rather than the configurable platform accent. Visible
marketing sentences do not use terminal full stops.

Business landing pages, MultiTree marketing pages, and business advertising
pages share `PublicMarketingHero`, `PublicHeroAccentBackdrop`,
`PublicSection`, `PublicSectionHeading`, and `PublicCallToActionSection`.
Responsive spacing, heading scale, light/dark surfaces, action hierarchy, and
tablet/mobile behavior belong to those primitives. Each surface supplies only
its copy, accent, actions, decorations, section data, and permission-specific
behavior. Advertising editor statistics and public-section visibility controls
also live in standalone feature components rather than inside the editor page.

Shared UI belongs in:

- `frontend/src/components/ui`
- `frontend/src/components/shared`

Business-specific presentation belongs in:

- `frontend/src/components/business`

Public-facing presentation belongs in:

- `frontend/src/components/public`

Visual templates belong in:

- `frontend/src/components/templates`

If multiple areas require the same component, move it into the shared layer instead of copying it.

---

# Reuse Before Creating

Before creating a new:

- layout
- page section
- card
- table
- form
- button
- dialog
- badge
- modal
- navigation element
- filter
- loading state

Search for an existing implementation.

Extend existing components whenever practical.

New UI patterns should only be introduced when no existing pattern solves the problem.

## Shared Components Only

Never define reusable UI inline or as local components inside a page file.

Every modal, dialog, form section, card, button group, and other reusable block
must be its own component file:

- Cross-feature generic UI goes in `components/shared/`.
- Feature-specific components go in `features/<feature>/components/`.

For new features that share functionality with an existing feature, create a
shared component instead of duplicating markup or state logic. When a local
component already exists in a page file, extract it into a component file at the
first opportunity.

Management dialogs must use `components/shared/ManagementModal` so dialog
semantics, focus entry, focus trapping, Escape behavior, and focus restoration
remain consistent. Custom overlay shells are reserved for interactions that
are not management dialogs or cannot satisfy the shared primitive's contract.

## Business and platform UI parity

The business and platform dashboards use one implementation for every shared
component and workflow. A change to shared layout, editors, forms, validation,
cards, tables, grid views, dialogs, buttons, loading skeletons, empty states,
analytics controls, uploads, previews, or public rendering applies to both
surfaces and must be checked in both contexts.

Business and platform route components remain thin adapters. Differences such
as endpoints, ownership scope, public paths, branding, analytics sources, or
available actions are supplied through typed configuration and capability
props. Do not copy a shared component or patch only one adapter to change
shared presentation or behavior.

A platform-only control is permitted when the operation is genuinely reserved
for platform administrators or its permission is unavailable to business
users. Gate that control with an explicit permission or capability and keep
the surrounding layout, state handling, feedback, and reusable UI shared.
Permission differences must not cause the two surfaces to drift.

## Inline field validation

A field reports its own problem under itself, in the field's own colour
language, and never only through a toast on submit.

- **Red** is a blocking error: the save will fail. Reserve it for rules the
  server actually enforces. The linktree editor's name and slug floors come
  from `chk_lt_name` / `chk_lt_seo_name` and the DTO's `@MinLength(2)`, not
  from taste — a form that accepts less produces a 400 with nothing pointing at
  the field.
- **Amber** is an advisory warning: the save will succeed, but the reader may
  not want it to. A duplicate page name is the example; it is legal and stays
  out of the submit gate.
- **Grey** is work in progress — "پشکنینی ناو..." while an availability request
  is in flight, so an empty space does not read as "no problem found".

Validators live in `features/link-editor/components/validation.ts`, not inside
the modal, so the rule that has to match a DTO or a CHECK constraint sits in one
testable place. Debounced availability checks need a `cancelled` flag as well as
a cleared timer: clearing the timer only stops a request that has not been sent,
and a slower earlier response would otherwise paint an error for a value the
field no longer holds.

## Modal header controls

A modal's header controls are one visual set: every icon-only button is a 40px
square (`h-10 w-10`) and a labelled one is the same 40px tall, all with `h-4
w-4` icons. Mixing `p-2.5` with `px-3 py-2.5`, or 16px icons with 20px ones,
puts the buttons at different heights on the same row.

Every modal panel carries `role="dialog"`, `aria-modal="true"`,
`aria-labelledby` pointing at its title, `tabIndex={-1}`, and the `dialogRef`
that `useModalKeyboard` needs for focus entry, trapping and restoration.
Dismiss on backdrop fires on `mousedown`, not `click`: a click event fires on
the common ancestor, so a drag that starts inside the panel and ends on the
backdrop would close the dialog. `components/shared/ManagementModal` is the
reference implementation; `BusinessPageAnalyticsModal` and the platform admin's
`BusinessAnalyticsModal` both follow it.

A list inside a modal sorts through a pure exported comparator, not an inline
one. Both analytics modals had the same two defects while the comparator was
inline: no tie-break, so equally scoring rows reshuffled on every refresh, and
in the platform-admin one a pinned-row test that returned `-1` whenever `a` was
pinned without looking at `b` — not a valid comparator, and self-contradicting
for a pair of pinned rows. Extracting it makes both testable.

---

## Modal forms and shared fields

Modal field markup lives in one shared system so every dialog looks identical:

- `features/link-editor/modal-input-styles.ts` exports `modalInputClass`,
  `modalTextareaClass`, and `modalChoiceButtonClass` — the single source for
  input, textarea, and select-style button styling. Use these classes instead
  of inline input styling.
- `components/shared/EditorField` is the label wrapper: an `11px` black-weight
  label, an optional `RequiredMark`, an optional right-aligned hint, and the
  control itself. Prefer it over hand-rolled `label` + `span` markup.
- `components/shared/RequiredMark` renders the required `*` in the tenant
  accent (`var(--theme-primary, #64748b)`). Never hard-code the marker color in
  individual fields; always reuse this component.
- `components/shared/AvatarImageUpload` renders the shared 128px circular
  avatar/logo picker (hover overlay, red remove badge, full-width choose-image
  button) used by the linktree editor and the advertising testimonials modal.
  It exports `DEFAULT_AVATAR_SRC`.
- The tenant-accent action button (publish toggles, create/save/export actions,
  wizard next/submit) is written inline at each call site as a plain `button`.
  Only the accent paint is invariant: `[background:var(--theme-css)]`,
  `text-[var(--theme-ink)]`, `hover:brightness-95`, and `disabled:cursor-wait`.
  Geometry and typography follow the button row the action sits in — copy the
  height/padding/text-size/weight of the neighbouring cancel, back, or secondary
  button rather than a fixed pill, and lift the font one weight step for the
  primary action. A row sized by padding (`px-4 py-2.5 sm:px-5 sm:py-3`) keeps
  padding; a row on a fixed `h-10`/`h-11` keeps that height. Standalone accent
  buttons with no neighbours use `flex h-10 shrink-0 items-center gap-2
rounded-xl border border-transparent px-3.5 text-xs font-black`. In-flight
  actions set `aria-busy` and include the busy flag in `disabled` so the wait
  cursor applies. Segmented controls, toggle switches, and circular icon buttons
  keep their own patterns.
- `features/link-editor/BackgroundColorPicker` is the background-color field
  used by the linktree editor. It renders the preset swatch grid plus an
  optional "custom" toggle that opens `ColorGradientModal`. Pass
  `colors={RAINBOW_BACKGROUND_COLORS}` for the simple base-rainbow preset grid
  and `allowGradient={false}` to restrict the custom modal to solid colors
  (both used by the advertising package-category modal). It exports
  `RAINBOW_BACKGROUND_COLORS` for reuse.

Both the linktree editor (`BasicInfoStep`) and the
advertising testimonials modal (`AdvertisingServicePage.tsx`) consume this same
field system so their titles, sizes, placeholder styles, and required markers
stay in sync.

## Required workflow before building a feature

This sequence is mandatory, not advisory:

1. **Search `components/shared/` first.** If a component covers the behavior,
   use it. Do not re-implement it locally with different markup.
2. **If no shared component exists but the pattern is already inline
   somewhere**, extract that inline implementation into a customizable shared
   component, then consume it from both the original site and the new one.
   Extract on the second copy — do not wait for a third.
3. **Delete what the extraction orphans** in the same change: unused imports,
   now-dead local helpers, `export` keywords with no external importer, and
   alias indirections such as `const THEME = SHARED_THEME`.
4. **Update this document** when a new shared component is introduced or an
   existing rule changes, so the next feature starts from an accurate list.

Duplicated markup in this repository has repeatedly drifted rather than staying
in sync — copied theme maps lost keys, and copied carousel maths only held for
one specific item count. Sharing the implementation is what prevents that; a
convention that both copies "should" match does not.

When two surfaces must look identical, export the single implementation from
the component that owns it and have the other import it, rather than mirroring
its markup. Where behavior genuinely differs (for example a public carousel
auto-advances but its dashboard editor must not), share the theme maps and
layout maths and keep only the differing wrapper separate.

## Destructive actions

Every destructive action must confirm through
`components/shared/ConfirmDeleteModal` before it mutates state. Deleting on the
first click is not acceptable, including for items that only exist in local
editor state.

A surface with several delete affordances should hold one pending-delete slot
in state and render a single `ConfirmDeleteModal`, rather than one modal per
row. See `features/advertising/components/AdvertisingServicePage.tsx`.

## Numeric fields

Use `components/shared/NumberInput` instead of a bare `<input type="number">`
so parsing, clamping, and empty-field handling stay consistent. Pass
`clearOnFocus` for value-entry fields such as prices, so typing replaces the
current number instead of appending digits to it.

---

# Page Structure

Whenever possible, pages should follow a predictable structure:

```text
Page Header

Title

Description

Primary Actions

--------------------

Search / Filters / Tabs

--------------------

Main Content

--------------------

Pagination or Footer
```

Users should not need to relearn navigation between pages.

---

# Dashboards

Business Dashboard and Platform Administration should reuse the same interaction patterns whenever functionality is similar.

Examples include:

- statistics cards
- management tables
- search
- filtering
- pagination
- action menus
- confirmation dialogs
- loading states
- empty states

Consistency is more important than visual variety.

Dashboard and analytics metrics must use the shared `StatCard`. Choose its
variant according to meaning: `standard` for summary KPIs, `funnel` for a
funnel step, `live` for realtime status, `comparison` for paired values, and
`story` for an emphasized narrative metric. Customize the shared component to
preserve a section's intended presentation instead of recreating the card
inline.

A row of stat cards must be laid out with `StatCardGrid`, never a hand-written
`grid` class. It is **two columns on every width below `lg`** — phone and
tablet alike — and widens at `lg` to the `columns` the row was designed for.
Two rather than one on a phone because a stat card is short and wide, so one
per row wastes the screen and pushes the content below it off the fold; two
rather than three on a tablet because three cramps the value text at that
width. Pass margins through `className`; do not reintroduce breakpoint
classes. `StatCardGrid.spec.tsx` fails if a page grids stat cards itself.

The one exception is a `comparison` pair sharing a `divide-*` rule: it is
already two columns at every width, and the rule between the two cards only
reads correctly with no gap.

---

# Forms

Authentication and invite-only onboarding use the shared
`components/shared/AuthenticationShell` and `AuthenticationCard`. The shell
owns theme controls, responsive split layout, text selection, and the
decorative authentication background. Root authentication keeps normal page
scrolling; business login supplies the tenant name, logo, color, and a
tenant-colored scrollbar that appears only when its content overflows.
Signup applications use one complete
form in the same authentication section; do not place this form in a modal or
split it into wizard steps. Google entry uses shared
`GoogleAuthenticationButton`. Signup fields compose `EditorField`, shared input
styles rather than page-local chrome.
Signup uses the card's plain compact variant and does not add another visual
container around the form. Country, city, and social-profile URL fields are
excluded. Logo, favicon, default avatar, brand color, and footer defaults move
to the required first-login setup instead of the signup application. Mark those
setup fields optional and start with the MultiTree color, the neutral person
avatar, and the neutral logo and favicon placeholders. First-login setup asks
for the logo only: pass `lockedAssets` to `BrandAssetStack` there, which closes
the favicon and avatar tiles behind a lock badge because both are supplied
automatically — the favicon from the uploaded logo, the avatar from the platform
default. Opening a tile's lock restores its own picker for the rest of that
session, so a business that wants a distinct favicon or avatar is never blocked.
A favicon the owner uploaded is never overwritten by a later logo upload. Logo
and favicon pickers both accept JPEG and PNG (favicon also `.ico`); the tile
markup itself lives in `BrandAssetTile` so a locked tile does not nest a button
inside a label. MultiTree's own mark
(`/images/Logo.jpg`) is platform chrome — the home page, the dashboard sidebar,
the "powered by" footer, the platform manifest, and platform-console branding —
and must never stand in for a business that has not uploaded its own asset.
Resolve every fallback from `frontend/src/lib/brand/brand-assets.ts` rather than
repeating a path. Show the
verified owner account name and email read-only in both first-login setup and
platform business editing. Render setup as a single locked `ManagementModal`
over the real dashboard: no close control,
no backdrop/Escape dismissal, and mark the dashboard surface inert until the
server records completion. Approved
business login, platform login, and invitation signup all reuse
`AuthenticationMethods`, which composes the shared Google button,
`EmailCodeAuthenticationForm`, and the optional single-line private-device
choice. Selected `SegmentedTabs` use accent background and text without an
accent border; focused dialogs must also keep a neutral outline.
Signup validation errors appear inline through `EditorField`; do not collapse
field-specific failures into only a generic `Validation failed` alert.

Forms should always include:

- labels
- validation
- helper text where useful
- disabled states
- loading states
- success feedback
- error feedback

Platform business management keeps active businesses, pending signup
applications, and invitation creation in one shared management surface. Use
the shared `SegmentedTabs` for the Businesses and Applications views, with each
view implemented as its own feature component. Do not introduce a second
standalone invitation/application card above or below it. Invitation creation
belongs last in the shared header actions, and pending counts belong on the
Applications tab.

Group related fields together.

Avoid unnecessarily long forms.

---

# Tables

Management tables should remain consistent throughout the application.

Support features when appropriate:

- search
- filtering
- sorting
- pagination
- row actions
- bulk actions
- loading states
- empty states

---

# Status Pills

List rows and cards mark record state with pills, never with coloured row
backgrounds or bare text.

Pills for Linktree pages live in `components/business/LinktreeMeta.tsx`
(`LinktreeMetaBadges`) and cover:

- **بنەڕەت** — the business default page. Uses the theme primary colour so it
  matches the default-page card in Business Settings.
- **Age tier** — derived from the creation date by `lib/utils/record-age.ts`:
  `نوێ` under 7 days, `لە گەشەدا` under 30 days, `کۆن` beyond that. The
  thresholds live in `RECORD_AGE_TIER_DAYS`; change them there, not in a
  component. The helper is domain-neutral — the platform admin ages businesses
  with the same tiers.
- **ناچالاک** — shown only when `status` is inactive. An active page is the
  norm and carries no pill.
- **واتساپ** — shown only while `whatsapp_modal_enabled` is true.
- **Template name** — resolved through `getTemplateName` in
  `lib/templates/config.ts`.

Every pill is field-gated. `LinktreesGrid` and `LinktreesTable` are shared with
the mini-website screen, which passes a partial projection, so a pill whose
field is absent renders nothing. Fields that cannot be gated (the age tier
reads `created_at`, which every consumer fills) sit behind the
`showLinktreeMeta` prop, which only the Linktree dashboard sets. That prop also
hides the Slug column, which the mini-website screen reuses to render its own
status label.

The business default page is always sorted first
(`sortLinktreesForDashboard`), and optimistic list updates demote the previous
default so exactly one بنەڕەت pill is visible at any time.

## Platform-admin business pills

The business directory uses the same pill pattern with its own set, in
`features/platform-admin/components/BusinessMetaBadges.tsx`:

- **چالاک / ڕاگیراو** — the business `status`. Both states are shown here,
  unlike the Linktree list: a suspended tenant is what an admin scans for, and
  the contrast only reads if the active state is labelled too.
- **Plan** — `getBusinessPlanLabel` / `getBusinessPlanBadgeClasses`.
- **Page allowance** — `max_linktrees`, with `∞` for the `-1` unlimited
  sentinel.
- **Age tier** — the shared `record-age` tiers, so a business registered this
  week is visible without reading a date.
- **بێ سەب دۆمەین** — a business with no subdomain cannot be reached at its own
  address, so it is flagged rather than left to an empty cell.

The grid card, table row and mobile card all render this one component; the
status and plan markup used to be written out three times.

---

# Feedback

Every user action should provide feedback.

Examples:

- success notifications
- validation errors
- confirmation dialogs
- loading indicators

Avoid silent operations.

---

# Loading States

Never leave users wondering if work is still happening.

All animated loading feedback uses the shared Motion primitives. Use
`MotionSpinner` for compact operations, `MotionPulse` through the shared
skeleton compositions for predictable content, and `MotionPing` for a live
status marker. Do not introduce CSS keyframes, Tailwind `animate-*` utilities,
or component-local spinner and pulse implementations. The application-level
motion provider supplies consistent timing and reduced-motion behavior.

Use consistent:

- skeletons
- spinners
- progress indicators

Avoid layout shifts while loading.

Use a skeleton when content with a predictable final shape is waiting for data
or for a lazy frontend bundle. The placeholder must mirror the real card,
table, form, modal, or management-page footprint and use the shared
`components/shared/Skeleton.tsx` compositions. Do not replace already visible
content with a skeleton during a background refresh.

Use a compact spinner or progress treatment only for an explicit operation
whose result is not replacement content, including save, upload, destructive
confirmation, refresh, link resolution, and location lookup. Keep the affected
content visible, disable duplicate submission, and label the busy control.
Global dashboard refresh controls must update shared and active-page data in
place, deduplicate overlapping requests, expose an accessible busy state, and
provide success or failure feedback. They must preserve navigation and local UI
state and must never overwrite unsaved form or editor input.

Data-heavy dashboard routes must reserve the complete visible page structure,
not only their metric cards. Use `SkeletonDashboardPage` with the matching
analytics, table, or form body for lazy-route and initial-request loading.
Nested lists such as sessions, messages, and notification inboxes use
`SkeletonList` locally without replacing already loaded surrounding settings.
Template catalogs use `SkeletonTemplatePage`; deferred phone and monitor
previews use the base shared `Skeleton` rather than standalone pulse markup.
An intentionally empty preview is a stable product state and must not animate
like loading or announce itself as pending.

## Dashboard notification bell

Business and platform headers use the same `NotificationBell` presentation and
`useNotificationInbox` behavior. Bell geometry, unread badge, dropdown header,
item density, unread treatment, action icons, skeleton, empty state, keyboard
behavior, and detail modal must change together on both surfaces. Clicking an
inbox item marks it read and opens the shared detail modal; navigation or reply
actions are offered from that modal rather than replacing the detail view.

Endpoint paths, action-route normalization, theme color, and platform pending
approvals are adapter configuration. Pending approvals remain platform-only
because approval review requires platform permissions, but they are rendered
as an extension of the shared dropdown instead of forking it. Notification
action URLs accept root-relative paths or HTTPS only; protocol-relative and
unsafe schemes must never be opened.

Stat-card loading must use `SkeletonStatCard` or `SkeletonStatCards` with the
same variant and layout as the resulting cards. The base `Skeleton` primitive
and the shared table, grid-card, form, modal, and management-page compositions
should be extended when their corresponding real component changes. Introduce
new compositions only alongside a real loading state rather than guessing
future layouts.

---

# Empty States

Every empty state should explain:

- why there is no content
- what the user can do next

Include a call to action whenever appropriate.

---

# Inline Request Errors

Recoverable 400, 409, 413, 415, and 422 responses stay within the component
where the action occurred. Use the shared `InlineRequestError` alert rather
than a toast, browser alert, or full-page error. Preserve the user's entered
data, place the alert next to the affected controls, use `role="alert"`, and do
not display raw server, parser, storage, or database messages.

---

# Responsive Design

Every interface must function correctly on:

- mobile
- tablet
- laptop
- desktop

Layouts should adapt gracefully without losing functionality.

---

# Accessibility

All interfaces should support:

- keyboard navigation
- visible focus states
- semantic HTML
- sufficient color contrast
- accessible labels

Accessibility should be considered during implementation, not added afterwards.

---

# Visual Templates

Current supported visual options:

### Linktrees

The Linktree editor is a shared domain feature. Business and platform-admin
screens must use the same wizard, validation, templates, link mapping, upload
states, and availability checks, while providing their own API endpoint set.
The platform-admin list also reuses `LinktreesGrid` and `LinktreesTable`; its
public path prefix is `/linktree` on the root domain. Its `ئامار` action opens
the shared business page analytics modal in summary-only mode, loading current
lifetime totals through the platform-scoped API; advanced analytics and action
details remain hidden, while the standard loading skeleton, refresh, and
clear-analytics confirmation stay consistent with business pages.
The list-level clear-all action uses the same shared rose analytics button and
confirmation modal as the business Linktree list; it is disabled when no
platform Linktree analytics exist.

### Platform mini websites

The platform mini-website page renders the same `MiniWebsitesPage` manager as
the business dashboard. Platform customization is limited to workspace
branding, guarded API endpoints, root `/bio` links, internal template policy,
and platform analytics ownership. Do not fork editor steps, cards, grid/table
views, skeletons, dialogs, uploads, or the public renderer.

Mini-website lists use the complete shared Linktree grid/table presentation:
card density, image treatment, metadata rows, traffic blocks, actions,
responsive mobile cards, table columns, and pagination stay visually aligned.
`MiniWebsiteListMeta` supplies mini-website status and template badges, and the
mini-website traffic labels describe the second metric as total actions rather
than Linktree clickers. Domain wording must be configured without forking the
shared list layout.

- 12 selectable templates
- Registered through the template registry
- Availability depends on the business subscription

### Mini Websites

Persisted visual templates:

- Liquid Glass
- Editorial
- Business Pro
- Sidebar Canvas

Liquid Glass surface variations:

- Soft
- Glass
- Minimal
- Warm

Background styles are independent from the visual template and the Liquid
Glass surface variation. Profession templates select recommended content sections;
they are not visual templates. Every visual template must consume the shared
section registry and render in the scrollable mobile catalog preview.

Subscription plans determine which templates are available.

---

# UI Review Checklist

Before completing any UI work, verify:

- Existing components were reused where possible.
- Shared UI was not duplicated.
- Page structure matches similar pages.
- Business and Platform Administration remain visually consistent.
- Loading, empty, and error states exist where needed.
- The interface is responsive.
- Accessibility has been considered.
- No unnecessary UI patterns were introduced.

Every new screen should look like it naturally belongs within the existing MultiTree product.
