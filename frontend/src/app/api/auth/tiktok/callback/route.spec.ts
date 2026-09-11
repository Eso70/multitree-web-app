import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("Platform TikTok Ads callback access", () => {
  const consoleSegment = "platform-console-test-private";
  const request = (host: string, cookie?: string) =>
    new NextRequest(`http://${host}/api/auth/tiktok/callback?error=cancelled`, {
      headers: cookie ? { cookie } : {},
    });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "localhost");
    vi.stubEnv("PLATFORM_ADMIN_PATH", consoleSegment);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    ["localhost", undefined],
    ["localhost", "business_session=business"],
    ["tenant.localhost", "platform_admin_session=admin"],
  ])("rejects non-platform access on %s", async (host, cookie) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(request(host, cookie))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid platform session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect((await GET(request("localhost", "platform_admin_session=invalid"))).status).toBe(403);
  });

  it("returns verified administrators to their configured Ads settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(request("localhost", "platform_admin_session=admin"));
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe(`/${consoleSegment}/settings`);
    expect(destination.searchParams.get("tab")).toBe("tiktok-ads");
    expect(destination.searchParams.get("error")).toBe("cancelled");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/platform/auth/profile"),
      expect.objectContaining({ headers: { Cookie: "platform_admin_session=admin" } }),
    );
  });
});
