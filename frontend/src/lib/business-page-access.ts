type PermissionOutcome = "allow" | "approval" | "deny";

export type BusinessDashboardPage =
  | "dashboard"
  | "linktrees"
  | "mini-website"
  | "analytics"
  | "crm"
  | "tiktok-config"
  | "advertising"
  | "templates"
  | "profile"
  | "settings";

export type BusinessSettingsTab =
  | "profile"
  | "defaults"
  | "security"
  | "messages";

interface AccessManifestLike {
  permissions?: Record<string, { outcome?: PermissionOutcome } | undefined>;
  subscription?: {
    planCode?: string;
  };
}

const PAGE_PERMISSIONS: Partial<Record<BusinessDashboardPage, string>> = {
  linktrees: "business:pages:linktrees-access",
  "mini-website": "business:pages:mini-websites-access",
  analytics: "business:analytics:advanced-read",
  crm: "business:analytics:details-read",
  "tiktok-config": "business:tiktok:update",
  advertising: "business:pages:advertising-access",
  templates: "business:pages:templates-access",
  profile: "business:pages:profile-access",
};

/**
 * Pages sold only with the top plan.
 *
 * Locked by plan rather than by permission outcome so the dashboard shows the
 * locked panel instead of letting the page render and then failing its first
 * request. The backend gates these independently — the advertising permissions
 * require the `feature.advertising_page` entitlement, which only Ultra carries
 * — so this is presentation, not the security boundary.
 */
const ULTRA_ONLY_PAGES: ReadonlySet<BusinessDashboardPage> = new Set([
  "crm",
  "advertising",
]);

const PLANS_WITHOUT_ULTRA_PAGES = new Set(["basic", "pro"]);

const SETTINGS_TAB_PERMISSIONS: Record<
  Exclude<BusinessSettingsTab, "messages">,
  string
> = {
  profile: "business:settings:profile-access",
  defaults: "business:settings:defaults-access",
  security: "business:settings:security-access",
};

export function isBusinessPageLocked(
  page: BusinessDashboardPage,
  access: AccessManifestLike | null | undefined,
): boolean {
  // Settings is always reachable. Its individual tabs own their lock state.
  if (page === "settings") return false;
  const permission = PAGE_PERMISSIONS[page];
  if (!permission) return false;
  const outcome = access?.permissions?.[permission]?.outcome;
  const planCode = access?.subscription?.planCode?.trim().toLowerCase();
  if (
    ULTRA_ONLY_PAGES.has(page) &&
    planCode !== undefined &&
    PLANS_WITHOUT_ULTRA_PAGES.has(planCode)
  ) {
    return true;
  }
  return page === "analytics" || page === "mini-website" || page === "advertising"
    ? outcome !== "allow"
    : outcome === "deny";
}

export function isBusinessSettingsTabLocked(
  tab: BusinessSettingsTab,
  access: AccessManifestLike | null | undefined,
): boolean {
  if (tab === "messages") return false;
  return access?.permissions?.[SETTINGS_TAB_PERMISSIONS[tab]]?.outcome === "deny";
}
