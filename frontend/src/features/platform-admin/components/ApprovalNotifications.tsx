"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { SkeletonList } from "@/components/shared/Skeleton";
import { DashboardHeaderActionButton } from "@/components/shared/DashboardHeader";
import { communicationRequest } from "@/features/communications/api";
import { formatNotificationDate } from "@/features/communications/format";
import type { NotificationInbox } from "@/features/communications/types";
import { usePolling } from "@/lib/utils/usePolling";

interface ApprovalNotification {
  id: string;
  businessName: string;
  permission: string;
  requestedChanges: Record<string, unknown>;
  requestedAt: string;
}

export function ApprovalNotifications() {
  const [open, setOpen] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalNotification[]>([]);
  const [inbox, setInbox] = useState<NotificationInbox>({
    items: [],
    unreadCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Skips the state update when nothing changed, which is the common case —
  // otherwise every poll re-renders the console header for nothing.
  const lastPayloadRef = useRef<string>("");

  const loadApprovals = useCallback(async (showError = false) => {
    try {
      const [response, notifications] = await Promise.all([
        fetch("/api/platform/approvals?status=pending", {
          credentials: "include",
          cache: "no-store",
        }),
        communicationRequest<NotificationInbox>(
          "/api/platform/communications/notifications",
        ).catch(() => ({ items: [], unreadCount: 0 })),
      ]);
      if (!response.ok) {
        if (showError) toast.error("بارکردنی ئاگادارییەکان سەرکەوتوو نەبوو");
        return;
      }
      const result = await response.json();
      const pending: ApprovalNotification[] = result.data || [];
      const serialized = JSON.stringify([pending, notifications]);
      if (serialized !== lastPayloadRef.current) {
        lastPayloadRef.current = serialized;
        setApprovals(pending);
        setInbox(notifications);
      }
    } catch {
      if (showError) toast.error("بارکردنی ئاگادارییەکان سەرکەوتوو نەبوو");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(loadApprovals, 20_000);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const reviewApproval = async (
    approval: ApprovalNotification,
    action: "approve" | "reject",
  ) => {
    if (reviewingId) return;
    const rejectionReason =
      action === "reject"
        ? window.prompt("هۆکاری ڕەتکردنەوە")?.trim()
        : undefined;
    if (action === "reject" && !rejectionReason) return;

    setReviewingId(approval.id);
    try {
      const response = await fetch(
        `/api/platform/approvals/${approval.id}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason }),
        },
      );
      if (!response.ok) {
        toast.error("پێداچوونەوەی داواکاری سەرکەوتوو نەبوو");
        return;
      }
      setApprovals((current) =>
        current.filter((item) => item.id !== approval.id),
      );
      toast.success(
        action === "approve" ? "داواکاری پەسەندکرا" : "داواکاری ڕەتکرایەوە",
      );
    } catch {
      toast.error("پێداچوونەوەی داواکاری سەرکەوتوو نەبوو");
    } finally {
      setReviewingId(null);
    }
  };

  const readNotification = async (id: string, actionUrl?: string | null) => {
    try {
      await communicationRequest(
        `/api/platform/communications/notifications/${id}/read`,
        { method: "PATCH" },
      );
      setInbox((current) => ({
        unreadCount: Math.max(
          0,
          current.unreadCount -
            (current.items.find((item) => item.id === id)?.readAt ? 0 : 1),
        ),
        items: current.items.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      }));
      if (actionUrl?.startsWith("/")) {
        setOpen(false);
        const consoleBasePath = `/${window.location.pathname.split("/").filter(Boolean)[0]}`;
        // Notifications persisted before the concealed console refactor may
        // still contain the former physical route prefix.
        const legacyConsolePrefix = "/system";
        const normalized = actionUrl.startsWith(`${legacyConsolePrefix}/`)
          ? actionUrl.slice(legacyConsolePrefix.length)
          : actionUrl;
        const destination = normalized.startsWith(consoleBasePath)
          ? normalized
          : `${consoleBasePath}${normalized}`;
        window.location.assign(destination);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "نوێکردنەوە سەرکەوتوو نەبوو",
      );
    }
  };

  const dismissNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await communicationRequest(
        `/api/platform/communications/notifications/${id}`,
        { method: "DELETE" },
      );
      setInbox((current) => ({
        unreadCount: Math.max(
          0,
          current.unreadCount -
            (current.items.find((item) => item.id === id)?.readAt ? 0 : 1),
        ),
        items: current.items.filter((item) => item.id !== id),
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "سڕینەوە سەرکەوتوو نەبوو",
      );
    }
  };

  const markAllRead = async () => {
    try {
      await communicationRequest(
        "/api/platform/communications/notifications/read-all",
        { method: "PATCH" },
      );
      setInbox((current) => ({
        unreadCount: 0,
        items: current.items.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
      }));
    } catch {
      toast.error("نوێکردنەوە سەرکەوتوو نەبوو");
    }
  };

  const deleteAllNotifications = async () => {
    try {
      await communicationRequest("/api/platform/communications/notifications", {
        method: "DELETE",
      });
      setInbox({ items: [], unreadCount: 0 });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "سڕینەوەی هەمووی سەرکەوتوو نەبوو",
      );
    }
  };

  const unreadTotal = approvals.length + inbox.unreadCount;
  const hasContent = inbox.items.length > 0 || approvals.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <DashboardHeaderActionButton
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void loadApprovals();
        }}
        aria-label="ئاگادارییەکان"
        aria-expanded={open}
        title="ئاگادارییەکان"
      >
        <Bell className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
        {unreadTotal > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black text-white dark:border-[#161B22]">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </DashboardHeaderActionButton>

      {open && (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[26rem]    duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">
                  ئاگادارییەکان
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {unreadTotal} بابەتی نەخوێندراو
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={deleteAllNotifications}
                disabled={inbox.items.length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                title="سڕینەوەی هەموو ئاگادارییەکان"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
                title="داخستن"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={markAllRead}
                disabled={inbox.unreadCount === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                title="هەمووی خوێندراوەتەوە"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(36rem,72vh)] overflow-y-auto custom-scrollbar">
            {loading ? (
              <SkeletonList className="m-3" rows={4} />
            ) : hasContent ? (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {inbox.items.map((item) => {
                  const canNavigate = !!item.actionUrl?.startsWith("/");
                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        void readNotification(item.id, item.actionUrl)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void readNotification(item.id, item.actionUrl);
                        }
                      }}
                      className={`group relative block w-full cursor-pointer text-right transition-colors ${
                        item.readAt
                          ? "bg-white dark:bg-[#1c222b]"
                          : "bg-[color-mix(in_srgb,var(--multitree-accent)_4%,white)] dark:bg-white/[0.03]"
                      } hover:bg-slate-50 dark:hover:bg-white/5`}
                    >
                      <div
                        className={`absolute right-0 top-0 h-full w-0.5 transition-colors ${
                          item.readAt
                            ? "bg-transparent"
                            : "bg-[var(--multitree-accent)]"
                        }`}
                      />
                      <div className="flex items-start gap-3 p-4 pr-5">
                        {!item.readAt && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--multitree-accent)]" />
                        )}
                        <div
                          className={`min-w-0 flex-1 ${item.readAt ? "mr-5" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-sm leading-5 ${
                                item.readAt
                                  ? "font-medium text-slate-600 dark:text-slate-400"
                                  : "font-bold text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {item.title}
                            </p>
                          </div>
                          {item.body && (
                            <p
                              className={`mt-0.5 text-xs leading-5 ${
                                item.readAt
                                  ? "text-slate-400 dark:text-gray-500"
                                  : "text-slate-500 dark:text-gray-400"
                              }`}
                            >
                              {item.body}
                            </p>
                          )}
                          <p className="mt-1.5 text-[10px] text-slate-400 dark:text-gray-500">
                            {formatNotificationDate(item.createdAt)}
                          </p>
                        </div>
                        {canNavigate && (
                          <ChevronRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => void dismissNotification(item.id, e)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-50 hover:text-red-400 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="سڕینەوە"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {approvals.length > 0 && (
                  <p className="bg-slate-50/60 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:bg-white/[0.02]">
                    پەسەندکردنە چاوەڕوانەکان
                  </p>
                )}
                {approvals.map((approval) => {
                  const reviewing = reviewingId === approval.id;
                  return (
                    <div
                      key={approval.id}
                      className="relative block w-full text-right transition-colors bg-[color-mix(in_srgb,var(--multitree-accent)_4%,white)] dark:bg-white/[0.03]"
                    >
                      <div className="absolute right-0 top-0 h-full w-0.5 bg-[var(--multitree-accent)]" />
                      <div className="flex items-start gap-3 p-4 pr-5">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--multitree-accent)]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold leading-5 text-slate-700 dark:text-slate-200">
                            {approval.businessName}
                          </p>
                          <code
                            className="mt-0.5 block break-all text-xs leading-5 font-bold sa-accent-text"
                            dir="ltr"
                          >
                            {approval.permission}
                          </code>
                          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-gray-400">
                            خانەکان:{" "}
                            {Object.keys(approval.requestedChanges || {}).join(
                              "، ",
                            ) || "هیچ"}
                          </p>
                          <p className="mt-1.5 text-[10px] text-slate-400 dark:text-gray-500">
                            {formatNotificationDate(approval.requestedAt)}
                          </p>

                          <div className="mt-3 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                void reviewApproval(approval, "reject")
                              }
                              disabled={reviewingId !== null}
                              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                            >
                              {reviewing ? (
                                <MotionSpinner>
                                  <Loader2 className="h-3.5 w-3.5 " />
                                </MotionSpinner>
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                              ڕەتکردنەوە
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void reviewApproval(approval, "approve")
                              }
                              disabled={reviewingId !== null}
                              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-[10px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {reviewing ? (
                                <MotionSpinner>
                                  <Loader2 className="h-3.5 w-3.5 " />
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
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                  <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-400">
                  هیچ ئاگادارییەک نییە
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  کاتێک ئاگادارییەکی نوێ هات، لێرەدا دەردەکەوێت
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
