/**
 * The TikTok event a registered action reports.
 *
 * A closed set rather than a free string: the browser and the Events API have
 * to send the *same* name for the same `event_id` or TikTok counts the pair
 * twice instead of collapsing it, and the only way to guarantee that is for
 * both sides to read one value that neither of them invents.
 */
export type PublicPageTikTokEvent =
  | "ViewContent"
  | "ClickButton"
  | "Contact"
  | "Lead"
  | "InitiateCheckout"
  | "CompletePayment"
  | "Download"
  | "SubmitForm"
  | "CompleteRegistration";

/** One registered, trackable thing on a public page. */
export interface PublicPageAction {
  /** `public_page_actions.id` — what the ingest endpoint resolves against. */
  id: string;
  /** The TikTok event this action reports, owned by the server. */
  pixelEvent: PublicPageTikTokEvent;
}

/**
 * Everything a public page needs to report itself, resolved server-side.
 *
 * Served by exactly two surfaces — the public linktree page and the public
 * mini-website page — because those are the only places a business's pixel is
 * allowed to load. See docs/tracking.md; adding a third caller is a product
 * decision, not a wiring detail.
 *
 * `actions` is keyed by `public_page_actions.action_key`, so a page renders a
 * button and looks its identity up by the same key the database registered.
 * Absent from the map means "not registered", which the tracker treats as
 * "report internally, do not fire the pixel" rather than inventing an id.
 */
export interface PublicPageAnalytics {
  /** Empty when the business has no pixel or has lost the `feature.tiktok` plan entitlement. */
  pixelIds: string[];
  actions: Record<string, PublicPageAction>;
}

export interface BusinessLinktreeAnalyticsSummary {
  id: string;
  uid: string;
  name: string;
  subtitle?: string;
  seo_name?: string;
  image?: string;
  background_color?: string;
  status: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  unique_views: number;
  unique_clicks: number;
  total_clicks: number;
}

export interface BusinessDashboardAnalyticsSummary {
  total_views: number;
  unique_views: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_value: number;
}

export interface BusinessDashboardPageAsset {
  id: string;
  sourceId: string;
  type: "linktree" | "mini_website";
  name: string;
  slug: string;
  status: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
  uniqueClickers: number;
  conversions: number;
  updatedAt: string;
}

export type BusinessCrmLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "won"
  | "lost";

export interface BusinessDashboardCrmSummary {
  statuses: Record<BusinessCrmLeadStatus, number>;
  total: number;
  totalValue: number;
}

export interface BusinessDashboardTikTokHealth {
  connections: number;
  browserEvents: number;
  serverEvents: number;
  delivered: number;
  retrying: number;
  failed: number;
  deliveryRate: number;
  lastDeliveredAt: string | null;
  reconciliation: {
    internalConversions: number;
    serverAcceptedConversions: number;
  };
}
