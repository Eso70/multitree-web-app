"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Inbox,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/shared/Skeleton";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { AccentActionButton } from "@/components/shared/AccentActionButton";
import { useTheme } from "@/lib/contexts/ThemeProvider";
import { communicationRequest } from "./api";
import { usePolling } from "@/lib/utils/usePolling";
import type {
  CommunicationNotification,
  NotificationInbox,
} from "./types";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";

function formatNotificationDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("ckb-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BusinessCommunicationBell() {
  const { color: businessTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<NotificationInbox>({ items: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<CommunicationNotification | null>(null);
  const container = useRef<HTMLDivElement>(null);

  // Skips the state update when the inbox is unchanged, which is the common
  // case — otherwise every poll re-renders the dashboard header for nothing.
  const lastInboxRef = useRef<string>("");

  const load = useCallback(async (rethrow = false) => {
    try {
      const notifications = await communicationRequest<NotificationInbox>(
        "/api/auth/communications/notifications",
      );
      const serialized = JSON.stringify(notifications);
      if (serialized !== lastInboxRef.current) {
        lastInboxRef.current = serialized;
        setInbox(notifications);
      }
    } catch (error) {
      // The dashboard stays usable if communication is temporarily unavailable.
      if (rethrow) throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useRegisterBusinessDashboardRefresh("notifications", () => load(true));

  usePolling(load, 20_000);

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); };
  }, [open]);

  const readNotification = async (id: string) => {
    try {
      const notification =
        inbox.items.find((item) => item.id === id) ?? null;
      await communicationRequest(`/api/auth/communications/notifications/${id}/read`, { method: "PATCH" });
      setInbox((current) => ({
        unreadCount: Math.max(0, current.unreadCount - (current.items.find((item) => item.id === id)?.readAt ? 0 : 1)),
        items: current.items.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item),
      }));
      if (notification) setSelectedNotification(notification);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "نوێکردنەوە سەرکەوتوو نەبوو");
    }
  };

  const navigateToRespond = (conversationId: string) => {
    setSelectedNotification(null);
    setOpen(false);
    window.location.assign(
      `/business/settings?tab=messages&conversation=${encodeURIComponent(conversationId)}`,
    );
  };

  const dismissNotification = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await communicationRequest(`/api/auth/communications/notifications/${id}`, { method: "DELETE" });
      setInbox((current) => ({
        unreadCount: Math.max(0, current.unreadCount - (current.items.find((item) => item.id === id)?.readAt ? 0 : 1)),
        items: current.items.filter((item) => item.id !== id),
      }));
      setSelectedNotification(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "سڕینەوە سەرکەوتوو نەبوو");
    }
  };

  const markAllRead = async () => {
    try {
      await communicationRequest("/api/auth/communications/notifications/read-all", { method: "PATCH" });
      setInbox((current) => ({
        unreadCount: 0,
        items: current.items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      }));
    } catch {
      toast.error("نوێکردنەوە سەرکەوتوو نەبوو");
    }
  };

  const deleteAll = async () => {
    try {
      await communicationRequest("/api/auth/communications/notifications", { method: "DELETE" });
      setInbox({ items: [], unreadCount: 0 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "سڕینەوەی هەمووی سەرکەوتوو نەبوو");
    }
  };

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) void load(); }}
        className="group relative flex items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 dark:from-white/5 dark:to-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:from-white/10 dark:hover:to-white/10 transition-all duration-300 text-slate-500 hover:text-slate-700 shadow-sm hover:shadow cursor-pointer"
        aria-label="ئاگاداری"
        aria-expanded={open}
        title="ئاگاداری"
      >
        <Bell className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />
        {inbox.unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black text-white dark:border-[#161B22]">
            {inbox.unreadCount > 99 ? "99+" : inbox.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[26rem]    duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">ئاگاداری</h2>
                <p className="mt-0.5 text-[11px] text-slate-400">ئاگادارییەکانی پلاتفۆرم</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={deleteAll}
                disabled={inbox.items.length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                title="سڕینەوەی هەموو ئاگادارییەکان"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
                title="داخستن"
              >
                <X className="h-4 w-4" />
              </button>
              <button
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
            ) : inbox.items.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {inbox.items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void readNotification(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void readNotification(item.id);
                      }
                    }}
                    className={`group relative block w-full cursor-pointer text-right transition-colors ${
                      item.readAt
                        ? "bg-white dark:bg-[#1c222b]"
                        : "bg-[color-mix(in_srgb,var(--theme-primary)_4%,white)] dark:bg-white/[0.03]"
                    } hover:bg-slate-50 dark:hover:bg-white/5`}
                  >
                    <div className={`absolute right-0 top-0 h-full w-0.5 transition-colors ${
                      item.readAt
                        ? "bg-transparent"
                        : "bg-[var(--theme-primary)]"
                    }`} />
                    <div className="flex items-start gap-3 p-4 pr-5">
                      {!item.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--theme-primary)]" />
                      )}
                      <div className={`min-w-0 flex-1 ${item.readAt ? "mr-5" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm leading-5 ${
                            item.readAt
                              ? "font-medium text-slate-600 dark:text-slate-400"
                              : "font-bold text-slate-700 dark:text-slate-200"
                          }`}>
                            {item.title}
                          </p>
                        </div>
                        {item.body && (
                          <p className={`mt-0.5 text-xs leading-5 ${
                            item.readAt
                              ? "text-slate-400 dark:text-gray-500"
                              : "text-slate-500 dark:text-gray-400"
                          }`}>
                            {item.body}
                          </p>
                        )}
                        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-gray-500">
                          {formatNotificationDate(item.createdAt)}
                        </p>
                      </div>
                      {item.actionUrl && (item.actionUrl.startsWith("/") || item.actionUrl.startsWith("https://")) && (
                        <ChevronRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
                      )}
                      <button
                        onClick={(e) => void dismissNotification(item.id, e)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-50 hover:text-red-400 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="سڕینەوە"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
                  <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-400">هیچ ئاگادارییەک نییە</p>
                <p className="mt-1 text-xs text-slate-400">کاتێک ئاگادارییەکی نوێ هات، لێرەدا دەردەکەوێت</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ManagementModal
        isOpen={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title ?? ""}
        description="ئاگادارییەکانی پلاتفۆرم"
        createBusinessStyle
        multiTreeTheme={false}
        accentColor={businessTheme.primary}
        footer={
          selectedNotification ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:shadow sm:py-3 sm:text-sm"
              >
                داخستن
              </button>
              <button
                type="button"
                onClick={() => void dismissNotification(selectedNotification.id)}
                className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-rose-50 to-red-50 px-4 py-2.5 text-xs font-semibold text-rose-600 shadow-sm transition-all duration-300 hover:from-rose-100 hover:to-red-100 hover:shadow sm:py-3 sm:text-sm dark:from-rose-500/15 dark:to-red-500/15 dark:text-rose-400 dark:hover:from-rose-500/25 dark:hover:to-red-500/25"
              >
                <Trash2 className="h-4 w-4" />
                سڕینەوە
              </button>
              {selectedNotification.sourceType === "conversation" &&
                selectedNotification.sourceId && (
                  <AccentActionButton
                    onClick={() =>
                      navigateToRespond(selectedNotification.sourceId!)
                    }
                    className="w-full flex-1"
                  >
                    وەڵامدانەوە
                  </AccentActionButton>
                )}
            </>
          ) : null
        }
      >
        <div dir="ltr" className="space-y-4">
          {selectedNotification?.body && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-base leading-7 text-slate-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-200">
              {selectedNotification.body}
            </div>
          )}
          {selectedNotification?.createdAt && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatNotificationDate(selectedNotification.createdAt)}
            </p>
          )}
        </div>
      </ManagementModal>
    </div>
  );
}
