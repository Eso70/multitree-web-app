import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { GOOGLE_AVATAR_PATTERNS, remoteAvatarSrc } from "./remote-avatar";

/**
 * `users.avatar_url` is the Google `picture` claim stored verbatim, and
 * `next/image` throws — it does not degrade — for a `src` outside its
 * configured `remotePatterns`. One unusual stored photo used to take a whole
 * dashboard or admin table to the error boundary.
 */
describe("remoteAvatarSrc", () => {
  it.each([
    "https://lh3.googleusercontent.com/a/ACg8ocKexample=s96-c",
    "https://lh3.googleusercontent.com/a-/AOh14Gexample",
  ])("passes %s through to the loader", (url) => {
    expect(remoteAvatarSrc(url)).toBe(url);
  });

  it.each([
    ["another Google host", "https://lh4.googleusercontent.com/a/example"],
    ["an unlisted Google path", "https://lh3.googleusercontent.com/u/0/photo"],
    ["an unrelated host", "https://example.com/avatar.png"],
    ["plain http", "http://lh3.googleusercontent.com/a/example"],
    ["a hostname that merely ends the same", "https://evillh3.googleusercontent.com/a/x"],
    ["an unparseable value", "not a url"],
    // Stricter than the loader here rather than looser: a bare `/a` draws the
    // placeholder instead of risking a src the loader might throw on.
    ["a bare path with no photo id", "https://lh3.googleusercontent.com/a"],
  ])("refuses %s so the placeholder renders", (_label, url) => {
    expect(remoteAvatarSrc(url)).toBeNull();
  });

  it("passes same-origin uploads through", () => {
    expect(remoteAvatarSrc("/images/upload/avatar.png")).toBe(
      "/images/upload/avatar.png",
    );
  });

  it.each([null, undefined, ""])("treats %s as no avatar", (value) => {
    expect(remoteAvatarSrc(value)).toBeNull();
  });

  /** The guard and the loader allowlist must not drift apart. */
  it("is built from the same patterns the image loader is configured with", () => {
    const googlePatterns = nextConfig.images?.remotePatterns?.filter(
      (pattern) => pattern.hostname === "lh3.googleusercontent.com",
    );

    expect(googlePatterns).toEqual(
      GOOGLE_AVATAR_PATTERNS.map((pattern) => ({ ...pattern })),
    );
  });
});
