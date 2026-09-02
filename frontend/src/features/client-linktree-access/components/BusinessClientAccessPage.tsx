"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, ShieldOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonClientAccessPage } from "@/components/shared/SkeletonPageLayouts";
import { apiRequest } from "@/lib/api/request";
import { Tooltip } from "@/components/shared/Tooltip";
import { CreateClientInvitationModal } from "./CreateClientInvitationModal";
import { InvitationCredentialsModal } from "./InvitationCredentialsModal";
import type {
  ClientInvitationSummary,
  CreatedClientInvitation,
} from "../types";

const statusLabel = {
  active: "چالاک",
  submitted: "پەڕە دروستکرا",
  expired: "دەستگەیشتن لابرا",
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ckb-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BusinessClientAccessPage() {
  const [invitations, setInvitations] = useState<ClientInvitationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [credentials, setCredentials] =
    useState<CreatedClientInvitation | null>(null);
  const [pendingAction, setPendingAction] =
    useState<ClientInvitationSummary | null>(null);
  const [isActing, setIsActing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setInvitations(
        await apiRequest<ClientInvitationSummary[]>(
          "/api/client-linktree-invitations",
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error("بارکردنی بانگهێشتنامەکان سەرکەوتوو نەبوو");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const handleFocus = () => void refresh();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  if (loading) return <SkeletonClientAccessPage />;

  return (
    <>
      <DashboardSurface className="space-y-5">
        <PageHeader
          title="بانگهێشتنامەکانی کڕیار"
          description="بەستەر و پینێکی پارێزراو بنێرە تا کڕیار یەک پەڕەی لینکتری بە قاڵبەکانی پلانت دروست بکات."
          icon={UserPlus}
          action={
            <Tooltip content="دروستکردنی بانگهێشتنامەی نوێ بۆ کڕیار" side="bottom">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-black text-[var(--theme-ink)] shadow-sm [background:var(--theme-css)] hover:brightness-95 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" /> بانگهێشتکردنی کڕیار
              </button>
            </Tooltip>
          }
        />

        <div className="border-t border-slate-100 pt-5 dark:border-white/5">
          {invitations.length === 0 ? (
            <div>
              <EmptyState
                compact
                icon={Link2}
                title="هێشتا بانگهێشتنامەیەک نییە"
                description="ناوی کڕیار بنووسە؛ سیستەم بەستەر و پینەکە بە شێوەی خۆکار دروست دەکات."
              />
              <div className="flex justify-center">
                <Tooltip content="دروستکردنی یەکەم بانگهێشتنامەی کڕیار" side="bottom">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-xl px-4 py-2.5 text-xs font-black text-[var(--theme-ink)] [background:var(--theme-css)] hover:brightness-95 cursor-pointer"
                  >
                    یەکەم بانگهێشتنامە دروست بکە
                  </button>
                </Tooltip>
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
                        <h3 className="font-black text-slate-800 dark:text-slate-100">
                          {invitation.clientLabel}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            invitation.status === "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : invitation.status === "submitted"
                                ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          {statusLabel[invitation.status]}
                        </span>
                        {invitation.hasActiveSession ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                            دانیشتنی کراوە
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        دروستکراوە: {formatDate(invitation.createdAt)}
                      </p>
                      {invitation.linktree ? (
                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          پەڕە: {invitation.linktree.name} · /
                          {invitation.linktree.slug}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {invitation.status !== "expired" ? (
                        <Tooltip content="لابردنی دەستگەیشتنی ئەم کڕیارە" side="bottom">
                          <button
                            type="button"
                            onClick={() => setPendingAction(invitation)}
                            className="flex h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10 cursor-pointer"
                          >
                            <ShieldOff className="h-3.5 w-3.5" /> لابردنی
                            دەستگەیشتن
                          </button>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </DashboardSurface>

      <CreateClientInvitationModal
        isOpen={isCreateOpen}
        isCreating={isCreating}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (clientLabel) => {
          setIsCreating(true);
          try {
            const created = await apiRequest<CreatedClientInvitation>(
              "/api/client-linktree-invitations",
              { method: "POST", json: { clientLabel } },
            );
            setIsCreateOpen(false);
            setCredentials(created);
            await refresh();
            toast.success("بانگهێشتنامە دروستکرا");
            return true;
          } catch (error) {
            console.error(error);
            toast.error("دروستکردنی بانگهێشتنامە سەرکەوتوو نەبوو");
            return false;
          } finally {
            setIsCreating(false);
          }
        }}
      />
      <InvitationCredentialsModal
        invitation={credentials}
        onClose={() => setCredentials(null)}
      />
      <ConfirmDeleteModal
        isOpen={Boolean(pendingAction)}
        isDeleting={isActing}
        tone="danger"
        onClose={() => setPendingAction(null)}
        title="لابردنی دەستگەیشتنی کڕیار"
        confirmLabel="لابردنی دەستگەیشتن"
        loadingLabel="جێبەجێ دەکرێت..."
        message={
          <p>
            کڕیار چیتر بە بەستەر، پین یان دانیشتنی ئێستا دەستی بە داشبۆرد،
            لینکتری و ئامارەکان ناگات. لینکتری و هەموو داتاکانی بەبێ گۆڕان بۆ
            بزنسەکە دەمێننەوە.
          </p>
        }
        onConfirm={async () => {
          if (!pendingAction) return;
          setIsActing(true);
          try {
            await apiRequest(
              `/api/client-linktree-invitations/${pendingAction.id}/revoke-access`,
              { method: "POST" },
            );
            await refresh();
            toast.success("دەستگەیشتنی کڕیار لابرا");
          } catch (error) {
            console.error(error);
            toast.error("نوێکردنەوەی دەستگەیشتن سەرکەوتوو نەبوو");
            throw error;
          } finally {
            setIsActing(false);
          }
        }}
      />
    </>
  );
}
