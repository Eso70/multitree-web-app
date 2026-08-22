export const PLATFORM_ADMIN_PAGES = [
  "businesses",
  "linktrees",
  "mini-websites",
  "users",
  "templates",
  "blocklists",
  "access-control",
  "activity",
  "communication-center",
  "api",
  "settings",
  "billing",
] as const;

export type PlatformPage = (typeof PLATFORM_ADMIN_PAGES)[number];

export function isPlatformPage(value: string): value is PlatformPage {
  return (PLATFORM_ADMIN_PAGES as readonly string[]).includes(value);
}

export function getPlatformPage(pathname: string): PlatformPage {
  const segment = pathname.split("/").filter(Boolean)[1];
  return segment && isPlatformPage(segment) ? segment : "businesses";
}
