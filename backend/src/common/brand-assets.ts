/**
 * Branding asset fallbacks shared by every service that writes or reads a
 * business branding row.
 *
 * `/images/Logo.jpg` is MultiTree's own mark and is deliberately absent here:
 * a business that has not uploaded a logo or favicon must never be given the
 * platform's branding, so the neutral placeholders below are written instead.
 * The frontend mirror of these paths lives in
 * `frontend/src/lib/brand/brand-assets.ts`.
 *
 * `DEFAULT_AVATAR` doubles as a sentinel: SQL in the mini-website and linktree
 * services compares stored values against this exact string to decide whether a
 * row still holds the platform default. Any change to these literals needs a
 * dated forward migration that rewrites existing rows, not just an edit here.
 */

/** Neutral person mark used wherever a profile image is unset. */
export const DEFAULT_AVATAR = '/images/DefaultAvatar.png';

/** Neutral mark for a business that has not uploaded a logo. */
export const BUSINESS_LOGO_PLACEHOLDER =
  '/images/business-logo-placeholder.png';

/** Neutral mark for a business that has not uploaded a favicon. */
export const BUSINESS_FAVICON_PLACEHOLDER =
  '/images/business-favicon-placeholder.png';
