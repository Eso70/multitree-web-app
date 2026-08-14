export type BusinessStatus = "active" | "suspended";

export interface BusinessTikTokConfig {
  pixel_id: string | null;
  events_token: string | null;
}

export interface BusinessDefaultLink {
  platform: string;
  url: string;
  display_name: string | null;
  display_order: number;
  metadata: Record<string, unknown> | null;
}

/** A business returned by the platform-admin list endpoint. */
export interface PlatformBusinessSummary {
  id: string;
  username: string;
  name: string;
  subdomain: string;
  status: BusinessStatus;
  /** Dynamic subscription-plan code; plans are data, not a fixed TypeScript union. */
  plan: string;
  planName: string | null;
  subscriptionPlanId: string | null;
  max_linktrees: number;
  logo: string | null;
  favicon: string | null;
  default_avatar: string | null;
  website_color: string | null;
  created_at: string;
  updated_at: string;
}

/** The additional fields returned by the platform-admin detail endpoint. */
export interface PlatformBusinessDetail extends PlatformBusinessSummary {
  phone: string | null;
  email: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  pixel_id: string | null;
  events_token: string | null;
  tiktok_configs: BusinessTikTokConfig[];
  default_footer_text: string | null;
  default_footer_phone: string | null;
  default_template: string | null;
  default_background_color: string | null;
  default_footer_hidden: boolean;
  default_whatsapp_enabled: boolean;
  default_links: BusinessDefaultLink[];
}

/**
 * Platform-admin UI representation. List responses contain the summary fields;
 * detail fields are present after the authorized detail request.
 */
export type PlatformBusiness = PlatformBusinessSummary &
  Partial<
    Pick<
      PlatformBusinessDetail,
      | "phone"
      | "email"
      | "ownerName"
      | "ownerEmail"
      | "pixel_id"
      | "events_token"
      | "tiktok_configs"
      | "default_footer_text"
      | "default_footer_phone"
      | "default_template"
      | "default_background_color"
      | "default_footer_hidden"
      | "default_whatsapp_enabled"
      | "default_links"
    >
  >;
