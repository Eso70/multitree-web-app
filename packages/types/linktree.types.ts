import type { PublicPageAnalytics } from "./analytics.types";

export type LinktreeStatus = "active" | "inactive";

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
  template_config?: LinktreeTemplateConfig | null;
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
