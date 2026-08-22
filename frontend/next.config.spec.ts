import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("Next image configuration", () => {
  it("allows only Google profile-avatar paths on the Google image host", () => {
    const googlePatterns = nextConfig.images?.remotePatterns?.filter(
      (pattern) => pattern.hostname === "lh3.googleusercontent.com",
    );

    expect(googlePatterns).toEqual([
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a-/**",
      },
    ]);
  });
});
