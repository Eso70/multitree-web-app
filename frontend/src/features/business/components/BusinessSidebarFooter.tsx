"use client";

import { ArrowUpRight, Crown, LifeBuoy } from "lucide-react";
import { AccentActionButton } from "@/components/shared/AccentActionButton";

interface BusinessSidebarFooterProps {
  collapsed: boolean;
  planCode?: string;
  planName?: string;
  onSupport: () => void;
  onUpgrade: () => void;
}

export function BusinessSidebarFooter({
  collapsed,
  planCode,
  planName,
  onSupport,
  onUpgrade,
}: BusinessSidebarFooterProps) {
  const displayPlanName = planName?.trim() || "Plan";
  const canUpgrade = Boolean(planCode && planCode.toLowerCase() !== "ultra");

  return (
    <div
      className="shrink-0 border-t border-slate-200 p-3 dark:border-white/10"
      aria-label="پلان و پشتیوانی"
    >
      <div
        className={`rounded-2xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.035] ${collapsed ? "md:flex md:flex-col md:items-center md:gap-2 md:border-transparent md:bg-transparent md:p-0 md:dark:bg-transparent" : "p-3"}`}
      >
        <div
          className={`flex items-center ${collapsed ? "md:justify-center" : "gap-3"}`}
          title={`پلانی ئێستا: ${displayPlanName}`}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background:
                "color-mix(in srgb, var(--theme-primary, #64748b) 14%, transparent)",
              color: "var(--theme-primary, #64748b)",
            }}
          >
            <Crown className="h-4 w-4" aria-hidden="true" />
          </span>
          <div
            className={`min-w-0 flex-1 transition-all duration-300 ${collapsed ? "md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0" : "opacity-100"}`}
          >
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              پلانی ئێستا
            </p>
            <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
              {displayPlanName}
            </p>
          </div>
        </div>

        {canUpgrade && (
          <AccentActionButton
            onClick={onUpgrade}
            className={`mt-3 w-full md:h-9 md:w-9 md:px-0 ${collapsed ? "md:mt-0" : ""}`}
            title="پلانەکەت بەرز بکەرەوە"
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className={collapsed ? "md:hidden" : ""}>
              پلانەکەت بەرز بکەرەوە
            </span>
          </AccentActionButton>
        )}
      </div>

      <button
        type="button"
        onClick={onSupport}
        className={`mt-2 flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-100 ${collapsed ? "md:justify-center md:px-0" : "gap-3"}`}
        title="یارمەتی و پشتیوانی"
      >
        <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span
          className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "md:pointer-events-none md:w-0 md:overflow-hidden md:opacity-0" : "opacity-100"}`}
        >
          یارمەتی و پشتیوانی
        </span>
      </button>
    </div>
  );
}
