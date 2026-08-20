"use client";

import { useCallback } from "react";
import { useRegisterBusinessDashboardRefresh } from "@/features/business/dashboard-refresh";
import { useTheme } from "@/lib/contexts/ThemeProvider";
import type { CommunicationNotification } from "./types";
import { NotificationBell } from "./NotificationBell";
import {
  isSafeNotificationActionUrl,
  notificationActionLabel,
} from "./notification-action";
import { useNotificationInbox } from "./useNotificationInbox";

const BUSINESS_COMMUNICATIONS_ENDPOINT = "/api/auth/communications";

function canOpenBusinessNotification(notification: CommunicationNotification) {
  return Boolean(
    (notification.sourceType === "conversation" && notification.sourceId) ||
    isSafeNotificationActionUrl(notification.actionUrl),
  );
}

export function BusinessCommunicationBell() {
  const { color: businessTheme } = useTheme();
  const notifications = useNotificationInbox(BUSINESS_COMMUNICATIONS_ENDPOINT);

  useRegisterBusinessDashboardRefresh("notifications", () =>
    notifications.load(true),
  );

  const openAction = useCallback((notification: CommunicationNotification) => {
    if (notification.sourceType === "conversation" && notification.sourceId) {
      window.location.assign(
        `/business/settings?tab=messages&conversation=${encodeURIComponent(notification.sourceId)}`,
      );
      return;
    }
    if (
      isSafeNotificationActionUrl(notification.actionUrl) &&
      notification.actionUrl.startsWith("/")
    ) {
      window.location.assign(notification.actionUrl);
      return;
    }
    if (isSafeNotificationActionUrl(notification.actionUrl)) {
      window.open(notification.actionUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  return (
    <NotificationBell
      inbox={notifications.inbox}
      loading={notifications.loading}
      onRefresh={notifications.load}
      onRead={notifications.read}
      onDismiss={notifications.dismiss}
      onMarkAllRead={notifications.markAllRead}
      onDeleteAll={notifications.deleteAll}
      modalDescription="ئاگادارییەکانی پلاتفۆرم"
      modalAccentColor={businessTheme.primary}
      multiTreeModalTheme={false}
      canOpenAction={canOpenBusinessNotification}
      onOpenAction={openAction}
      actionLabel={notificationActionLabel}
    />
  );
}
