import { SkeletonDashboardShell } from "@/components/shared/Skeleton";
import { SkeletonBusinessDirectoryPage } from "@/components/shared/SkeletonPageLayouts";

export default function PlatformDashboardLoading() {
  return (
    <SkeletonDashboardShell navigationItems={12}>
      <SkeletonBusinessDirectoryPage />
    </SkeletonDashboardShell>
  );
}
