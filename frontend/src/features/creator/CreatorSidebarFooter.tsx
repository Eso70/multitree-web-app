import { ShieldCheck } from "lucide-react";
import type { CreatorBillingStatus } from "./creator-dashboard.types";

const BILLING_LABELS: Record<CreatorBillingStatus, string> = {
  not_started: "تاقیکردنەوە دەستی پێنەکردووە",
  trialing: "لە تاقیکردنەوەدایە",
  grace_period: "ماوەی زیادە",
  expired: "بەسەرچووە",
  active: "چالاک",
};

export function CreatorSidebarFooter({
  collapsed,
  billingStatus,
}: {
  collapsed: boolean;
  billingStatus: CreatorBillingStatus;
}) {
  return (
    <div className="border-t border-slate-100 p-4 dark:border-white/5">
      <div
        className={`flex items-center rounded-xl bg-slate-50 p-3 dark:bg-white/5 ${collapsed ? "md:justify-center" : "gap-3"}`}
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-lime-600" />
        <div
          className={
            collapsed
              ? "overflow-hidden md:pointer-events-none md:w-0 md:opacity-0"
              : "min-w-0"
          }
        >
          <p className="whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-200">
            هەژماری بەکارهێنەر
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[10px] text-slate-400">
            {BILLING_LABELS[billingStatus]}
          </p>
        </div>
      </div>
    </div>
  );
}
