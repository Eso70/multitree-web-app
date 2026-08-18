/**
 * Notification timestamps render identically in both bells. Kept here in the
 * neutral communications feature so the business and platform-admin inboxes
 * cannot drift to different locales or field sets.
 */
export function formatNotificationDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("ckb-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
