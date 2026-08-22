import { MULTITREE_LOGO } from "@/lib/brand/brand-assets";
import {
  getMultiTreeAccentInk,
  MULTITREE_ACCENT_COLOR,
} from "@/lib/multitree-theme";
import type { BusinessSubdomainTheme } from "@/lib/utils/business-error-theme";
import { readableInk } from "@/lib/utils/parse-website-color";

export interface ErrorPageTheme {
  scope: "multitree" | "business" | "platform";
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
  // A concrete ink value, not `var(--multitree-accent-ink)`: the page writes
  // this back onto that same custom property, and a self-referential
  // declaration resolves to nothing.
  accentInk: getMultiTreeAccentInk(MULTITREE_ACCENT_COLOR),
  mutedColor: "var(--multitree-accent-text-muted, #475569)",
  logo: MULTITREE_LOGO,
  name: "MultiTree",
};

interface PlatformErrorBranding {
  name?: string | null;
  logo?: string | null;
  accentColor?: string;
  accentBackground?: string;
  accentInk?: string;
}

export function platformErrorTheme({
  name: brandName,
  logo: brandLogo,
  accentColor = MULTITREE_ACCENT_COLOR,
  accentBackground,
  accentInk = readableInk(accentColor),
}: PlatformErrorBranding = {}): ErrorPageTheme {
  // Platform chrome carries MultiTree's own mark. Coalesced rather than
  // defaulted: the console holds its branding as `logo: null` until platform
  // settings supply one, and a parameter default only covers `undefined`, so
  // the null flowed through and the shared navbar fell back to the neutral
  // business placeholder on every console error page.
  const logo = brandLogo ?? MULTITREE_LOGO;
  const name = brandName ?? "MultiTree";
  return {
    scope: "platform",
    accentColor,
    accentBackground,
    accentInk,
    logo,
    name,
    footer: {
      description: "پلاتفۆرمی دروستکردنی Linktree و ماڵپەڕی بچووک",
      brandingRemoved: true,
    },
  };
}

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
