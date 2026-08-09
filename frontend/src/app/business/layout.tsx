import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * The business dashboard and its login screen.
 *
 * Deliberately carries no TikTok pixel. These are private, authenticated
 * screens: a business signing in or editing their page is not an audience
 * TikTok should be shown, and reporting those visits pollutes the same pixel
 * the public pages use — the owner's own sessions would be counted as traffic
 * and would train the ad algorithm on the wrong people.
 *
 * The pixel belongs to the public surfaces only: the business subdomain
 * homepage, its linktrees, and its mini websites.
 */
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
