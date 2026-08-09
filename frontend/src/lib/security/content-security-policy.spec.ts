import { describe, expect, it } from "vitest";
import { createContentSecurityPolicy } from "./content-security-policy";

describe("createContentSecurityPolicy", () => {
  it("uses a nonce and strict-dynamic without unsafe-inline in production scripts", () => {
    const policy = createContentSecurityPolicy("request-nonce", false);
    expect(policy).toContain("script-src 'self' 'nonce-request-nonce' 'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("retains unsafe-eval only for the development runtime", () => {
    const policy = createContentSecurityPolicy("dev-nonce", true);
    expect(policy).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
