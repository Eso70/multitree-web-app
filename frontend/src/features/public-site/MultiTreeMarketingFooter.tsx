import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { MULTITREE_LOGO } from "@/lib/brand/brand-assets";

export function MultiTreeMarketingFooter({
  accentColor,
}: {
  accentColor: string;
}) {
  return (
    <PublicSiteFooter
      brandName="MultiTree"
      logo={MULTITREE_LOGO}
      description="Create your digital presence with one simple and secure platform"
      accentColor={accentColor}
      appearance="landing"
      direction="ltr"
      homeHref="/"
      showPoweredBy={false}
      copyrightText={`© ${new Date().getFullYear()} MultiTree All rights reserved`}
      bottomLinks={[
        { label: "Terms", href: "/legal/terms" },
        { label: "Privacy", href: "/legal/privacy" },
      ]}
      columns={[
        {
          title: "Product",
          links: [
            { label: "Linktree", href: "/link-in-bio" },
            { label: "Mini Website", href: "/mini-website" },
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
