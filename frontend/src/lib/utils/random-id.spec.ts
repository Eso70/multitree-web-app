import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeId } from "./random-id";

/**
 * Every id this produces becomes `analytics_events.event_id`, which is a `uuid`
 * column. A value that is merely unique is not enough — one that Postgres will
 * not parse takes the whole write down, and on the mini-website lead form that
 * meant losing the lead.
 *
 * The fallbacks matter because they are not exotic: a page served over plain
 * HTTP has no Web Crypto in some browsers, so the last branch is what real
 * visitors hit, not just old ones.
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRuntimeId", () => {
  it("returns a uuid when the runtime provides randomUUID", () => {
    expect(createRuntimeId()).toMatch(UUID);
  });

  it("returns a uuid when only getRandomValues exists", () => {
    const { getRandomValues } = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: getRandomValues.bind(globalThis.crypto),
    });

    expect(createRuntimeId()).toMatch(UUID);
  });

  it("returns a uuid when there is no Web Crypto at all", () => {
    vi.stubGlobal("crypto", undefined);

    expect(createRuntimeId()).toMatch(UUID);
  });

  it("does not repeat itself across the crypto-less fallback", () => {
    vi.stubGlobal("crypto", undefined);

    const ids = new Set(Array.from({ length: 500 }, () => createRuntimeId()));

    expect(ids.size).toBe(500);
  });

  it("keeps a prefix outside the uuid", () => {
    expect(createRuntimeId("evt-")).toMatch(/^evt-/);
  });
});
