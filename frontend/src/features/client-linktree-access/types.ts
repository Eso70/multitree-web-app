export type ClientInvitationStatus = "active" | "submitted" | "expired";

export interface ClientInvitationSummary {
  id: string;
  clientLabel: string;
  status: ClientInvitationStatus;
  createdAt: string;
  submittedAt: string | null;
  expiredAt: string | null;
  hasActiveSession: boolean;
  linktree: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface CreatedClientInvitation {
  id: string;
  clientLabel: string;
  token: string;
  pin: string;
  createdAt: string;
}

export interface ClientAccessContext {
  clientLabel: string;
  expiresAt: string;
  templateKeys: string[];
  linktree: {
    id: string;
    name: string;
    slug: string;
    uid: string;
    status: string;
    subtitle: string | null;
    description: string | null;
    image: string | null;
    templateKey: string | null;
    whatsappModalEnabled: boolean | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface ClientLinktreeAnalytics {
  unique_views: number;
  unique_clicks: number;
  total_views: number;
  total_clicks: number;
  clicks_by_platform: Record<string, number>;
  top_clicked_links: Array<{
    link_id: string;
    platform: string;
    display_name: string;
    click_count: number;
    click_count_raw: number;
  }>;
}
