"use client";

import { useState } from "react";
import {
  CalendarDays,
  LockKeyhole,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { AccountIdentityFields } from "@/components/shared/AccountIdentityFields";
import { LockedContent } from "@/components/shared/LockedContent";
import { PageHeaderSection } from "@/components/shared/PageHeaderSection";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { SessionManagementPanel } from "@/components/shared/SessionManagementPanel";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { BusinessTikTokPixelConfigPage } from "@/features/analytics/components/BusinessTikTokPixelConfigPage";
import { DASHBOARD_PAGE_LABELS } from "@/components/shared/dashboard-page-labels";
import type { CreatorAccountView } from "./creator-dashboard.types";

type SettingsTab = "account" | "security" | "tiktok";

const tabs = [
  { id: "account" as const, label: "زانیاری هەژمار", icon: UserRound },
  {
    id: "security" as const,
    label: "چوونەژوورەوە و دانیشتنەکان",
    icon: LockKeyhole,
  },
  {
    id: "tiktok" as const,
    label: DASHBOARD_PAGE_LABELS.tiktokSettings,
    icon: Radio,
  },
];

export function CreatorAccountSettingsPage({
  account,
}: {
  account: CreatorAccountView;
}) {
  const [tab, setTab] = useState<SettingsTab>("account");
  const pageLabel =
    account.page_type === "linktree"
      ? "لینکتری"
      : account.page_type === "mini_website"
        ? "مینی وێبسایت"
        : "دروست نەکراوە";

  return (
    <section
      className="relative w-full space-y-5 pb-10 dark:[color-scheme:dark]"
      dir="ltr"
    >
      <StatCardGrid className="mb-5">
        <StatCard
          icon={SlidersHorizontal}
          label="تابەکان"
          value={tabs.length}
          color="blue"
        />
        <StatCard
          icon={ShieldCheck}
          label="دۆخی گوگڵ"
          value={
            account.google.emailVerified ? "پشتڕاستکراوە" : "پشتڕاستنەکراوە"
          }
          color="green"
        />
        <StatCard
          icon={CalendarDays}
          label="دۆخی هەژمار"
          value={billingLabel(account.billingStatus)}
          color="purple"
        />
        <StatCard
          icon={UserRound}
          label="جۆری پەڕە"
          value={pageLabel}
          color="slate"
        />
      </StatCardGrid>

      <SegmentedTabs
        tabs={tabs}
        value={tab}
        onChange={setTab}
        accent="var(--multitree-accent)"
      />

      {tab === "tiktok" ? (
        <LockedContent
          locked={
            account.billingStatus === "grace_period" ||
            account.billingStatus === "expired"
          }
          icon={ShieldCheck}
          description="بۆ گۆڕینی ڕێکخستنەکانی TikTok پێویستە هەژمارەکەت چالاک بێت"
        >
          <BusinessTikTokPixelConfigPage owner="creator" />
        </LockedContent>
      ) : (
        <DashboardSurface>
          {tab === "account" ? (
            <PageHeaderSection
              icon={UserRound}
              title="پڕۆفایلی هەژمار"
              description="ناو، ئیمەیڵ و وێنەکەت لە هەژماری پشتڕاستکراوەکەتەوە دێن و لە چوونەژوورەوەی داهاتوودا نوێ دەبنەوە"
            >
              <AccountIdentityFields
                name={account.display_name}
                email={account.google.email}
                avatarSrc={account.avatar_url}
                emailVerified={account.google.emailVerified}
              />
            </PageHeaderSection>
          ) : (
            <PageHeaderSection
              icon={LockKeyhole}
              title="چوونەژوورەوە و دانیشتنەکان"
              description="ئامێرە چالاکەکان و مێژووی چوونەژوورەوەی هەژمارەکەت بەڕێوە ببە"
            >
              <SessionManagementPanel endpoint="/api/creator/auth/sessions" />
            </PageHeaderSection>
          )}
        </DashboardSurface>
      )}
    </section>
  );
}

function billingLabel(status: CreatorAccountView["billingStatus"]) {
  const labels = {
    not_started: "دەستی پێنەکردووە",
    trialing: "تاقیکردنەوە",
    grace_period: "ماوەی زیادە",
    expired: "بەسەرچووە",
    active: "چالاک",
  } as const;
  return labels[status];
}
