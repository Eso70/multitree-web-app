import type {
  MiniWebsiteAdvantageIcon,
  MiniWebsiteAudioPlatform,
} from "@linktree/types";

export const AUDIO_PLATFORM_LABELS: Record<MiniWebsiteAudioPlatform, string> = {
  direct: "فایلی دەنگی ڕاستەوخۆ",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  apple: "Apple Podcasts / Music",
  youtube: "YouTube",
  other: "پەڕەیەکی تری دەنگ",
};

/**
 * Short English metadata badges for the audio artwork. The saved label map
 * above is for the editor; on the public page the platform reads as metadata,
 * so it renders in English and stays brand-true.
 */
export const AUDIO_PLATFORM_BADGES: Record<MiniWebsiteAudioPlatform, string> = {
  direct: "Direct file",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  apple: "Apple",
  youtube: "YouTube",
  other: "Audio",
};

export const ADVANTAGE_ICON_LABELS: Record<MiniWebsiteAdvantageIcon, string> = {
  check: "کوالێتی",
  shield: "متمانە و پاراستن",
  clock: "وەڵامدانەوەی خێرا",
  award: "ئەزموون",
  heart: "گرنگیدان",
  users: "گرنگیدان بە کڕیار",
  sparkles: "نایابی",
  leaf: "بەردەوامی",
  zap: "خێرایی",
  globe: "داپۆشینی فراوان",
};
