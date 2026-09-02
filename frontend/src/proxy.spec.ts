// @vitest-environment node

import type { NextFetchEvent } from "next/server";
import { NextRequest } from "next/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const originalRootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
let proxy: typeof import("./proxy").proxy;

function request(path: string, session?: string) {
  return new NextRequest(`http://acme.localhost:3011${path}`, {
    headers: {
      host: "acme.localhost:3011",
      ...(session ? { cookie: `business_session=${session}` } : {}),
    },
  });
}

function event(): NextFetchEvent {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as NextFetchEvent;
}

describe("business route protection", () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "localhost";
    vi.resetModules();
    ({ proxy } = await import("./proxy"));
  });

  afterAll(() => {
    if (originalRootDomain === undefined) {
      delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_ROOT_DOMAIN = originalRootDomain;
    }
    vi.resetModules();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["/business", "/business/pages", "/business/settings"])(
    "conceals unauthenticated route %s with a 404",
    async (path) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));

      const response = await proxy(request(path), event());

      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-rewrite")).toContain(
        "/__public-not-found",
      );
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("keeps only the workspace entry route publicly reachable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));

    const response = await proxy(request("/business/workspace-entry"), event());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });
});
