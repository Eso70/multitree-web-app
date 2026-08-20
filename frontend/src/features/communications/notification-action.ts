import type { CommunicationNotification } from "./types";

export function isSafeNotificationActionUrl(
  value: string | null | undefined,
): value is string {
  return Boolean(
    value &&
    ((value.startsWith("/") && !value.startsWith("//")) ||
      value.startsWith("https://")),
  );
}

export function notificationActionLabel(
  notification: CommunicationNotification,
) {
  return notification.sourceType === "conversation" ? "وەڵامدانەوە" : "بینین";
}
