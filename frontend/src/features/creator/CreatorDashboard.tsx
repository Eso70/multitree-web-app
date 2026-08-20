"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IdCard, Link2, LogOut, ShieldCheck } from "lucide-react";
import {
  SkeletonCardGrid,
  SkeletonStatCards,
} from "@/components/shared/Skeleton";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { RootLinktreesPage } from "@/features/platform-admin/components/PlatformLinktreesPage";
import { MiniWebsitesPage } from "@/features/mini-website/MiniWebsitesPage";
import { CREATOR_MINI_WEBSITE_WORKSPACE } from "@/features/mini-website/workspace-config";
import { apiRequest } from "@/lib/api/request";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";

type CreatorContext = {
  account: {
    display_name: string;
    email: string;
    page_type: "linktree" | "mini_website" | null;
    billingStatus:
      "not_started" | "trialing" | "grace_period" | "expired" | "active";
    remainingTrialDays: number;
    trial_days: number;
  };
  branding: {
    logo: string | null;
    avatar: string | null;
    accentColor: string | null;
  };
};

export function CreatorDashboard() {
  const router = useRouter();
  const [context, setContext] = useState<CreatorContext | null>(null);
  const [choice, setChoice] = useState<"linktree" | "mini_website" | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setContext(await apiRequest<CreatorContext>("/api/creator/context"));
    } catch {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  if (!context) {
    return (
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <SkeletonStatCards count={3} />
        <DashboardSurface>
          <SkeletonCardGrid count={4} />
        </DashboardSurface>
      </main>
    );
  }

  const pageType = context.account.page_type || choice;
  const billingCopy =
    context.account.billingStatus === "not_started"
      ? `تاقیکردنەوەی ${context.account.trial_days} ڕۆژەکەت کاتێک دەست پێدەکات کە پەڕەکەت دروست بکەیت.`
      : context.account.billingStatus === "trialing"
        ? `${context.account.remainingTrialDays} ڕۆژ لە تاقیکردنەوەکەت ماوە.`
        : context.account.billingStatus === "grace_period"
          ? "ماوەی تاقیکردنەوە تەواو بووە؛ پەڕەکەت بەم زووانە داخراو دەبێت."
          : context.account.billingStatus === "active"
            ? "هەژمارەکەت چالاکە."
            : "پەڕەکەت خوێندنەوە تەنهاست تا بەشدارییەکەت چالاک بکرێت.";

  return (
    <ThemeProvider websiteColor={context.branding.accentColor}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]" dir="rtl">
        <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#161b22]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                MultiTree Creator
              </p>
              <p className="text-xs text-slate-500">{context.account.email}</p>
            </div>
            <button
              onClick={async () => {
                await apiRequest("/api/creator/auth/logout", {
                  method: "POST",
                });
                router.replace("/login");
              }}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
            >
              <LogOut className="h-4 w-4" />
              چوونەدەرەوە
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
          <div className="mb-7 flex items-start gap-3 rounded-2xl border border-lime-300/60 bg-lime-50 p-4 text-sm text-slate-700 dark:border-lime-300/20 dark:bg-lime-300/5 dark:text-slate-200">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-black">{context.account.display_name}</p>
              <p className="mt-1">{billingCopy}</p>
            </div>
          </div>

          {!pageType ? (
            <DashboardSurface className="mx-auto max-w-3xl text-center">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                یەک جۆری پەڕە هەڵبژێرە
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                هەر هەژمارێک دەتوانێت تەنها یەک لینک‌تری یان یەک مینی وێبسایت
                دروست بکات.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => setChoice("linktree")}
                  className="rounded-2xl border border-slate-200 p-6 text-right transition hover:border-lime-400 hover:bg-lime-50 dark:border-white/10 dark:hover:bg-lime-300/5"
                >
                  <Link2 className="mb-4 h-7 w-7 text-blue-600" />
                  <span className="block text-lg font-black dark:text-white">
                    لینک‌تری
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    پەڕەیەکی سادە بۆ بەستەرەکان و ڕیکلام.
                  </span>
                </button>
                <button
                  onClick={() => setChoice("mini_website")}
                  className="rounded-2xl border border-slate-200 p-6 text-right transition hover:border-lime-400 hover:bg-lime-50 dark:border-white/10 dark:hover:bg-lime-300/5"
                >
                  <IdCard className="mb-4 h-7 w-7 text-violet-600" />
                  <span className="block text-lg font-black dark:text-white">
                    مینی وێبسایت
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    پەڕەی تەواوتر بۆ ناساندن و خزمەتگوزارییەکان.
                  </span>
                </button>
              </div>
            </DashboardSurface>
          ) : pageType === "linktree" ? (
            <RootLinktreesPage
              apiBase="/api/creator/linktrees"
              analyticsDataSource="creator-linktree"
              ownerLabel="Creator"
              maxPages={1}
            />
          ) : (
            <MiniWebsitesPage
              businessLogo={context.branding.logo}
              businessDefaultAvatar={context.branding.avatar}
              websiteColor={context.branding.accentColor}
              workspaceConfig={CREATOR_MINI_WEBSITE_WORKSPACE}
              maxPages={1}
            />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}
