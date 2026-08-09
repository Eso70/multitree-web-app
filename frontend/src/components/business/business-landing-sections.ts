export const BUSINESS_LANDING_SECTION_IDS = {
  home: "business-home",
  workspace: "business-public-workspace",
  about: "business-about",
  digitalPresence: "business-digital-presence",
  mobileShowcase: "business-mobile-showcase",
} as const;

export const BUSINESS_LANDING_SECTION_HREFS = {
  home: `#${BUSINESS_LANDING_SECTION_IDS.home}`,
  workspace: `#${BUSINESS_LANDING_SECTION_IDS.workspace}`,
  about: `#${BUSINESS_LANDING_SECTION_IDS.about}`,
  digitalPresence: `#${BUSINESS_LANDING_SECTION_IDS.digitalPresence}`,
  mobileShowcase: `#${BUSINESS_LANDING_SECTION_IDS.mobileShowcase}`,
} as const;

export const BUSINESS_LANDING_DECORATION_LABELS = {
  hero: ["هەموو زانیارییەکانت", "یەک پەڕەی دیگیتاڵی"],
  workspace: ["پەڕە بڵاوکراوەکان", "ناوەڕۆکی ڕێکخراو"],
  trusted: ["هاوبەشە متمانەپێکراوەکان", "براندە هاوکارەکان"],
  about: ["چیرۆکی ئێمە", "پەیوەندیی ڕاستەوخۆ"],
  digitalPresence: ["پێناسی زیرەک", "ئامادەبوونی دیجیتاڵی"],
  mobileShowcase: ["دیزاینی مۆبایل", "هەموو قەبارەی شاشە"],
} as const;

export const BUSINESS_LANDING_DECORATION_COLORS = {
  hero: ["var(--business-accent, var(--multitree-accent))", "#60a5fa"],
  workspace: ["#34d399", "#fbbf24"],
  trusted: ["#a78bfa", "#fb7185"],
  about: ["#22d3ee", "#f97316"],
  digitalPresence: ["#84cc16", "#818cf8"],
  mobileShowcase: ["#14b8a6", "#e879f9"],
} as const;
