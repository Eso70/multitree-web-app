import { SPONSOR_KRD_LOGO } from "@/lib/brand/brand-assets";
import {
  getSponsorKrdAccentInk,
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";
import type { BusinessSubdomainTheme } from "@/lib/utils/business-error-theme";
import { readableInk } from "@/lib/utils/parse-website-color";

export interface ErrorPageTheme {
  scope: "sponsor-krd" | "business" | "platform";
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
  };
}

export const SPONSOR_KRD_ERROR_THEME: ErrorPageTheme = {
  scope: "sponsor-krd",
  accentColor: SPONSOR_KRD_ACCENT_COLOR,
  accentBackground: SPONSOR_KRD_ACCENT_GRADIENT,
  // A concrete ink value, not `var(--sponsor-krd-accent-ink)`: the page writes
  // this back onto that same custom property, and a self-referential
  // declaration resolves to nothing.
  accentInk: getSponsorKrdAccentInk(SPONSOR_KRD_ACCENT_COLOR),
  mutedColor: "var(--sponsor-krd-accent-text-muted, #475569)",
  logo: SPONSOR_KRD_LOGO,
  name: "Sponsor.krd",
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
  accentColor = SPONSOR_KRD_ACCENT_COLOR,
  accentBackground,
  accentInk = readableInk(accentColor),
}: PlatformErrorBranding = {}): ErrorPageTheme {
  // Platform chrome carries SponsorKrd's own mark. Coalesced rather than
  // defaulted: the console holds its branding as `logo: null` until platform
  // settings supply one, and a parameter default only covers `undefined`, so
  // the null flowed through and the shared navbar fell back to the neutral
  // business placeholder on every console error page.
  const logo = brandLogo ?? SPONSOR_KRD_LOGO;
  const name = brandName ?? "Sponsor.krd";
  return {
    scope: "platform",
    accentColor,
    accentBackground,
    accentInk,
    logo,
    name,
    footer: {
      description: "پلاتفۆرمی دروستکردنی Linktree",
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
    },
  };
}
