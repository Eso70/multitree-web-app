"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { communicationRequest } from "@/features/communications/api";
import type { NotificationInbox } from "@/features/communications/types";

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
      setApprovals(result.data || []);
      setInbox(notifications);
    } catch {
      if (showError) toast.error("بارکردنی ئاگادارییەکان سەرکەوتوو نەبوو");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadApprovals());
    const interval = window.setInterval(() => void loadApprovals(), 60_000);
    const handleFocus = () => void loadApprovals();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadApprovals]);

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

  const dismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void loadApprovals();
        }}
        className="group relative flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 dark:from-white/5 dark:to-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:from-white/10 dark:hover:to-white/10 transition-all duration-300 text-slate-500 hover:text-slate-700 shadow-sm hover:shadow cursor-pointer"
        aria-label="ئاگادارییەکان"
        aria-expanded={open}
        title="ئاگادارییەکان"
      >
        <Bell className="h-4 w-4 transition-transform group-hover:scale-110 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        {unreadTotal > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black leading-none text-white shadow-sm dark:border-[#161B22]">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl    duration-200 dark:border-white/10 dark:bg-[#1c222b]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-white to-slate-50/40 p-4 dark:border-white/5 dark:from-[#1c222b] dark:to-slate-900/10">
            <div>
              <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">
                ئاگادارییەکان
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">
                {unreadTotal} بابەتی نەخوێندراو
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={markAllRead}
                disabled={inbox.unreadCount === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors
                  bg-slate-50 dark:bg-white/5
                  border-slate-100 dark:border-white/10
                  text-slate-500 dark:text-gray-400
                  hover:bg-slate-100 dark:hover:bg-white/10
                  hover:border-slate-200 dark:hover:border-white/20
                  hover:text-slate-700 dark:hover:text-gray-200
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-50 dark:disabled:hover:bg-white/5"
                title="هەمووی خوێندراوەتەوە"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={deleteAllNotifications}
                disabled={inbox.items.length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors
                  bg-rose-50 dark:bg-rose-500/10
                  border-rose-100 dark:border-rose-500/20
                  text-rose-500 dark:text-rose-400
                  hover:bg-rose-100 dark:hover:bg-rose-500/15
                  hover:border-rose-200 dark:hover:border-rose-500/30
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50 dark:disabled:hover:bg-rose-500/10"
                title="سڕینەوەی هەموو ئاگادارییەکان"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm transition-colors
                  bg-slate-50 dark:bg-white/5
                  border-slate-100 dark:border-white/10
                  text-slate-500 dark:text-gray-400
                  hover:bg-slate-100 dark:hover:bg-white/10
                  hover:border-slate-200 dark:hover:border-white/20
                  hover:text-slate-700 dark:hover:text-gray-200"
                aria-label="داخستن"
                title="داخستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[min(32rem,70vh)] overflow-y-auto p-3 custom-scrollbar lime-custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <MotionSpinner><Loader2 className="h-6 w-6  text-slate-400"  /></MotionSpinner>
              </div>
            ) : approvals.length === 0 && inbox.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
                  <Clock3 className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                  هیچ ئاگادارییەک نییە
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inbox.items.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        ڕووداو و پەیامەکان
                      </p>
                    </div>
                    <div className="space-y-2">
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
                            className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03] ${
                              item.readAt
                                ? "border-slate-200 dark:border-white/10"
                                : "border-[color-mix(in_srgb,var(--multitree-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--multitree-accent)_5%,transparent)]"
                            }`}
                          >
                            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--multitree-accent)]" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-black text-slate-700 dark:text-slate-200">
                                {item.title}
                              </span>
                              <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-slate-500">
                                {item.body}
                              </span>
                              <span className="mt-1 block text-[9px] text-slate-400">
                                {new Date(item.createdAt).toLocaleString()}
                              </span>
                            </span>
                            {canNavigate && (
                              <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
                            )}
                            <button
                              type="button"
                              onClick={(e) =>
                                void dismissNotification(item.id, e)
                              }
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              title="سڕینەوە"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {approvals.length > 0 && (
                  <p className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    پەسەندکردنە چاوەڕوانەکان
                  </p>
                )}
                {approvals.map((approval) => {
                  const reviewing = reviewingId === approval.id;
                  return (
                    <article
                      key={approval.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">
                          {approval.businessName}
                        </p>
                        <code
                          className="mt-1 block break-all text-[10px] font-bold sa-accent-text"
                          dir="ltr"
                        >
                          {approval.permission}
                        </code>
                        <p className="mt-2 text-[10px] leading-4 text-slate-400">
                          خانەکان:{" "}
                          {Object.keys(approval.requestedChanges || {}).join(
                            "، ",
                          ) || "هیچ"}
                        </p>
                        <p className="mt-1 text-[9px] text-slate-400">
                          {new Date(approval.requestedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void reviewApproval(approval, "reject")
                          }
                          disabled={reviewingId !== null}
                          className="flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                        >
                          {reviewing ? (
                            <MotionSpinner><Loader2 className="h-3.5 w-3.5 "  /></MotionSpinner>
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
                          className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-[10px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {reviewing ? (
                            <MotionSpinner><Loader2 className="h-3.5 w-3.5 "  /></MotionSpinner>
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          پەسەندکردن
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
