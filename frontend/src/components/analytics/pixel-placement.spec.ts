import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Where the TikTok pixel is allowed to exist.
 *
 * Two surfaces, both public and both per-business: the public linktree page and
 * the public mini website page. Those are the pages a business actually sends
 * ad traffic to, and they are the only places a pixel earns its keep.
 *
 * Everywhere else is excluded on purpose. A business signing in or editing
 * their own page is not an audience, and reporting those visits pollutes the
 * very pixel the public pages use — the owner's own sessions get counted as
 * traffic and train the ad algorithm on the wrong people. The subdomain
 * landing page, the advertising page, the platform's own root domain and the
 * admin console are all out for the same reason. See docs/tracking.md.
 *
 * This is asserted structurally rather than by rendering, because the failure
 * it guards against is someone mounting the component somewhere new, which no
 * behavioural test of the existing pages would notice.
 */

const SOURCE_ROOT = join(process.cwd(), "src");

/** The only files permitted to mount the pixel, relative to `src`. */
const ALLOWED = new Set([
  // Public linktree pages.
  "components/public/LinktreePage.tsx",
  // Public mini website pages.
  "features/mini-website/PublicMiniWebsite.tsx",
]);

function sourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, found);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.spec\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

function filesMounting(pattern: RegExp): string[] {
  return sourceFiles(SOURCE_ROOT)
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) =>
      file.slice(SOURCE_ROOT.length + 1).split(/[\\/]/).join("/"),
    );
}

describe("TikTok pixel placement", () => {
  it("is mounted only on public surfaces", () => {
    // `\b` keeps `<TikTokPixelBaseCode` (the SSR half of the same feature) from
    // being read as a client pixel mount: it is pinned separately below.
    const mounts = filesMounting(/<TikTokPixel\b|from "@\/components\/analytics\/TikTokPixel"/);

    expect([...mounts].sort()).toEqual([...ALLOWED].sort());
  });

  it("is absent from the business dashboard and its login screen", () => {
    const mounts = filesMounting(/<TikTokPixel/);

    // `app/business/**` is authenticated: the dashboard and the login page.
    expect(mounts.some((file) => file.startsWith("app/business/"))).toBe(false);
    expect(
      mounts.some((file) => file.startsWith("components/business/Business" + "Dashboard")),
    ).toBe(false);
  });

  it("is absent from the platform's own root site and admin console", () => {
    const mounts = filesMounting(/<TikTokPixel/);

    // The root domain renders `HomeLanding`; the console lives under
    // `features/platform-admin`. Neither serves a business, so neither has a
    // pixel to report to.
    expect(mounts.some((file) => file.includes("home/HomeLanding"))).toBe(false);
    expect(mounts.some((file) => file.includes("platform-admin"))).toBe(false);
  });

  it("is absent from the subdomain landing page and the advertising page", () => {
    const mounts = filesMounting(/<TikTokPixel/);

    // Both are public and both belong to a business, which is exactly why they
    // are easy to add a pixel to by reflex. Neither is a page ads are pointed
    // at, so neither reports.
    expect(
      mounts.some((file) => file.includes("business/BusinessLanding")),
    ).toBe(false);
    expect(mounts.some((file) => file.includes("advertising"))).toBe(false);
  });

  it("touches ttq from the dispatcher, the snippet, and the debug reporter only", () => {
    const files = filesMounting(/\bttq\b/);

    // The dispatcher owns the queue. The snippet builder generates the string
    // the server renders into the HTML. The debug reporter reads the queue to
    // answer "did the pixel load?" on a live page and never calls it.
    expect(files.sort()).toEqual([
      "features/analytics/tiktok-base-code-snippet.ts",
      "features/analytics/tiktok-debug.ts",
      "features/analytics/tiktok-dispatch.ts",
    ]);
  });

  it("server-renders the base code from the two public pages only", () => {
    // The inline base code is what TikTok's verifier finds in the served
    // HTML, so it is subject to the same placement rule as the client pixel:
    // the linktree and mini-website public pages, and nowhere else.
    const pages = filesMounting(
      /from "@\/components\/analytics\/TikTokPixelBaseCode"/,
    );

    expect(pages.sort()).toEqual([
      "app/bio/[slug]/page.tsx",
      "app/linktree/[uid]/page.tsx",
    ]);

    // And the snippet is generated in the shared builder — plain, without
    // "use client", so the server component may call it — with the component
    // that embeds it as the other holder.
    const holders = filesMounting(/tiktokBaseCodeSnippet/);

    expect(holders.sort()).toEqual([
      "components/analytics/TikTokPixelBaseCode.tsx",
      "features/analytics/tiktok-base-code-snippet.ts",
    ]);
  });

  it("builds the ttq queue in one place", () => {
    // There were two stubs once — one that loaded the pixel and one that fired
    // events — which meant two definitions of the global and two chances for a
    // page to report through a half-built queue. Whoever assigns `window.ttq`
    // owns dispatch, so exactly one file may.
    const builders = filesMounting(/window\.ttq\s*=/);

    expect(builders.sort()).toEqual(["features/analytics/tiktok-dispatch.ts"]);
  });

  it("never reads a pixel id or Events API token from the environment", () => {
    const offenders = sourceFiles(SOURCE_ROOT).filter((file) =>
      /process\.env\.[A-Z_]*(?:PIXEL|EVENTS_TOKEN|TIKTOK[A-Z_]*TOKEN)/.test(
        readFileSync(file, "utf8"),
      ),
    );

    // Both are per-business and live in `business_tiktok_pixels`, with the
    // token encrypted at rest. An env var would be one value shared by every
    // tenant, which is the wrong shape as well as a leak.
    expect(offenders).toEqual([]);
  });
});
