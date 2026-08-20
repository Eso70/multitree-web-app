import { describe, expect, it } from "vitest";
import { isSafeNotificationActionUrl } from "./notification-action";

describe("isSafeNotificationActionUrl", () => {
  it.each([
    "/business",
    "/communication-center?tab=messages",
    "https://example.com",
  ])("accepts safe destination %s", (destination) => {
    expect(isSafeNotificationActionUrl(destination)).toBe(true);
  });

  it.each(["//example.com", "http://example.com", "javascript:alert(1)", ""])(
    "rejects unsafe destination %s",
    (destination) => {
      expect(isSafeNotificationActionUrl(destination)).toBe(false);
    },
  );
});
