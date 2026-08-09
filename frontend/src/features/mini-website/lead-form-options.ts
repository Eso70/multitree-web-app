import type {
  MiniWebsiteActionType,
  MiniWebsiteLeadFieldMapping,
  MiniWebsiteLeadFieldType,
} from "@linktree/types";

export const LEAD_FIELD_TYPE_LABELS: Record<MiniWebsiteLeadFieldType, string> = {
  text: "دەقی کورت",
  textarea: "دەقی درێژ",
  email: "ئیمەیل",
  phone: "ژمارەی مۆبایل",
  number: "ژمارە",
  select: "لیستی هەڵبژاردن",
  date: "بەروار",
  checkbox: "بەڵێ/نەخێر",
};

export const LEAD_FIELD_MAPPING_LABELS: Record<
  MiniWebsiteLeadFieldMapping,
  string
> = {
  none: "وەڵامێکی ئاسایی",
  name: "ناوی کڕیار",
  email: "ئیمەیلی کڕیار",
  phone: "ژمارەی کڕیار",
};

/**
 * A select's choices are edited as one line each, which is how a business
 * actually thinks about a dropdown, and read back the same way.
 */
export function parseLeadFieldOptions(value: string, max: number): string[] {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ).slice(0, max);
}

export const ACTION_TYPE_LABELS: Record<MiniWebsiteActionType, string> = {
  none: "بێ دوگمە",
  link: "لینک",
  whatsapp: "واتساپ",
  phone: "پەیوەندی تەلەفۆنی",
};
