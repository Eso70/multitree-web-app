// @vitest-environment node

import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * Absolute URLs generated on the server must use the scheme the site is
 * actually served over. Local development runs on plain http, so a hardcoded
 * https link is unreachable there; production runs behind TLS and must not
 * emit http. The scheme is therefore derived from the configured application
 * URL, and this file pins that behavior for both environments.
 *
 * This runs in the node environment on purpose: these functions branch on
 * whether `window` exists, and the behavior under test is the server branch.
 * The default jsdom environment would exercise the browser branch instead,
 * which reads the real location rather than the configuration.
 */

const ORIGINAL_ENV = { ...process.env };

/**
 * `app-url` reads `process.env` at call time, but Next.js inlines
 * `NEXT_PUBLIC_*` at build time in application code. The module is re-imported
 * per case so each one observes its own environment.
 */
const loadAppUrl = async (env: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  vi.resetModules();
  return import("./app-url");
};

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("getSubdomainLoginUrl on the server", () => {
  it("uses http for local development", async () => {
    const { getSubdomainLoginUrl } = await loadAppUrl({
      NEXT_PUBLIC_APP_URL: "http://lvh.me:3011",
      NEXT_PUBLIC_ROOT_DOMAIN: "lvh.me:3011",
      NODE_ENV: "development",
    });

    expect(getSubdomainLoginUrl("acme")).toBe(
      "http://acme.lvh.me:3011/business/login",
    );
  });

  it("uses https for the live server", async () => {
    const { getSubdomainLoginUrl } = await loadAppUrl({
      NEXT_PUBLIC_APP_URL: "https://sponsor.krd",
      NEXT_PUBLIC_ROOT_DOMAIN: "sponsor.krd",
      NODE_ENV: "production",
    });

    expect(getSubdomainLoginUrl("acme")).toBe(
      "https://acme.sponsor.krd/business/login",
    );
  });

  it("falls back to https in production when the app URL is unset", async () => {
    const { getSubdomainLoginUrl } = await loadAppUrl({
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_ROOT_DOMAIN: "sponsor.krd",
      NODE_ENV: "production",
    });

    expect(getSubdomainLoginUrl("acme")).toBe(
      "https://acme.sponsor.krd/business/login",
    );
  });

  it("returns the root login path when there is no subdomain", async () => {
    const { getSubdomainLoginUrl } = await loadAppUrl({
      NEXT_PUBLIC_APP_URL: "http://lvh.me:3011",
      NODE_ENV: "development",
    });

    expect(getSubdomainLoginUrl()).toBe("/login");
  });
});

describe("getAppBaseUrl", () => {
  it("returns the configured local application URL", async () => {
    const { getAppBaseUrl } = await loadAppUrl({
      NEXT_PUBLIC_APP_URL: "http://lvh.me:3011",
      NODE_ENV: "development",
    });

    expect(getAppBaseUrl()).toBe("http://lvh.me:3011");
  });

  it("returns the configured production application URL", async () => {
    const { getAppBaseUrl } = await loadAppUrl({
      NEXT_PUBLIC_APP_URL: "https://sponsor.krd",
      NODE_ENV: "production",
    });

    expect(getAppBaseUrl()).toBe("https://sponsor.krd");
  });
});
