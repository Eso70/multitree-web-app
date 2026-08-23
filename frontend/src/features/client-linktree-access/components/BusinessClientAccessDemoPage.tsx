"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Clipboard,
  ExternalLink,
  FileCheck2,
  KeyRound,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  addClientAccessDemoInvitation,
  CLIENT_ACCESS_DEMO_EVENT,
  CLIENT_ACCESS_DEMO_STORAGE_KEY,
  clearClientAccessDemoInvitations,
  createClientAccessDemoInvitation,
  publishClientAccessDemoInvitation,
  readClientAccessDemoInvitations,
  revokeClientAccessDemoInvitation,
  updateClientAccessDemoInvitation,
  type ClientAccessDemoInvitation,
  type CreateClientAccessDemoInput,
} from "../mock-store";
import { ClientAccessDemoStatusPill } from "./ClientAccessDemoPreview";
import { CreateClientInvitationDemoModal } from "./CreateClientInvitationDemoModal";
import { ReviewClientSubmissionDemoModal } from "./ReviewClientSubmissionDemoModal";

type PendingDestructiveAction =
  | { type: "revoke"; invitation: ClientAccessDemoInvitation }
  | { type: "clear" };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ckb-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BusinessClientAccessDemoPage() {
  const [invitations, setInvitations] = useState<ClientAccessDemoInvitation[]>(
    () => readClientAccessDemoInvitations(),
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reviewInvitation, setReviewInvitation] =
    useState<ClientAccessDemoInvitation | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingDestructiveAction | null>(null);

  const refresh = useCallback(() => {
    setInvitations(readClientAccessDemoInvitations());
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CLIENT_ACCESS_DEMO_STORAGE_KEY) refresh();
    };
    const handleDemoUpdate = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CLIENT_ACCESS_DEMO_EVENT, handleDemoUpdate);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CLIENT_ACCESS_DEMO_EVENT, handleDemoUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const clientUrl = (invitation: ClientAccessDemoInvitation) =>
    `${window.location.origin}/client-linktree-demo/${encodeURIComponent(invitation.token)}`;
  const resultsUrl = (invitation: ClientAccessDemoInvitation) =>
    `${window.location.origin}/client-linktree-demo/${encodeURIComponent(invitation.resultsToken)}/results`;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} کۆپی کرا`);
    } catch {
      toast.error(`کۆپیکردنی ${label} سەرکەوتوو نەبوو`);
    }
  };

  const handleCreate = (input: CreateClientAccessDemoInput) => {
    const invitation = createClientAccessDemoInvitation(input);
    addClientAccessDemoInvitation(invitation);
    refresh();
    toast.success("بانگهێشتنامەی تاقیکردنەوە دروست کرا");
  };

  const handlePublish = (invitation: ClientAccessDemoInvitation) => {
    const published = updateClientAccessDemoInvitation(
      invitation.token,
      (current) => publishClientAccessDemoInvitation(current),
    );
    if (!published || published.status !== "published") {
      toast.error("تەنها پەڕەی نێردراو دەتوانرێت بڵاوبکرێتەوە");
      return;
    }
    setReviewInvitation(published);
    refresh();
    toast.success("پەڕەی تاقیکردنەوە بڵاوکرایەوە");
  };

  return (
    <>
      <DashboardSurface className="space-y-5">
        <PageHeader
          title="دەستگەیشتنی کاتی کڕیار"
          description="پرۆسەی تەواوی بانگهێشتکردن، دەستکاریکردنی کڕیار، پێداچوونەوە، بڵاوکردنەوە و ئەنجامەکان بە داتای تاقیکردنەوەی ناو وێبگەڕ تاقی بکەرەوە."
          icon={UserPlus}
          badgeText="تاقیکردنەوەی ڕووکار"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {invitations.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: "clear" })}
                  className="flex h-10 items-center gap-2 rounded-xl border border-red-200 px-3.5 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  پاککردنەوەی تاقیکردنەوە
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl border border-transparent px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm transition [background:var(--theme-css)] hover:brightness-95"
              >
                <UserPlus className="h-4 w-4" />
                بانگهێشتکردنی کڕیار
              </button>
            </div>
          }
        />

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            ئەمە تەنها نموونەی تاقیکردنەوەیە. تۆکن، پین، ڕەشنووس و دۆخی
            بڵاوکردنەوە تەنها لەم وێبگەڕەدا هەڵدەگیرێن و پارێزراو نین. بۆ کڕیاری
            ڕاستەقینە یان زانیاری هەستیار بەکاری مەهێنە.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-5 dark:border-white/5">
          {invitations.length === 0 ? (
            <div>
              <EmptyState
                compact
                icon={KeyRound}
                title="هێشتا هیچ بانگهێشتنامەیەک نییە"
                description="بانگهێشتنامەیەک دروست بکە، بینینی کڕیار بکەرەوە، پەڕەکە بنێرە و بۆ پێداچوونەوە بگەڕێوە ئێرە."
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-xl border border-transparent px-4 py-2.5 text-xs font-black text-[var(--theme-ink)] [background:var(--theme-css)] hover:brightness-95"
                >
                  یەکەم بانگهێشتنامە دروست بکە
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <article
                  key={invitation.id}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                          {invitation.campaignLabel}
                        </h3>
                        <ClientAccessDemoStatusPill invitation={invitation} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          قاڵبە ڕێگەپێدراوەکان:{" "}
                          {invitation.allowedTemplateNames.length.toLocaleString(
                            "ckb-IQ",
                          )}
                        </span>
                        {invitation.status !== "active" ? (
                          <span>
                            قاڵبی هەڵبژێردراو: {invitation.templateName}
                          </span>
                        ) : null}
                        <span>زۆرترین لینک: {invitation.maxLinks}</span>
                        <span>
                          بەسەردەچێت: {formatDate(invitation.expiresAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          void copy(
                            clientUrl(invitation),
                            "بەستەری بانگهێشتنامە",
                          )
                        }
                        className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        <Clipboard className="h-3.5 w-3.5" /> بەستەر
                      </button>
                      {invitation.pin ? (
                        <button
                          type="button"
                          onClick={() => void copy(invitation.pin ?? "", "پین")}
                          className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> {invitation.pin}
                        </button>
                      ) : null}
                      {invitation.status === "active" ? (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              clientUrl(invitation),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> بینینی کڕیار
                        </button>
                      ) : null}
                      {invitation.status === "submitted" ||
                      invitation.status === "published" ? (
                        <button
                          type="button"
                          onClick={() => setReviewInvitation(invitation)}
                          className="flex h-9 items-center gap-2 rounded-xl border border-transparent px-3 text-xs font-black text-[var(--theme-ink)] [background:var(--theme-css)] hover:brightness-95"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" /> پێداچوونەوە
                        </button>
                      ) : null}
                      {invitation.status === "published" ? (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              resultsUrl(invitation),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="flex h-9 items-center gap-2 rounded-xl border border-emerald-200 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                        >
                          <BarChart3 className="h-3.5 w-3.5" /> ئەنجامەکان
                        </button>
                      ) : null}
                      {invitation.status !== "revoked" ? (
                        <button
                          type="button"
                          aria-label={`هەڵوەشاندنەوەی ${invitation.campaignLabel}`}
                          onClick={() =>
                            setPendingAction({ type: "revoke", invitation })
                          }
                          className="flex h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          هەڵوەشاندنەوە
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </DashboardSurface>

      <CreateClientInvitationDemoModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />
      <ReviewClientSubmissionDemoModal
        invitation={reviewInvitation}
        onClose={() => setReviewInvitation(null)}
        onPublish={handlePublish}
      />
      <ConfirmDeleteModal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        title={
          pendingAction?.type === "clear"
            ? "پاککردنەوەی داتای تاقیکردنەوە"
            : "هەڵوەشاندنەوەی بانگهێشتنامە"
        }
        confirmLabel={
          pendingAction?.type === "clear" ? "پاککردنەوە" : "هەڵوەشاندنەوە"
        }
        loadingLabel="نوێدەکرێتەوە..."
        cancelLabel="پاشگەزبوونەوە"
        message={
          pendingAction?.type === "clear" ? (
            <p>
              هەموو داتای تاقیکردنەوەی دەستگەیشتنی کڕیار لەم وێبگەڕە بسڕدرێتەوە؟
            </p>
          ) : (
            <p>
              دەستگەیشتنی{" "}
              <strong>{pendingAction?.invitation.campaignLabel}</strong>{" "}
              هەڵبوەشێندرێتەوە؟
            </p>
          )
        }
        onConfirm={async () => {
          if (pendingAction?.type === "clear") {
            clearClientAccessDemoInvitations();
            setReviewInvitation(null);
          } else if (pendingAction?.type === "revoke") {
            updateClientAccessDemoInvitation(
              pendingAction.invitation.token,
              (current) => revokeClientAccessDemoInvitation(current),
            );
          }
          refresh();
        }}
      />
    </>
  );
}
