/**
 * What a new business's linktree pages start out looking like.
 *
 * These are the *page* defaults in `business_defaults` — the template, canvas
 * colour and footer/WhatsApp switches every linktree that business creates
 * inherits. They are deliberately separate from the business's own tenant
 * colour (`business_branding.website_color`), which themes the dashboard and
 * the public shell and is chosen per business.
 *
 * Kept in one place because four call sites write this row — business
 * creation, the platform-admin edit, the business's own settings save, and the
 * approval flow — and each used to carry its own literal fallback. One of them
 * disagreeing is how a business ends up with a page nobody chose.
 */

/** Included in every plan, so a new business can always render it. */
export const DEFAULT_LINKTREE_TEMPLATE_KEY = 'colorful-pills';

/** A white canvas, matching the link editor's `pure-white` swatch. */
export const DEFAULT_LINKTREE_BACKGROUND_COLOR = '#ffffff';

/**
 * `true` means the "شاردنەوەی فوتر" (hide footer) switch starts ON, so a new
 * page carries no footer until the business turns it back on.
 */
export const DEFAULT_LINKTREE_FOOTER_HIDDEN = true;

/** The WhatsApp modal is opt-in: a new page links out rather than prompting. */
export const DEFAULT_LINKTREE_WHATSAPP_ENABLED = false;
