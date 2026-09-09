import {
  CirclePlay,
  DollarSign,
  Eye,
  Megaphone,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";

import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { INITIAL_MOCK_CAMPAIGNS } from "@/features/campaigns/mock-data";
import type { TikTokCampaign } from "@/features/campaigns/types";

export function summarizeCampaigns(campaigns: TikTokCampaign[]) {
  return campaigns.reduce(
    (summary, campaign) => ({
      campaigns: summary.campaigns + 1,
      activeCampaigns:
        summary.activeCampaigns + (campaign.status === "active" ? 1 : 0),
      impressions: summary.impressions + campaign.impressions,
      clicks: summary.clicks + campaign.clicks,
      totalSpent: summary.totalSpent + campaign.totalSpent,
      conversions: summary.conversions + campaign.conversions,
    }),
    {
      campaigns: 0,
      activeCampaigns: 0,
      impressions: 0,
      clicks: 0,
      totalSpent: 0,
      conversions: 0,
    },
  );
}

export function PlatformCampaignsPage() {
  const summary = summarizeCampaigns(INITIAL_MOCK_CAMPAIGNS);

  return (
    <div dir="ltr">
      <StatCardGrid columns={3} className="mb-8">
        <StatCard
          icon={Megaphone}
          label="کۆی کەمپەینەکان"
          value={summary.campaigns}
          color="blue"
        />
        <StatCard
          icon={CirclePlay}
          label="کەمپەینی چالاک"
          value={summary.activeCampaigns}
          color="cyan"
        />
        <StatCard
          icon={Eye}
          label="کۆی پیشاندانەکان"
          value={summary.impressions}
          color="purple"
        />
        <StatCard
          icon={MousePointerClick}
          label="کۆی کلیکەکان"
          value={summary.clicks}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="کۆی خەرجی"
          value={`$${summary.totalSpent.toFixed(2)}`}
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="کۆی گۆڕانەکان"
          value={summary.conversions}
          color="pink"
        />
      </StatCardGrid>
    </div>
  );
}
