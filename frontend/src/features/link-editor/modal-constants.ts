import {
  LINKTREE_DEFAULT_DESCRIPTION,
  LINKTREE_DEFAULT_FOOTER_PHONE,
  LINKTREE_DEFAULT_FOOTER_TEXT,
  LINKTREE_DEFAULT_SUBTITLE,
} from "@linktree/types";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import {
  COUNTRY_DIAL_CODES,
  COUNTRY_DIAL_CODES_SORTED,
} from "@/lib/constants/country-codes";

/**
 * Platforms offered by the link editor, in display order. Names, glyphs and
 * colors are resolved from the shared brand registry so the editor, the public
 * page and the mini website can never drift apart.
 */
const EDITOR_PLATFORM_IDS = [
  "whatsapp",
  "viber",
  "telegram",
  "phone",
  "instagram",
  "facebook",
  "twitter",
  "tiktok",
  "youtube",
  "linkedin",
  "snapchat",
  "discord",
  "email",
  "gps",
  "custom",
] as const;

/** Editor-specific labels where the brand's own name is too terse for the form. */
const EDITOR_LABEL_OVERRIDES: Record<string, string> = {
  phone: "Phone Number",
  twitter: "Twitter / X",
  custom: "Custom Link",
};

export const SOCIAL_PLATFORMS = EDITOR_PLATFORM_IDS.map((id) => {
  const brand = getPlatformBrand(id);
  return {
    id: brand.id,
    name: EDITOR_LABEL_OVERRIDES[id] ?? brand.name,
    icon: brand.icon,
    /** CSS `background` — solid for most brands, a gradient where the brand has one. */
    background: brand.background,
  };
});

// Countries list — one shared source, see lib/constants/country-codes.ts for
// why a second, shorter copy of this was a data-corruption bug.
export const COUNTRIES = COUNTRY_DIAL_CODES;

// Sort countries by code length descending for proper prefix matching
export const COUNTRIES_SORTED = COUNTRY_DIAL_CODES_SORTED;

