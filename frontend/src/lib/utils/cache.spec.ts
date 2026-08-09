import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithCache } from "./cache";

function response(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "",
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe("fetchWithCache", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it("discards an invalid cached response and stores the refetched value", async () => {
    window.localStorage.setItem(
      "api_cache_/api/linktrees",
      JSON.stringify({
        data: { success: true, data: [{ id: "legacy" }] },
        timestamp: Date.now(),
        expiresAt: Date.now() + 60_000,
      }),
    );
    const linktrees = [{ id: "current" }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ success: true, data: linktrees }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithCache(
        "/api/linktrees",
        undefined,
        "/api/linktrees",
        false,
        (value): value is Array<{ id: string }> => Array.isArray(value),
      ),
    ).resolves.toEqual(linktrees);
    expect(fetchMock).toHaveBeenCalledOnce();

    const cached = JSON.parse(
      window.localStorage.getItem("api_cache_/api/linktrees") || "null",
    ) as { data?: unknown } | null;
    expect(cached?.data).toEqual(linktrees);
  });
});
