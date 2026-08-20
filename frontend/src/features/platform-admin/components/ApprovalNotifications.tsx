"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { NotificationBell } from "@/features/communications/NotificationBell";
import {
  isSafeNotificationActionUrl,
  notificationActionLabel,
} from "@/features/communications/notification-action";
import type { CommunicationNotification } from "@/features/communications/types";
import { useNotificationInbox } from "@/features/communications/useNotificationInbox";
import { usePolling } from "@/lib/utils/usePolling";
import {
  PendingApprovalNotifications,
  type ApprovalNotification,
} from "./PendingApprovalNotifications";

const PLATFORM_COMMUNICATIONS_ENDPOINT = "/api/platform/communications";

function canOpenPlatformNotification(notification: CommunicationNotification) {
  return isSafeNotificationActionUrl(notification.actionUrl);
}

function platformNotificationDestination(actionUrl: string) {
  if (actionUrl.startsWith("https://")) return actionUrl;
  const consoleBasePath = `/${window.location.pathname.split("/").filter(Boolean)[0]}`;
  const legacyConsolePrefix = "/system";
  const normalized = actionUrl.startsWith(`${legacyConsolePrefix}/`)
    ? actionUrl.slice(legacyConsolePrefix.length)
    : actionUrl;
  return normalized.startsWith(consoleBasePath)
    ? normalized
    : `${consoleBasePath}${normalized}`;
}

export interface ApprovalNotificationsHandle {
  refresh: () => Promise<unknown>;
}

export const ApprovalNotifications = forwardRef<ApprovalNotificationsHandle>(
  function ApprovalNotifications(_props, ref) {
    const notifications = useNotificationInbox(
      PLATFORM_COMMUNICATIONS_ENDPOINT,
    );
    const [approvals, setApprovals] = useState<ApprovalNotification[]>([]);
    const [approvalsLoading, setApprovalsLoading] = useState(true);
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const lastApprovalsRef = useRef("");

    const loadApprovals = useCallback(async (showError = false) => {
      try {
        const response = await fetch("/api/platform/approvals?status=pending", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Approval request failed");
        const payload = await response.json();
        const pending: ApprovalNotification[] = Array.isArray(payload?.data)
          ? payload.data
          : [];
        const serialized = JSON.stringify(pending);
        if (serialized !== lastApprovalsRef.current) {
          lastApprovalsRef.current = serialized;
          setApprovals(pending);
        }
      } catch {
        if (showError) toast.error("بارکردنی ئاگادارییەکان سەرکەوتوو نەبوو");
      } finally {
        setApprovalsLoading(false);
      }
    }, []);

    usePolling(loadApprovals, 20_000);

    const reviewApproval = useCallback(
      async (approval: ApprovalNotification, action: "approve" | "reject") => {
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
          if (!response.ok) throw new Error("Approval review failed");
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
      },
      [reviewingId],
    );

    const refresh = useCallback(
      () => Promise.all([notifications.load(), loadApprovals()]),
      [loadApprovals, notifications],
    );

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const openAction = useCallback(
      (notification: CommunicationNotification) => {
        if (!notification.actionUrl) return;
        const destination = platformNotificationDestination(
          notification.actionUrl,
        );
        if (destination.startsWith("https://")) {
          window.open(destination, "_blank", "noopener,noreferrer");
        } else {
          window.location.assign(destination);
        }
      },
      [],
    );

    return (
      <NotificationBell
        inbox={notifications.inbox}
        loading={notifications.loading || approvalsLoading}
        onRefresh={refresh}
        onRead={notifications.read}
        onDismiss={notifications.dismiss}
        onMarkAllRead={notifications.markAllRead}
        onDeleteAll={notifications.deleteAll}
        additionalUnreadCount={approvals.length}
        additionalContent={
          approvals.length > 0 ? (
            <PendingApprovalNotifications
              approvals={approvals}
              reviewingId={reviewingId}
              onReview={(approval, action) =>
                void reviewApproval(approval, action)
              }
            />
          ) : null
        }
        modalDescription="ئاگادارییەکانی پلاتفۆرم"
        canOpenAction={canOpenPlatformNotification}
        onOpenAction={openAction}
        actionLabel={notificationActionLabel}
      />
    );
  },
);
