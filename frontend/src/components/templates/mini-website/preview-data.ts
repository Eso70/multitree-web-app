import {
  createMiniWebsiteDraft,
  type MiniWebsiteDraft,
} from "@/features/mini-website/types";

const baseDraft = createMiniWebsiteDraft({
  businessLogo: "/images/Logo.jpg",
  businessDefaultAvatar: "/images/Logo.jpg",
  accentColor: "#8ac926",
});

/**
 * Stable, realistic data for template previews.
 *
 * Keeping this outside the templates page means every dashboard renders the
 * same MultiTree example and new template cards can reuse it without copying
 * business data.
 */
export const MULTITREE_MINI_WEBSITE_PREVIEW: MiniWebsiteDraft = {
  ...baseDraft,
  name: "MultiTree",
  slug: "multitree",
  headline: "هەموو ناسنامەی دیجیتاڵییەکانت لە یەک شوێن",
  bio: "مینی وێبسایت و لینک ترییەکی جوان و خێرا بۆ ناساندنی تۆ و کاروبارەکەت.",
  avatar: "/images/Logo.jpg",
  variation: "soft",
  backgroundStyle: "grid",
  professionTemplate: "company",
  accentColor: "linear-gradient(135deg, #8ac926 0%, #16a34a 100%)",
  status: "published",
  primaryAction: "whatsapp",
  whatsappNumber: "9647502485829",
  socialLinks: [
    {
      id: "multitree-whatsapp",
      platform: "whatsapp",
      url: "https://wa.me/9647502485829",
      displayName: "WhatsApp",
      enabled: true,
      order: 0,
    },
    {
      id: "multitree-instagram",
      platform: "instagram",
      url: "https://instagram.com/multitree",
      displayName: "Instagram",
      enabled: true,
      order: 1,
    },
    {
      id: "multitree-telegram",
      platform: "telegram",
      url: "https://t.me/esma3il",
      displayName: "Telegram",
      enabled: true,
      order: 2,
    },
  ],
  sections: [
    { key: "socials", enabled: true },
    { key: "whyChooseUs", enabled: true },
    { key: "services", enabled: true },
    { key: "impactStats", enabled: true },
  ],
  services: [
    {
      id: "multitree-service-mini-website",
      title: "مینی وێبسایت",
      description: "پەڕەیەکی تەواو بۆ ناساندنی کاروبار و خزمەتگوزارییەکانت.",
      price: "",
      image: "",
      actionLabel: "پەیوەندی",
      actionType: "whatsapp",
      actionValue: "7502485829",
      actionCountryCode: "964",
      url: "https://wa.me/9647502485829",
      pixelEvent: "Contact",
    },
    {
      id: "multitree-service-linktree",
      title: "لینک تری",
      description: "هەموو لینکە گرنگەکانت بە دیزاینێکی سادە و خێرا.",
      price: "",
      image: "",
      actionLabel: "زیاتر ببینە",
      actionType: "link",
      actionValue: "https://multitree.net",
      actionCountryCode: "964",
      url: "https://multitree.net",
      pixelEvent: "Contact",
    },
  ],
  advantages: [
    {
      id: "multitree-advantage-trust",
      title: "خێرا و متمانەپێکراو",
      description: "ئەزموونێکی نەرم و خێرا لە هەموو ئامێرەکاندا.",
      icon: "shield",
    },
    {
      id: "multitree-advantage-support",
      title: "پشتیوانیی بەردەوام",
      description: "یارمەتیت دەدەین تا پەڕەکەت بە باشترین شێوە کار بکات.",
      icon: "sparkles",
    },
  ],
  impactStats: [
    {
      id: "multitree-stat-links",
      value: "100",
      label: "لینکی بەکارهێنراو",
      suffix: "+",
      icon: "globe",
    },
    {
      id: "multitree-stat-speed",
      value: "99",
      label: "خێرایی و بەردەستبوون",
      suffix: "%",
      icon: "zap",
    },
  ],
  content: {
    ...baseDraft.content,
    heroBackgroundType: "color",
    heroBackgroundColor:
      "linear-gradient(135deg, #0f172a 0%, #14532d 55%, #8ac926 100%)",
    contactEmail: "hello@multitree.net",
    contactPhone: "7502485829",
    contactPhoneCountryCode: "964",
    socialInstagram: "https://instagram.com/multitree",
    socialTelegram: "https://t.me/esma3il",
    showShareTools: false,
    showViewCount: false,
    allowVcard: false,
    allowInstall: false,
  },
};
