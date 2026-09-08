"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FileText, UserRoundCog } from "lucide-react";

import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { SkeletonClientAccessPage } from "@/components/shared/SkeletonPageLayouts";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import {
  LinktreesManagementPage,
  type LinktreesManagementPageProps,
} from "@/features/link-editor/components/LinktreesManagementPage";

const BusinessClientAccessPage = dynamic(
  () =>
    import("@/features/client-linktree-access/components/BusinessClientAccessPage"),
  { ssr: false, loading: () => <SkeletonClientAccessPage /> },
);

export type BusinessLinktreesPageProps = LinktreesManagementPageProps;

export function BusinessLinktreesPage(props: BusinessLinktreesPageProps) {
  const [managementView, setManagementView] = useState<
    "linktrees" | "client-invitations"
  >("linktrees");
  useRegisterBusinessDashboardRefresh("linktrees", () => props.onRefresh(true));

  return (
    <LinktreesManagementPage
      {...props}
      managementNavigation={
        <SegmentedTabs
          className="mb-6"
          value={managementView}
          onChange={setManagementView}
          tabs={[
            { id: "linktrees", label: "پەڕەکانی لینکتری", icon: FileText },
            {
              id: "client-invitations",
              label: "بانگهێشتنامەکانی کڕیار",
              icon: UserRoundCog,
            },
          ]}
        />
      }
      alternativeContent={
        managementView === "client-invitations" ? (
          <BusinessClientAccessPage />
        ) : undefined
      }
    />
  );
}
