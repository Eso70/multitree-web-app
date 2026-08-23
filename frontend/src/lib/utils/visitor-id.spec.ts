import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function blockedStorage(): Storage {
  return {
    get length() {
      throw new Error("blocked");
    },
    key: () => {
      throw new Error("blocked");
    },
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
    clear: () => {
      throw new Error("blocked");
    },
  } as unknown as Storage;
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", blockedStorage());
  vi.stubGlobal("sessionStorage", blockedStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analytics identity fallbacks", () => {
  it("keeps valid stable ids in memory when browser storage is blocked", async () => {
    const { getAnalyticsSessionId, getVisitorId } =
      await import("./visitor-id");

    const visitorId = getVisitorId();
    const sessionId = getAnalyticsSessionId();

    expect(visitorId.length).toBeGreaterThanOrEqual(8);
    expect(sessionId.length).toBeGreaterThanOrEqual(8);
    expect(getVisitorId()).toBe(visitorId);
    expect(getAnalyticsSessionId()).toBe(sessionId);
  });
});
