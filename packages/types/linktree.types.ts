import type { PublicPageAnalytics } from "./analytics.types";
import {
  MINI_WEBSITE_BACKGROUND_STYLES,
  type MiniWebsiteBackgroundStyle,
} from "./mini-website.types";

/**
 * The background pattern catalogue, shared by the linktree page and the mini
 * website.
 *
 * One set, aliased rather than copied: the pattern renderer and the picker
 * modal are the same components on both surfaces, so a value either page can
 * store has to be a value the other can draw.
 */
export const BACKGROUND_PATTERN_STYLES = MINI_WEBSITE_BACKGROUND_STYLES;

export type BackgroundPatternStyle = MiniWebsiteBackgroundStyle;

/**
 * Where a linktree keeps its pattern choice.
 *
 * `template_config`, not a column: the pattern is presentation that only the
 * template renderer reads, exactly like `background_image`.
 */
export const BACKGROUND_PATTERN_CONFIG_KEY = "background_pattern";

export const BACKGROUND_PATTERN_DEFAULT: BackgroundPatternStyle = "none";

export type LinktreeStatus = "active" | "inactive";

/**
 * What a brand-new Linktree page starts out holding.
 *
 * Two call sites create a page: the link editor modal in the dashboard, and
 * `POST /linktrees/default`, which seeds the business's default page on the
 * server without opening the editor. They used to disagree — the server path
 * left the tagline, the helper text and the WhatsApp prompts empty — so a
 * default page looked half-filled next to a hand-made one. Both read these
 * values now.
 *
 * The backend mirrors them in `common/linktree-defaults.ts` because
 * `@linktree/types` is source-only and Node cannot resolve it at runtime; a
 * spec asserts the copy matches.
 */
export const LINKTREE_DEFAULT_SUBTITLE = "";

/** Helper line under the tagline, telling visitors what the buttons are. */
export const LINKTREE_DEFAULT_DESCRIPTION =
  "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە";

export const LINKTREE_DEFAULT_FOOTER_TEXT = "MultiTree";

export const LINKTREE_DEFAULT_FOOTER_PHONE = "7502485829";

export const LINKTREE_DEFAULT_WHATSAPP_MODAL_TITLE = "پەیوەندی کردن";

export const LINKTREE_DEFAULT_WHATSAPP_MODAL_SUBTITLE = "پرسیارێک هەڵبژێرە";

/** Starter prompts for the WhatsApp modal, in display order. */
export const LINKTREE_DEFAULT_WHATSAPP_QUESTIONS = [
  { id: "order", text: "داواکردن", message: "سڵاو بەڕێز دەمەوێت داوا بکەم." },
  { id: "price", text: "زانینی نرخ", message: "سڵاو بەڕێز، نرخی چەندە ؟" },
  { id: "other", text: "پرسیارێکی تر", message: "سڵاو" },
] as const satisfies readonly {
  id: string;
  text: string;
  message: string;
}[];

export type LinktreeTemplateConfig = Record<string, unknown>;

export interface LinkMetadata extends Record<string, unknown> {
  original_input: string | null;
  country_code: string | null;
  gps_lat: number | string | null;
  gps_lng: number | string | null;
  custom_color: string | null;
  custom_icon: string | null;
}

/** A link returned by the authenticated and public Linktree read endpoints. */
export interface LinktreeLink extends LinkMetadata {
  id: string;
  platform: string;
  url: string;
  display_name: string | null;
  description: string | null;
  default_message: string | null;
  display_order: number;
  metadata: LinkMetadata;
}

/** Common list-card projection shared by Linktree and mini-website screens. */
export interface LinktreeListItem {
  id: string;
  uid: string;
  name: string;
  created_at: string;
  updated_at: string;
  subtitle?: string | null;
  description?: string | null;
  seo_name?: string | null;
  public_identifier?: string;
  image?: string | null;
  template_key?: string | null;
  template_config?: LinktreeTemplateConfig | null;
  whatsapp_modal_enabled?: boolean | null;
  status?: LinktreeStatus;
  is_default?: boolean;
  business_logo?: string | null;
  business_default_avatar?: string | null;
  analytics?: {
    unique_views: number;
    unique_clicks: number;
  };
}

/** A Linktree returned by GET /linktrees for the business dashboard. */
export interface BusinessLinktreeSummary extends LinktreeListItem {
  subtitle: string | null;
  description: string | null;
  seo_name: string;
  image: string | null;
  background_color: string;
  template_key: string | null;
  template_config: LinktreeTemplateConfig;
  whatsapp_modal_enabled: boolean | null;
  footer_text: string | null;
  footer_phone: string | null;
  footer_hidden: boolean | null;
  status: LinktreeStatus;
  is_default: boolean;
  business_default_avatar: string | null;
}

/** The public Linktree projection. It deliberately excludes business secrets. */
export interface PublicLinktree {
  id: string;
  uid: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  seo_name: string;
  image: string | null;
  background_color: string;
  template_key: string | null;
  template_config: LinktreeTemplateConfig;
  whatsapp_modal_enabled: boolean | null;
  footer_text: string | null;
  footer_phone: string | null;
  footer_hidden: boolean | null;
  status: LinktreeStatus;
  is_default: boolean;
  business_logo: string | null;
  business_favicon: string | null;
  business_website_color: string | null;
  business_default_avatar: string | null;
}

export interface PublicLinktreePayload {
  linktree: PublicLinktree;
  links: LinktreeLink[];
  /**
   * Page-level, not content: the pixel ids and the registered actions this
   * page may report. Kept beside the linktree rather than inside it so the
   * record that templates and editor previews render stays free of tracking.
   */
  analytics: PublicPageAnalytics;
}

/** Input accepted by reusable template previews as well as public responses. */
export interface LinktreePresentation {
  id: string;
  uid: string;
  name: string;
  seo_name?: string | null;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  background_color?: string | null;
  footer_text?: string | null;
  footer_phone?: string | null;
  footer_hidden?: boolean | null;
  template_config?: LinktreeTemplateConfig | null;
  business_logo?: string | null;
  business_favicon?: string | null;
  business_website_color?: string | null;
  business_default_avatar?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Link input accepted by templates, including inactive editor previews. */
export interface LinktreePresentationLink {
  id: string;
  linktree_id?: string;
  platform: string;
  url: string;
  display_name?: string | null;
  description?: string | null;
  default_message?: string | null;
  display_order?: number;
  is_active?: boolean;
  click_count?: number;
  click_count_raw?: number;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}
