import type { ReactNode } from "react";
import {
  BusinessPublicFooter,
  type BusinessPublicFooterProps,
} from "@/components/business/BusinessPublicFooter";
import { PublicMarketingSiteShell } from "@/components/public/PublicMarketingSiteShell";

interface BusinessPublicSiteShellProps {
  accentColor: string;
  businessName: string;
  children: ReactNode;
  embedded?: boolean;
  footer: Omit<BusinessPublicFooterProps, "accentColor" | "businessName">;
  homeHref?: string;
  id?: string;
  logo?: string | null;
  navigationItems?: ReadonlyArray<{ label: string; href: string }>;
  action?: { label: string; href: string; external?: boolean } | null;
  emphasizeFirstNavItem?: boolean;
}

export function BusinessPublicSiteShell({
  accentColor,
  businessName,
  children,
  embedded = false,
  footer,
  homeHref = "/",
  id,
  logo,
  navigationItems,
  action,
  emphasizeFirstNavItem = true,
}: BusinessPublicSiteShellProps) {
  return (
    <PublicMarketingSiteShell
      id={id}
      accentColor={accentColor}
      brandName={businessName}
      logo={logo}
      homeHref={homeHref}
      navigationItems={navigationItems}
      primaryAction={action}
      emphasizeFirstNavItem={emphasizeFirstNavItem}
      embedded={embedded}
      footer={
        <BusinessPublicFooter
          {...footer}
          businessName={businessName}
          accentColor={accentColor}
          logo={footer.logo || logo}
          homeHref={homeHref}
        />
      }
    >
      {children}
    </PublicMarketingSiteShell>
  );
}
