"use client";

import { Check, Loader2, X } from "lucide-react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { formatNotificationDate } from "@/features/communications/format";

export interface ApprovalNotification {
  id: string;
  businessName: string;
  permission: string;
  requestedChanges: Record<string, unknown>;
  requestedAt: string;
}

interface PendingApprovalNotificationsProps {
  approvals: ApprovalNotification[];
  reviewingId: string | null;
  onReview: (
    approval: ApprovalNotification,
    action: "approve" | "reject",
  ) => void;
}

export function PendingApprovalNotifications({
  approvals,
  reviewingId,
  onReview,
}: PendingApprovalNotificationsProps) {
  if (approvals.length === 0) return null;

  return (
    <>
      <p className="bg-slate-50/60 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:bg-white/[0.02]">
        پەسەندکردنە چاوەڕوانەکان
      </p>
      {approvals.map((approval) => {
        const reviewing = reviewingId === approval.id;
        return (
          <div
            key={approval.id}
            className="relative block w-full bg-[color-mix(in_srgb,var(--notification-accent)_4%,white)] text-right transition-colors dark:bg-white/[0.03]"
          >
            <div className="absolute right-0 top-0 h-full w-0.5 bg-[var(--notification-accent)]" />
            <div className="flex items-start gap-3 p-4 pr-5">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--notification-accent)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-5 text-slate-700 dark:text-slate-200">
                  {approval.businessName}
                </p>
                <code
                  className="sa-accent-text mt-0.5 block break-all text-xs font-bold leading-5"
                  dir="ltr"
                >
                  {approval.permission}
                </code>
                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-gray-400">
                  خانەکان:{" "}
                  {Object.keys(approval.requestedChanges || {}).join("، ") ||
                    "هیچ"}
                </p>
                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-gray-500">
                  {formatNotificationDate(approval.requestedAt)}
                </p>

                <div className="mt-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onReview(approval, "reject")}
                    disabled={reviewingId !== null}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                  >
                    {reviewing ? (
                      <MotionSpinner>
                        <Loader2 className="h-3.5 w-3.5" />
                      </MotionSpinner>
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    ڕەتکردنەوە
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(approval, "approve")}
                    disabled={reviewingId !== null}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-[10px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {reviewing ? (
                      <MotionSpinner>
                        <Loader2 className="h-3.5 w-3.5" />
                      </MotionSpinner>
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    پەسەندکردن
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
