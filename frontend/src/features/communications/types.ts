export type CommunicationPriority = "normal" | "important" | "critical";

export interface CommunicationNotification {
  id: string;
  kind: string;
  priority: CommunicationPriority;
  title: string;
  body: string;
  sourceType?: string | null;
  sourceId?: string | null;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationInbox {
  items: CommunicationNotification[];
  unreadCount: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  announcementType: string;
  priority: CommunicationPriority;
  audienceType: "all" | "plans" | "businesses";
  audienceFilter: { values?: string[] };
  channels: Array<"business_bell" | "dashboard_banner" | "homepage">;
  status: "draft" | "scheduled" | "published" | "expired" | "archived";
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  publishAt?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName?: string | null;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  homepagePlacement?: "top_banner" | "feature_card" | null;
  homepagePriority?: number | null;
  homepageDismissible?: boolean | null;
}

export interface CommunicationMessage {
  id: string;
  senderType: "platform-admin" | "business";
  senderName: string;
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  businessName: string;
  planName?: string;
  subject: string;
  category: string;
  priority: "normal" | "important" | "urgent";
  status: "open" | "waiting_business" | "waiting_platform" | "resolved" | "archived";
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  createdByType?: "platform-admin" | "business";
  lastMessageAt: string;
  createdAt: string;
  lastMessage?: string;
  unreadCount?: number;
  messages?: CommunicationMessage[];
}

export interface HomepageCommunication {
  id: string;
  title: string;
  message: string;
  announcementType: string;
  priority: CommunicationPriority;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  publishedAt: string;
  expiresAt?: string | null;
  placement: "top_banner" | "feature_card";
  displayPriority: number;
  isDismissible: boolean;
}
