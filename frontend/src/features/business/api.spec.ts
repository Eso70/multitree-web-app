import { describe, expect, it, vi, afterEach } from "vitest";
import { getBusinessDashboardState } from "./api";

/**
 * `business:profile:read` is granted only by the top plan, so the dashboard's
 * refresh poll gets a 403 from `/api/auth/profile` on Basic and Pro. Every plan
 * holds `business:dashboard:view`, so that rejection must not be read as "this
 * session may not see the dashboard" — doing so replaced the entire page with a
 * 403 error page on those plans.
 */

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function routeFetch(routes: Record<string, Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((path) => url.includes(path));
    if (!match) throw new Error(`Unexpected request: ${url}`);
    return routes[match];
  });
}

const manifest = { permissions: {}, subscription: { planCode: "basic" } };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getBusinessDashboardState", () => {
  it("keeps the dashboard usable when the plan forbids reading the profile", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/auth/effective-access": jsonResponse({ data: manifest }),
        "/api/auth/profile": jsonResponse(
          { success: false, message: "Forbidden" },
          403,
        ),
      }),
    );

    const state = await getBusinessDashboardState();

    expect(state.effectiveAccess).toEqual(manifest);
    expect(state.profile).toBeNull();
  });

  it("returns the profile when the plan allows reading it", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/auth/effective-access": jsonResponse({ data: manifest }),
        "/api/auth/profile": jsonResponse({ data: { user: { name: "Biz" } } }),
      }),
    );

    const state = await getBusinessDashboardState();

    expect(state.profile).toEqual({ name: "Biz" });
  });

  it("still propagates a forbidden access manifest, which is a real block", async () => {
    // `effective-access` carries no capability requirement, so a 403 there is
    // an access rule rejecting the request rather than a missing feature.
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/auth/effective-access": jsonResponse(
          { success: false, message: "Blocked" },
          403,
        ),
        "/api/auth/profile": jsonResponse({ data: { user: {} } }),
      }),
    );

    await expect(getBusinessDashboardState()).rejects.toMatchObject({
      status: 403,
    });
  });

  it("propagates a non-403 profile failure instead of hiding it", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/auth/effective-access": jsonResponse({ data: manifest }),
        "/api/auth/profile": jsonResponse(
          { success: false, message: "Boom" },
          500,
        ),
      }),
    );

    await expect(getBusinessDashboardState()).rejects.toMatchObject({
      status: 500,
    });
  });
});
