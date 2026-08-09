import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import type { BusinessSubdomainTheme } from "@/lib/utils/business-error-theme";
import { readableInk } from "@/lib/utils/parse-website-color";

export interface ErrorPageTheme {
  scope: "multitree" | "business";
  accentColor: string;
  accentBackground?: string;
  accentInk?: string;
  mutedColor?: string;
  favicon?: string | null;
  logo?: string | null;
  name?: string | null;
  subdomain?: string | null;
  footer?: {
    description?: string | null;
    phone?: string | null;
    whatsappEnabled?: boolean | null;
    advertisingEnabled?: boolean;
    brandingRemoved?: boolean;
    linktrees?: Array<{ name: string; href: string }>;
    miniWebsites?: Array<{ name: string; href: string }>;
  };
}

export const MULTITREE_ERROR_THEME: ErrorPageTheme = {
  scope: "multitree",
  accentColor: MULTITREE_ACCENT_COLOR,
  accentInk: "var(--multitree-accent-ink, #ffffff)",
  mutedColor: "var(--multitree-accent-text-muted, #475569)",
};

export function businessErrorTheme(
  theme: BusinessSubdomainTheme,
): ErrorPageTheme {
  return {
    scope: "business",
    accentColor: theme.websiteColor.primary,
    accentBackground: theme.websiteColor.css,
    accentInk: readableInk(theme.websiteColor.primary),
    favicon: theme.favicon,
    logo: theme.logo,
    name: theme.name,
    subdomain: theme.subdomain,
    footer: {
      description: theme.footerText ?? null,
      phone: theme.footerPhone ?? null,
      whatsappEnabled: theme.whatsappEnabled ?? null,
      advertisingEnabled: theme.advertisingEnabled ?? false,
      brandingRemoved: theme.brandingRemoved ?? false,
      linktrees: theme.linktrees ?? [],
      miniWebsites: theme.miniWebsites ?? [],
    },
  };
}
