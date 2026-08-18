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
export const DEFAULT_LINKTREE_TEMPLATE_KEY = 'spectrum';

/** A white canvas, matching the link editor's `pure-white` swatch. */
export const DEFAULT_LINKTREE_BACKGROUND_COLOR = '#ffffff';

/**
 * `true` means the "شاردنەوەی فوتر" (hide footer) switch starts ON, so a new
 * page carries no footer until the business turns it back on.
 */
export const DEFAULT_LINKTREE_FOOTER_HIDDEN = true;

/** The WhatsApp modal is opt-in: a new page links out rather than prompting. */
export const DEFAULT_LINKTREE_WHATSAPP_ENABLED = false;

/**
 * Page content a brand-new linktree starts with.
 *
 * Mirrored from `LINKTREE_DEFAULT_*` in `@linktree/types`, which the link
 * editor modal reads, so `POST /linktrees/default` seeds a page that matches
 * one built by hand. The shared package is source-only and Node cannot resolve
 * it at runtime, hence the copy; `linktree-page-defaults.spec.ts` asserts the
 * two stay identical.
 */
export const DEFAULT_LINKTREE_SUBTITLE = '';

export const DEFAULT_LINKTREE_DESCRIPTION =
  'بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە';

export const DEFAULT_LINKTREE_FOOTER_TEXT = 'MultiTree';

export const DEFAULT_LINKTREE_FOOTER_PHONE = '7502485829';

export const DEFAULT_LINKTREE_WHATSAPP_MODAL_TITLE = 'پەیوەندی کردن';

export const DEFAULT_LINKTREE_WHATSAPP_MODAL_SUBTITLE = 'پرسیارێک هەڵبژێرە';

export const DEFAULT_LINKTREE_WHATSAPP_QUESTIONS: ReadonlyArray<{
  id: string;
  text: string;
  message: string;
}> = [
  { id: 'order', text: 'داواکردن', message: 'سڵاو بەڕێز دەمەوێت داوا بکەم.' },
  { id: 'price', text: 'زانینی نرخ', message: 'سڵاو بەڕێز، نرخی چەندە ؟' },
  { id: 'other', text: 'پرسیارێکی تر', message: 'سڵاو' },
];
