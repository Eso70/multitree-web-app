import { SkeletonDashboardShell } from "@/components/shared/Skeleton";
import { SkeletonPageManagement } from "@/components/shared/SkeletonPageLayouts";

export default function CreatorDashboardLoading() {
  return (
    <SkeletonDashboardShell navigationItems={4}>
      <SkeletonPageManagement />
    </SkeletonDashboardShell>
  );
}
