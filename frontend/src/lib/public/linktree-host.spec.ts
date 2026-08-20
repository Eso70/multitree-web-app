import { describe, expect, it } from "vitest";
import { resolveLinktreeHost } from "./linktree-host";

describe("resolveLinktreeHost", () => {
  it.each(["sponsor.krd", "www.sponsor.krd"])(
    "routes %s to the platform workspace",
    (host) => {
      expect(resolveLinktreeHost(host, "sponsor.krd")).toEqual({
        isPlatformRoot: true,
        subdomain: "",
      });
    },
  );

  it("keeps a business subdomain tenant-scoped", () => {
    expect(resolveLinktreeHost("client.sponsor.krd", "sponsor.krd")).toEqual({
      isPlatformRoot: false,
      subdomain: "client",
    });
  });

  it.each(["localhost", "127.0.0.1"])(
    "supports root-domain development on %s",
    (host) => {
      expect(resolveLinktreeHost(host, "localhost").isPlatformRoot).toBe(true);
    },
  );
});
