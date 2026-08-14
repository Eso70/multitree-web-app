/**
 * Single source of truth for branding asset fallbacks.
 *
 * The distinction this module exists to enforce: `/images/Logo.jpg` is
 * MultiTree's own mark. It belongs to platform chrome — the home page, the
 * dashboard sidebar, the "powered by" footer, the platform manifest — and must
 * never stand in for a business that has not uploaded its own logo or favicon.
 * Painting the platform's logo onto a tenant surface misrepresents that
 * business, so tenant surfaces fall back to the neutral placeholders below.
 *
 * `DEFAULT_AVATAR` is a special case: it is also the value stored in
 * `business_branding.default_avatar` when no avatar was chosen, so backend SQL
 * compares against this exact string to mean "still the default". Changing it
 * requires a data migration, not just an edit here — see
 * `backend/src/common/brand-assets.ts`.
 */

/**
 * MultiTree's own logo, on its background. Platform chrome only.
 * Mirrors `PLATFORM_ADMIN_LOGO_WITH_BACKGROUND`.
 */
export const MULTITREE_LOGO = "/images/Logo.jpg";

/**
 * The bare MultiTree mark, for surfaces that supply their own background.
 * Mirrors `PLATFORM_ADMIN_LOGO_WITHOUT_BACKGROUND`.
 *
 * Kept separate from `DEFAULT_AVATAR` on purpose: the two were the same file
 * until the default avatar became the neutral person placeholder, at which
 * point MultiTree's logo silently became a person icon. Platform branding and
 * the business fallback must never share a path again.
 */
export const MULTITREE_LOGO_MARK = "/images/multitree-logo-mark.png";

/** Neutral person mark used wherever a profile image is unset. */
export const DEFAULT_AVATAR = "/images/DefaultAvatar.png";

/** Neutral mark for a business that has not uploaded a logo. */
export const BUSINESS_LOGO_PLACEHOLDER =
  "/images/business-logo-placeholder.png";

/** Neutral mark for a business that has not uploaded a favicon. */
export const BUSINESS_FAVICON_PLACEHOLDER =
  "/images/business-favicon-placeholder.png";

/**
 * Upload types offered per branding slot. These mirror what
 * `backend/src/storage/image-upload.ts` accepts — widening a picker here
 * without widening that validator only moves the rejection later.
 *
 * The favicon accepts the raster formats too, because setup derives it from
 * the uploaded logo rather than asking for a separate `.ico`.
 */
export const LOGO_ACCEPT = ".jpg,.jpeg,.png,image/jpeg,image/png";
export const FAVICON_ACCEPT =
  ".ico,.png,.jpg,.jpeg,image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg";
export const AVATAR_ACCEPT = ".png,image/png";

/** MIME allow-lists matching the pickers above, for client-side validation. */
export const LOGO_MIME_TYPES = ["image/jpeg", "image/png"];
export const FAVICON_MIME_TYPES = [
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/jpeg",
];
export const AVATAR_MIME_TYPES = ["image/png"];
