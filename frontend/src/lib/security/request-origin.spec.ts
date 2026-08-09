import { describe, expect, it } from "vitest";
import {
  isAuthenticatedMutation,
  isSameOriginBrowserRequest,
} from "@/lib/security/request-origin";

describe("request origin protection", () => {
  it("identifies authenticated state-changing requests", () => {
    expect(isAuthenticatedMutation("POST", "business_session=token")).toBe(true);
    expect(isAuthenticatedMutation("PATCH", "other=x; platform_admin_session=token")).toBe(true);
    expect(isAuthenticatedMutation("GET", "business_session=token")).toBe(false);
    expect(isAuthenticatedMutation("POST", null)).toBe(false);
  });

  it("accepts same-origin browser requests and server requests without origin headers", () => {
    expect(isSameOriginBrowserRequest("https://tenant.example.com/api/test", "https://tenant.example.com", null)).toBe(true);
    expect(isSameOriginBrowserRequest("https://tenant.example.com/api/test", null, null)).toBe(true);
  });

  it("uses the browser-facing host when Next.js has an internal request URL", () => {
    expect(
      isSameOriginBrowserRequest(
        "http://localhost:3011/api/platform/auth/login",
        "http://lvh.me:3011",
        null,
        "lvh.me:3011",
      ),
    ).toBe(true);

    expect(
      isSameOriginBrowserRequest(
        "http://localhost:3011/api/platform/auth/login",
        "https://example.com",
        null,
        "localhost:3011",
        "app.example.com",
        "https",
      ),
    ).toBe(false);
  });

  it("honors a forwarded HTTPS protocol for reverse-proxied requests", () => {
    expect(
      isSameOriginBrowserRequest(
        "http://localhost:3011/api/test",
        "https://app.example.com",
        null,
        "app.example.com",
        null,
        "https",
      ),
    ).toBe(true);
  });

  it("rejects cross-origin, opaque, and malformed browser origins", () => {
    expect(isSameOriginBrowserRequest("https://tenant.example.com/api/test", "https://evil.example", null)).toBe(false);
    expect(isSameOriginBrowserRequest("https://tenant.example.com/api/test", "null", null)).toBe(false);
    expect(isSameOriginBrowserRequest("https://tenant.example.com/api/test", "not-a-url", null)).toBe(false);
  });
});
