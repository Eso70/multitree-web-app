# Sponsor.krd production domain architecture

## Canonical hosts

Sponsor.krd uses one production root domain:

- `https://sponsor.krd` serves the public platform website, signup flow, and
  platform-owned public pages.
- `https://www.sponsor.krd` redirects to `https://sponsor.krd`.
- `https://<business>.sponsor.krd` serves each business dashboard and public
  business pages.
- The private platform-administrator console remains on its configured path at
  `https://sponsor.krd`.

The Google OAuth callback is
`https://sponsor.krd/api/auth/google/callback`.

## Required production configuration

```dotenv
PLATFORM_BASE_URL=https://sponsor.krd
NEXT_PUBLIC_PLATFORM_URL=https://sponsor.krd
NEXT_PUBLIC_APP_URL=https://sponsor.krd
NEXT_PUBLIC_ROOT_DOMAIN=sponsor.krd
GOOGLE_OAUTH_REDIRECT_URI=https://sponsor.krd/api/auth/google/callback
CORS_ORIGIN=https://sponsor.krd,https://www.sponsor.krd,https://*.sponsor.krd
CORS_ALLOWED_ORIGINS=https://sponsor.krd
```

Environment-specific values remain the source of truth. Production must use
HTTPS, host-only platform session cookies, and appropriately scoped business
session cookies. A platform session must never grant access to a tenant host,
and a tenant session must never grant platform-administrator access.

## DNS and TLS

DNS must route the apex, `www`, and wildcard tenant hosts to the production
frontend. The TLS certificate must cover `sponsor.krd` and
`*.sponsor.krd`. The reverse proxy must preserve the original host so tenant
resolution and authorization remain correct.

## Verification

Before release, verify the apex website, signup, authentication callback,
private console, at least one tenant dashboard, and both public page types.
Also verify that cookies and redirects never cross authorization boundaries.
