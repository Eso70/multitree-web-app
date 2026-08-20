"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, CheckCheck, ChevronRight, Inbox, Trash2, X } from "lucide-react";
import { DashboardHeaderActionButton } from "@/components/shared/DashboardHeader";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { SkeletonList } from "@/components/shared/Skeleton";
import { formatNotificationDate } from "./format";
import type { CommunicationNotification, NotificationInbox } from "./types";

interface NotificationBellProps {
  inbox: NotificationInbox;
  loading: boolean;
  onRefresh: () => void | Promise<unknown>;
  onRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  additionalUnreadCount?: number;
  additionalContent?: ReactNode;
  modalDescription: string;
  modalAccentColor?: string | null;
  multiTreeModalTheme?: boolean;
  canOpenAction?: (notification: CommunicationNotification) => boolean;
  onOpenAction?: (notification: CommunicationNotification) => void;
  actionLabel?: (notification: CommunicationNotification) => string;
}

export function NotificationBell({
  inbox,
  loading,
  onRefresh,
  onRead,
  onDismiss,
  onMarkAllRead,
  onDeleteAll,
  additionalUnreadCount = 0,
  additionalContent,
  modalDescription,
  modalAccentColor = null,
  multiTreeModalTheme = true,
  canOpenAction = () => false,
  onOpenAction,
  actionLabel = () => "بینین",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<CommunicationNotification | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadTotal = inbox.unreadCount + additionalUnreadCount;
  const hasContent = inbox.items.length > 0 || additionalContent != null;

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

  const selectNotification = async (
    notification: CommunicationNotification,
  ) => {
    try {
      await onRead(notification.id);
      setSelectedNotification({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      });
    } catch {
      // The scoped inbox hook already reports the failure.
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await onDismiss(id);
      if (selectedNotification?.id === id) setSelectedNotification(null);
    } catch {
      // The scoped inbox hook already reports the failure.
    }
  };

  return (
    <div
      className="relative"
      ref={containerRef}
      style={
        {
          "--notification-accent":
            modalAccentColor || "var(--multitree-accent)",
        } as React.CSSProperties
      }
    >
      <DashboardHeaderActionButton
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void onRefresh();
        }}
        aria-label="ئاگادارییەکان"
        aria-expanded={open}
        title="ئاگادارییەکان"
      >
        <Bell className="h-4 w-4 transition-transform group-hover:scale-110 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        {unreadTotal > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-black text-white dark:border-[#161B22]">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        )}
      </DashboardHeaderActionButton>

      {open && (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-200 dark:border-white/10 dark:bg-[#1c222b] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[26rem]">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-gray-400">
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
                onClick={() => void onDeleteAll().catch(() => undefined)}
                disabled={inbox.items.length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 dark:disabled:hover:bg-transparent"
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
                onClick={() => void onMarkAllRead().catch(() => undefined)}
                disabled={inbox.unreadCount === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:disabled:hover:bg-transparent"
                title="هەمووی خوێندراوەتەوە"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="custom-scrollbar max-h-[min(36rem,72vh)] overflow-y-auto">
            {loading ? (
              <SkeletonList className="m-3" rows={4} />
            ) : hasContent ? (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {inbox.items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void selectNotification(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void selectNotification(item);
                      }
                    }}
                    className={`group relative block w-full cursor-pointer text-right transition-colors ${
                      item.readAt
                        ? "bg-white dark:bg-[#1c222b]"
                        : "bg-[color-mix(in_srgb,var(--notification-accent)_4%,white)] dark:bg-white/[0.03]"
                    } hover:bg-slate-50 dark:hover:bg-white/5`}
                  >
                    <div
                      className={`absolute right-0 top-0 h-full w-0.5 transition-colors ${item.readAt ? "bg-transparent" : "bg-[var(--notification-accent)]"}`}
                    />
                    <div className="flex items-start gap-3 p-4 pr-5">
                      {!item.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--notification-accent)]" />
                      )}
                      <div
                        className={`min-w-0 flex-1 ${item.readAt ? "mr-5" : ""}`}
                      >
                        <p
                          className={`text-sm leading-5 ${
                            item.readAt
                              ? "font-medium text-slate-600 dark:text-slate-400"
                              : "font-bold text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.body && (
                          <p
                            className={`mt-0.5 line-clamp-2 text-xs leading-5 ${
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
                      {canOpenAction(item) && (
                        <ChevronRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-600" />
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void dismissNotification(item.id);
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-50 hover:text-red-400 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="سڕینەوە"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {additionalContent}
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

      <ManagementModal
        isOpen={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title ?? ""}
        description={modalDescription}
        createBusinessStyle
        multiTreeTheme={multiTreeModalTheme}
        accentColor={modalAccentColor}
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
                onClick={() =>
                  void dismissNotification(selectedNotification.id)
                }
                className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-br from-rose-50 to-red-50 px-4 py-2.5 text-xs font-semibold text-rose-600 shadow-sm transition-all duration-300 hover:from-rose-100 hover:to-red-100 hover:shadow dark:from-rose-500/15 dark:to-red-500/15 dark:text-rose-400 dark:hover:from-rose-500/25 dark:hover:to-red-500/25 sm:py-3 sm:text-sm"
              >
                <Trash2 className="h-4 w-4" />
                سڕینەوە
              </button>
              {canOpenAction(selectedNotification) && onOpenAction && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotification(null);
                    setOpen(false);
                    onOpenAction(selectedNotification);
                  }}
                  className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-semibold text-[var(--theme-ink)] shadow-sm transition-all duration-300 [background:var(--theme-css)] hover:brightness-95 hover:shadow sm:py-3 sm:text-sm"
                >
                  {actionLabel(selectedNotification)}
                </button>
              )}
            </>
          ) : null
        }
      >
        <div className="space-y-4" dir="ltr">
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
