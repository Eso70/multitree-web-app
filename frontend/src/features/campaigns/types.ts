export type CampaignStatus = "active" | "paused" | "review" | "completed";

export type CampaignObjective =
  | "TRAFFIC"
  | "CONVERSIONS"
  | "LEAD_GENERATION"
  | "COMMUNITY_INTERACTION";

export interface TikTokAdAccount {
  id: string;
  advertiserId: string;
  advertiserName: string;
  currency: string;
  timezone: string;
  balance?: number;
  dailySpendCap?: number;
  status: "connected" | "disconnected" | "action_required";
  connectedPixelId?: string;
  connectedPixelName?: string;
  lastSyncedAt: string;
  accountType?: "SANDBOX" | "AUCTION";
}

export interface TikTokCampaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  dailyBudget: number;
  totalSpent: number;
  impressions: number;
  clicks: number;
  ctr: number; // percentage (e.g. 3.42)
  cpc: number; // cost per click ($)
  conversions: number;
  destinationPage: {
    id: string;
    title: string;
    slug: string;
    type: "linktree" | "mini_website";
  };
  targetAudience: {
    location: string;
    gender: "ALL" | "MALE" | "FEMALE";
    ageGroups: string[];
    languages: string[];
  };
  callToAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  name: string;
  objective: CampaignObjective;
  dailyBudget: number;
  destinationPageId: string;
  targetLocation: string;
  gender: "ALL" | "MALE" | "FEMALE";
  callToAction: string;
}
