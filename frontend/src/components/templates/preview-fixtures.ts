import type {
  LinktreePresentation as Linktree,
  LinktreePresentationLink as Link,
} from "@linktree/types";
import type { TemplateKey } from "@/lib/templates/config";
import type { TemplateTheme } from "@/components/templates/types";

const DEFAULT_PREVIEW_SUBTITLE = "Digital Presence Platform";

export const LINKTREE_TEMPLATE_PREVIEW_THEMES: Record<
  TemplateKey,
  TemplateTheme
> = {
  spectrum: { from: "#ffffff", via: "#ffffff", to: "#ffffff", isSolid: true },
  spotlight: { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  frost: { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  aurora: { from: "#000000", via: "#000000", to: "#000000", isSolid: true },
  serenity: { from: "#ffffff", via: "#ffffff", to: "#ffffff", isSolid: true },
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
  subtitle = DEFAULT_PREVIEW_SUBTITLE,
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
