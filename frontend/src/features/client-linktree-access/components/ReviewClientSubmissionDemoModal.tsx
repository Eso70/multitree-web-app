"use client";

import { CheckCircle2, Pencil, ShieldAlert } from "lucide-react";
import { ManagementModal } from "@/components/shared/ManagementModal";
import type { ClientAccessDemoInvitation } from "../mock-store";
import {
  ClientAccessDemoPreview,
  ClientAccessDemoStatusPill,
} from "./ClientAccessDemoPreview";

export function ReviewClientSubmissionDemoModal({
  invitation,
  onClose,
  onPublish,
}: {
  invitation: ClientAccessDemoInvitation | null;
  onClose: () => void;
  onPublish: (invitation: ClientAccessDemoInvitation) => void;
}) {
  if (!invitation) return null;

  return (
    <ManagementModal
      isOpen
      onClose={onClose}
      title="پێداچوونەوەی ناردنی کڕیار"
      description="دوای ناردنی کۆتایی، دەستکاریکەری کڕیار دادەخرێت."
      extraWide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            داخستن
          </button>
          <button
            type="button"
            disabled={invitation.status !== "submitted"}
            onClick={() => onPublish(invitation)}
            className="flex h-11 items-center gap-2 rounded-xl border border-transparent px-5 text-sm font-bold text-[var(--theme-ink)] transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            بڵاوکردنەوەی پەڕەی تاقیکردنەوە
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <ClientAccessDemoPreview invitation={invitation} />
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
            <div>
              <p className="text-xs font-medium text-slate-400">کەمپین</p>
              <h3 className="mt-1 text-base font-black text-slate-800 dark:text-slate-100">
                {invitation.campaignLabel}
              </h3>
            </div>
            <ClientAccessDemoStatusPill invitation={invitation} />
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                لە تایبەتمەندییە ڕاستەقینەکەدا، پێش بڵاوکردنەوە دەبێت
                ناونیشانەکان، فایلە بارکراوەکان، سنوور، دۆخی بازرگانی و
                خاوەندارێتی کرێگرتە لە سێرڤەر دووبارە پشتڕاست بکرێنەوە.
              </p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 dark:divide-white/5 dark:border-white/10">
            {[
              ["ناوی پەڕە", invitation.draft.pageName || "دابین نەکراوە"],
              ["قاڵب", invitation.templateName],
              [
                "قاڵبە ڕێگەپێدراوەکان",
                invitation.allowedTemplateNames.length.toLocaleString("ckb-IQ"),
              ],
              [
                "لینکەکان",
                `${invitation.draft.links.length} لە ${invitation.maxLinks}`,
              ],
              [
                "نێردراوە",
                invitation.submittedAt
                  ? new Intl.DateTimeFormat("ckb-IQ", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(invitation.submittedAt))
                  : "هێشتا نەنێردراوە",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 py-3 text-sm"
              >
                <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="text-right font-semibold text-slate-800 dark:text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">
              پێداچوونەوەی ناونیشانەکان
            </h3>
            <div className="space-y-2">
              {invitation.draft.links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                      {link.label}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {link.url}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ManagementModal>
  );
}
