import { TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

interface AnalyticsSummaryCardsProps {
  views: number;
  clicks: number;
  viewsLabel: string;
  clicksLabel: string;
}

export function AnalyticsSummaryCards({
  views,
  clicks,
  viewsLabel,
  clicksLabel,
}: AnalyticsSummaryCardsProps) {
  return (
    <StatCardGrid columns={2}>
      <StatCard icon={Users} label={viewsLabel} value={views} color="green" />
      <StatCard icon={TrendingUp} label={clicksLabel} value={clicks} color="orange" />
    </StatCardGrid>
  );
}
