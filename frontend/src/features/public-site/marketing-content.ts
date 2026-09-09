export interface MarketingFeature {
  id: string;
  title: string;
  description: string;
  icon: "palette" | "chart" | "mobile" | "shield" | "megaphone" | "link";
}

export interface MarketingProduct {
  id: "linktree";
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  bullets: string[];
}

export interface MarketingFaq {
  question: string;
  answer: string;
}

export const MARKETING_NAVIGATION = [
  { label: "تایبەتمەندییەکان", href: "/features" },
  { label: "قاڵبەکان", href: "/templates" },
  { label: "نرخەکان", href: "/pricing" },
  { label: "دەربارە", href: "/about" },
] as const;

export const MARKETING_PRODUCTS: MarketingProduct[] = [
  {
    id: "linktree",
    eyebrow: "خێرا و سادە",
    title: "Linktree",
    description:
      "هەموو بەستەر و کەناڵەکانت لە پەڕەیەکی خێرا، جوان و گونجاو بۆ ڕیکلامی تۆڕە کۆمەڵایەتییەکان کۆبکەرەوە",
    href: "/link-in-bio",
    bullets: ["بەستەری تایبەت", "دیزاینی مۆبایل", "ئاماری بینین و کلیک"],
  },
];

export const MARKETING_FEATURES: MarketingFeature[] = [
  {
    id: "brand",
    title: "ناسنامەی تایبەت",
    description: "ڕەنگ، وێنە، پاشبنەما و قاڵبەکەت بە شێوەی خۆت ڕێکبخە",
    icon: "palette",
  },
  {
    id: "mobile",
    title: "بۆ مۆبایل دروستکراوە",
    description: "هەموو پەڕەکان خێرا و ڕیسپۆنسیڤن لەسەر هەر قەبارەیەک",
    icon: "mobile",
  },
  {
    id: "analytics",
    title: "ئاماری ڕوون",
    description: "بینەر، کلیک و کردارە گرنگەکان بە ئاسانترین شێوە ببینە",
    icon: "chart",
  },
  {
    id: "ads",
    title: "ئامادەی ڕیکلام",
    description: "بۆ لاندینگ پەیجی TikTok و کمپەینە دیجیتاڵییەکان بەکاریبهێنە",
    icon: "megaphone",
  },
  {
    id: "url",
    title: "بەستەری sponsor.krd",
    description: "ناوێکی کورت و ئاسان بۆ هاوبەشکردن و لەبیرکردن هەڵبژێرە",
    icon: "link",
  },
  {
    id: "secure",
    title: "پارێزراو و جێگیر",
    description:
      "هەژمار و پەڕەکان بە پشتڕاستکردنەوە و سنووری دەستگەیشتن دەپارێزرێن",
    icon: "shield",
  },
];

export const MARKETING_STEPS = [
  {
    number: "01",
    title: "هەژمارەکەت پشتڕاست بکەرەوە",
    description: "بە ئیمەیڵ و ژمارەی مۆبایل هەژمارێکی پارێزراو دروست بکە",
  },
  {
    number: "02",
    title: "پەڕەکەت دروست بکە",
    description: "Linktree ـێکی جوان و خێرا بۆ بەستەر و کەناڵەکانت دروست بکە",
  },
  {
    number: "03",
    title: "دیزاین و بڵاوی بکەرەوە",
    description: "ناوەڕۆک زیاد بکە و بەستەرەکەت لە هەموو شوێنێک هاوبەش بکە",
  },
] as const;

export const MARKETING_USE_CASES = [
  "دروستکەری ناوەڕۆک و ئینفلۆنسەر",
  "بزنس و فرۆشگای بچووک",
  "کمپەینی ڕیکلامی و لاندینگ پەیج",
  "پسپۆڕ، هونەرمەند و پۆرتفۆلیۆ",
  "ئاژانس و بەڕێوەبەری کڕیار",
] as const;

export const MARKETING_FAQS: MarketingFaq[] = [
  {
    question: "Linktree چییە؟",
    answer:
      "پەڕەیەکی خێرا و گونجاو بۆ مۆبایلە کە هەموو بەستەر و کردارە گرنگەکانت لە یەک شوێن کۆدەکاتەوە",
  },
  {
    question: "تاقیکردنەوە کەی دەست پێدەکات؟",
    answer:
      "کاتێک یەکەم پەڕەکەت دروست دەکەیت؛ دروستکردنی هەژمار بە تەنها ماوەکە دەست پێناکات",
  },
  {
    question: "بۆ ڕیکلامی TikTok گونجاوە؟",
    answer:
      "بەڵێ، پەڕەکان mobile-first ـن و دەتوانرێن وەک لاندینگ پەیجی کمپەین بەکاربهێنرێن",
  },
  {
    question: "دوای تەواوبوونی تاقیکردنەوە چی ڕوودەدات؟",
    answer:
      "دەبێت بەشدارییەکەت چالاک بکەیت؛ لە ماوەی grace پەڕەکە بەردەستە بەڵام دەستکاریکردن داخراوە",
  },
];

export const MOCK_TEMPLATES = [
  { name: "TikTok Cyan", type: "Linktree", tone: "#25F4EE" },
  { name: "Midnight Profile", type: "Linktree", tone: "#17191b" },
  { name: "Branch Signal", type: "Linktree", tone: "#7c3aed" },
  { name: "Warm Links", type: "Linktree", tone: "#f59e0b" },
] as const;