// Background colors - Mix of gradients and solid colors
export const BACKGROUND_COLORS = [
  { id: "default", name: "Default", gradient: "from-[#713f12] via-[#eab308] to-[#854d0e]", value: "#eab308", isSolid: false },
  { id: "multitree-lime", name: "MultiTree Lime", gradient: "from-[#203000] via-[#b6f20d] to-[#ecffc2]", value: "#b6f20d", isSolid: false },
  { id: "blue", name: "Blue", gradient: "from-blue-900 via-blue-800 to-blue-900", value: "#1e40af", isSolid: false },
  { id: "green", name: "Green", gradient: "from-green-900 via-green-800 to-green-900", value: "#166534", isSolid: false },
  { id: "orange", name: "Orange", gradient: "from-orange-900 via-orange-800 to-orange-900", value: "#c2410c", isSolid: false },
  { id: "cyan", name: "Cyan", gradient: "from-cyan-900 via-cyan-800 to-cyan-900", value: "#164e63", isSolid: false },
  { id: "indigo", name: "Indigo", gradient: "from-indigo-900 via-indigo-800 to-indigo-900", value: "#312e81", isSolid: false },
  { id: "teal", name: "Teal", gradient: "from-teal-900 via-teal-800 to-teal-900", value: "#134e4a", isSolid: false },
  { id: "yellow", name: "Yellow", gradient: "from-yellow-900 via-yellow-800 to-yellow-900", value: "#854d0e", isSolid: false },
  { id: "rose", name: "Rose", gradient: "from-rose-900 via-rose-800 to-rose-900", value: "#9f1239", isSolid: false },
  { id: "emerald", name: "Emerald", gradient: "from-emerald-900 via-emerald-800 to-emerald-900", value: "#064e3b", isSolid: false },
  { id: "violet", name: "Violet", gradient: "from-violet-900 via-violet-800 to-violet-900", value: "#4c1d95", isSolid: false },
  { id: "fuchsia", name: "Fuchsia", gradient: "from-fuchsia-900 via-fuchsia-800 to-fuchsia-900", value: "#701a75", isSolid: false },
  { id: "coral-sunset", name: "Coral Sunset", gradient: "from-[#2b1055] via-[#ff6f61] to-[#ffd166]", value: "#ff6f61", isSolid: false },
  { id: "aurora", name: "Aurora", gradient: "from-[#0b1224] via-[#0ea5e9] to-[#9333ea]", value: "#0ea5e9", isSolid: false },
  { id: "mint-glow", name: "Mint Glow", gradient: "from-[#0f172a] via-[#14b8a6] to-[#a3e635]", value: "#14b8a6", isSolid: false },
  { id: "royal-bloom", name: "Royal Bloom", gradient: "from-[#1e1b4b] via-[#9333ea] to-[#f472b6]", value: "#9333ea", isSolid: false },
  { id: "blush-gold", name: "Blush Gold", gradient: "from-[#2f1553] via-[#f472b6] to-[#facc15]", value: "#f472b6", isSolid: false },
  { id: "ice-drift", name: "Ice Drift", gradient: "from-[#0f172a] via-[#38bdf8] to-[#7c3aed]", value: "#38bdf8", isSolid: false },
  { id: "pure-white", name: "White", gradient: "", value: "#ffffff", isSolid: true },
  { id: "pure-black", name: "Black", gradient: "", value: "#000000", isSolid: true },
  { id: "silver", name: "Silver", gradient: "from-gray-300 via-gray-200 to-gray-300", value: "#d1d5db", isSolid: false },
  { id: "gray", name: "Gray", gradient: "from-gray-600 via-gray-500 to-gray-600", value: "#4b5563", isSolid: false },
  { id: "charcoal", name: "Charcoal", gradient: "from-gray-900 via-gray-800 to-gray-900", value: "#111827", isSolid: false },
  { id: "sky-blue", name: "Sky Blue", gradient: "from-sky-600 via-sky-500 to-sky-600", value: "#0284c7", isSolid: false },
  { id: "lime", name: "Lime", gradient: "from-lime-600 via-lime-500 to-lime-600", value: "#65a30d", isSolid: false },
  { id: "amber", name: "Amber", gradient: "from-amber-600 via-amber-500 to-amber-600", value: "#d97706", isSolid: false },
  { id: "slate", name: "Slate", gradient: "from-slate-700 via-slate-600 to-slate-700", value: "#475569", isSolid: false },
  { id: "ocean", name: "Ocean", gradient: "from-blue-600 via-cyan-500 to-teal-600", value: "#0891b2", isSolid: false },
  { id: "sunset", name: "Sunset", gradient: "from-orange-500 via-pink-500 to-rose-500", value: "#f97316", isSolid: false },
  { id: "forest", name: "Forest", gradient: "from-green-700 via-emerald-600 to-teal-700", value: "#15803d", isSolid: false },
  { id: "lavender", name: "Lavender", gradient: "from-purple-400 via-violet-400 to-fuchsia-400", value: "#a855f7", isSolid: false },
  { id: "midnight", name: "Midnight", gradient: "from-slate-900 via-indigo-900 to-purple-900", value: "#1e293b", isSolid: false },
];

// Default values, shared with the server-side default-page seeder so both
// paths produce the same page.
// `subtitle` is the short tagline shown directly under the page name (e.g.
// "Brand owner and retail manager"). `description` is the longer helper text
// shown beneath it (e.g. "click the links below").
export const DEFAULT_SUBTITLE = LINKTREE_DEFAULT_SUBTITLE;
export const DEFAULT_DESCRIPTION = LINKTREE_DEFAULT_DESCRIPTION;
export const DEFAULT_FOOTER_TEXT = LINKTREE_DEFAULT_FOOTER_TEXT; // Clickable footer name, opens WhatsApp
export const DEFAULT_FOOTER_PHONE = LINKTREE_DEFAULT_FOOTER_PHONE;

// Kurdish platform names mapping
export function getPlatformNameKurdish(platform: string): string {
  const names: Record<string, string> = {
    whatsapp: "واتساپ",
    telegram: "تیلیگڕام",
    viber: "ڤایبەر",
    phone: "ژمارەی مۆبایل",
    instagram: "ئینستاگرام",
    facebook: "فەیسبووک",
    twitter: "تویتەر / ئێکس",
    linkedin: "لینکدئین",
    snapchat: "سناپچات",
    tiktok: "تیکتۆک",
    youtube: "یوتیوب",
    discord: "دیسکۆرد",
    email: "ئیمەیڵ",
    website: "وێبسایت",
    gps: "شوێن",
    custom: "لینکی دیکە",
  };

  return names[platform] || platform;
}
