import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";

export function HomeFooter() {
  return (
    <PublicSiteFooter
      brandName="MultiTree"
      logo="/images/Logo.jpg"
      description="One secure platform for branded public pages, tenant management, and meaningful link analytics."
      accentColor="var(--multitree-accent)"
      appearance="adaptive"
      homeHref="/"
      showPoweredBy={false}
      copyrightText={`© ${new Date().getFullYear()} MultiTree. All rights reserved.`}
      columns={[
        {
          title: "Product",
          links: [
            { label: "Features", href: "/#features" },
            { label: "Solutions", href: "/#solutions" },
            { label: "Pricing", href: "/#pricing" },
          ],
        },
        {
          title: "Access",
          links: [
            { label: "Sign in", href: "/login" },
            { label: "Business sign in", href: "/business/login" },
          ],
        },
        {
          title: "Platform",
          links: [
            { label: "Multi-tenant subdomains" },
            { label: "Custom branding & templates" },
            { label: "Real-time link analytics" },
            { label: "TikTok Pixel & Events API" },
          ],
        },
      ]}
    />
  );
}
