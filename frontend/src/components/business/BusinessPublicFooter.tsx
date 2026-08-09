import { PublicSiteFooter, type PublicFooterColumn } from "@/components/public/PublicSiteFooter";

interface BusinessPublicFooterPage {
  name: string;
  href: string;
}

export interface BusinessPublicFooterProps {
  businessName: string;
  logo?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsappEnabled?: boolean | null;
  accentColor: string;
  linktrees?: BusinessPublicFooterPage[];
  miniWebsites?: BusinessPublicFooterPage[];
  homeHref?: string;
  /**
   * Whether this business has a live advertising page. Plans below the top one
   * do not, and those two routes 404 for them — a footer link to a dead page is
   * worse than no link.
   */
  advertisingEnabled?: boolean;
  /**
   * Ultra pays to drop the "Powered by MultiTree" badge. Read from the live
   * entitlement, so a downgrade puts the badge back.
   */
  brandingRemoved?: boolean;
}

function normalizePhone(value?: string | null) {
  const display = value?.trim() || "";
  const tel = display.replace(/[^+\d]/g, "");
  const whatsapp = display.replace(/\D/g, "");
  return {
    display,
    telHref: tel.length >= 5 ? `tel:${tel}` : null,
    whatsappHref: whatsapp.length >= 8 ? `https://wa.me/${whatsapp}` : null,
  };
}

export function BusinessPublicFooter({
  businessName,
  logo,
  description,
  phone: phoneValue,
  whatsappEnabled,
  accentColor,
  linktrees = [],
  miniWebsites = [],
  homeHref,
  advertisingEnabled = false,
  brandingRemoved = false,
}: BusinessPublicFooterProps) {
  const phone = normalizePhone(phoneValue);
  const columns: PublicFooterColumn[] = [];

  const pageLinks: BusinessPublicFooterPage[] = [];
  if (homeHref) pageLinks.push({ name: "Home", href: homeHref });
  if (advertisingEnabled) {
    pageLinks.push({ name: "Advertise", href: "/advertising" });
    pageLinks.push({ name: "Video page", href: "/advertising/video-code" });
  }
  // Without the advertising links this column can end up empty, and a heading
  // over nothing reads as a rendering fault.
  if (pageLinks.length > 0) {
    columns.push({
      title: "Pages",
      links: pageLinks.map((page) => ({ label: page.name, href: page.href })),
    });
  }
  if (linktrees.length > 0) {
    columns.push({
      title: "Public pages",
      links: linktrees.slice(0, 5).map((page) => ({
        label: page.name,
        href: page.href,
      })),
    });
  }
  if (miniWebsites.length > 0) {
    columns.push({
      title: "Websites",
      links: miniWebsites.slice(0, 5).map((page) => ({
        label: page.name,
        href: page.href,
      })),
    });
  }
  if (phone.telHref) {
    columns.push({
      title: "Contact",
      links: [
        { label: phone.display, href: phone.telHref },
        ...(whatsappEnabled && phone.whatsappHref
          ? [
              {
                label: "WhatsApp",
                href: phone.whatsappHref,
                external: true,
              },
            ]
          : []),
      ],
    });
  }

  return (
    <PublicSiteFooter
      showPoweredBy={!brandingRemoved}
      brandName={businessName}
      logo={logo}
      description={
        description?.trim() || `${businessName}'s official public website.`
      }
      accentColor={accentColor}
      appearance="landing"
      columns={columns}
      homeHref={homeHref}
      copyrightText={`© ${new Date().getFullYear()} ${businessName}. All rights reserved.`}
    />
  );
}
