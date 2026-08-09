import type {
  LinktreePresentation as Linktree,
  LinktreePresentationLink as Link,
} from "@linktree/types";
import type { TemplateKey } from "@/lib/templates/config";
import type { TemplateTheme } from "@/components/templates/types";

export const LINKTREE_TEMPLATE_PREVIEW_THEMES: Record<
  TemplateKey,
  TemplateTheme
> = {
  "colorful-pills": { from: "#ffffff", via: "#ffffff", to: "#ffffff", isSolid: true },
  "mobile-spotlight": { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  "frosted-outline": { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  "aurora-pills": { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  "gentle-flow": { from: "#ffffff", via: "#ffffff", to: "#ffffff", isSolid: true },
  "hero-image": { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  "dark-card": { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
};

function normalizedPhone(value?: string | null) {
  return value?.replace(/\D/g, "") || "9647502485829";
}

export function createBusinessContactPreviewLinks(
  phoneNumber?: string | null,
): Link[] {
  const phone = normalizedPhone(phoneNumber);
  return [
    {
      id: "preview-whatsapp",
      linktree_id: "template-preview",
      display_name: "واتساپ",
      url: `https://wa.me/${phone}`,
      platform: "whatsapp",
      display_order: 1,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "preview-viber",
      linktree_id: "template-preview",
      display_name: "ڤایبەر",
      url: `viber://chat?number=%2B${phone}`,
      platform: "viber",
      display_order: 2,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "preview-phone",
      linktree_id: "template-preview",
      display_name: "ژمارەی مۆبایل",
      url: `tel:${phone}`,
      platform: "phone",
      display_order: 3,
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ];
}

export function createLinktreeTemplatePreview({
  templateId,
  businessName = "MultiTree",
  subtitle,
  description,
  businessLogo = "/images/Logo.jpg",
  phoneNumber,
  accentColor = "#b6f20d",
}: {
  templateId: TemplateKey;
  businessName?: string;
  subtitle?: string | null;
  description?: string | null;
  businessLogo?: string | null;
  phoneNumber?: string | null;
  accentColor?: string;
}): Linktree {
  const templateConfig: Record<string, unknown> = { templateKey: templateId };
  if (templateId === "dark-card") {
    templateConfig.dark_card = {
      desc_title: "زانیاری دەربارەی ئێمە",
      desc_text: "هەموو ڕێگاکانی پەیوەندی لە یەک پەڕەی ڕوون و خێرادا.",
      desc_image: businessLogo,
    };
  }

  return {
    id: `preview-${templateId}`,
    uid: templateId,
    name: businessName,
    subtitle: subtitle || null,
    description:
      description || "بۆ پەیوەندی کردن، کلیک لەم لینکانی خوارەوە بکە",
    image: businessLogo || "/images/DefaultAvatar.png",
    footer_text: businessName,
    footer_phone: normalizedPhone(phoneNumber),
    footer_hidden: false,
    business_website_color: accentColor,
    background_color: null,
    template_config: templateConfig,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}
