import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { SPONSOR_KRD_LOGO } from "@/lib/brand/brand-assets";

export function SponsorKrdMarketingFooter({
  accentColor,
}: {
  accentColor: string;
}) {
  return (
    <PublicSiteFooter
      brandName="Sponsor.krd"
      logo={SPONSOR_KRD_LOGO}
      description="Create your digital presence with one simple and secure platform"
      accentColor={accentColor}
      appearance="landing"
      direction="ltr"
      homeHref="/"
      showPoweredBy={false}
      copyrightText={`© ${new Date().getFullYear()} Sponsor.krd All rights reserved`}
      bottomLinks={[
        { label: "Terms", href: "/legal/terms" },
        { label: "Privacy", href: "/legal/privacy" },
      ]}
      columns={[
        {
          title: "Product",
          links: [
            { label: "Linktree", href: "/link-in-bio" },
            { label: "Features", href: "/features" },
            { label: "Templates", href: "/templates" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "Pricing", href: "/pricing" },
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
          ],
        },
        {
          title: "Account",
          links: [
            { label: "Sign up free", href: "/signup" },
            { label: "Sign in", href: "/login" },
          ],
        },
      ]}
    />
  );
}
