import { SkeletonDashboardShell } from "@/components/shared/Skeleton";
import { SkeletonPageManagement } from "@/components/shared/SkeletonPageLayouts";

export default function BusinessDashboardLoading() {
  return (
    <SkeletonDashboardShell navigationItems={5}>
      <SkeletonPageManagement showTabs />
    </SkeletonDashboardShell>
  );
}
