const MAX_TAB_TITLE_LENGTH = 44;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function shortTabTitle(value: string): string {
  const normalized = clean(value) || "MultiTree";
  if (normalized.length <= MAX_TAB_TITLE_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_TAB_TITLE_LENGTH - 1).trimEnd()}…`;
}

export function businessTabTitle(
  businessName: string | null | undefined,
  section: "Home" | "Login" | "Dashboard" | "Pages" | "Website" | "Analytics" | "CRM" | "TikTok Config" | "Templates" | "Ads" | "Profile" | "Settings" | "Not Found" | "Error",
): string {
  const name = shortTabTitle(businessName || "Business");
  const availableNameLength = Math.max(
    8,
    MAX_TAB_TITLE_LENGTH - section.length - 3,
  );
  const compactName =
    name.length > availableNameLength
      ? `${name.slice(0, availableNameLength - 1).trimEnd()}…`
      : name;
  return `${compactName} | ${section}`;
}
