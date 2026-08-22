import type {
  MiniWebsiteActionType,
  MiniWebsiteLeadField,
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

/**
 * Gives a CRM slot to one question by taking it off whichever other question
 * was holding it.
 *
 * A mapping decides which encrypted contact column an answer lands in, so the
 * server gives each one to a single question and demotes every later claim.
 * The editor used to allow two questions to claim the same slot and said
 * nothing, so a business could save a form it believed collected an email
 * address twice and silently get one. Moving the claim here means there is
 * never a duplicate for the server to demote.
 *
 * `none` is not a slot, so any number of questions may hold it.
 */
export function claimLeadFieldMapping(
  fields: readonly MiniWebsiteLeadField[],
  index: number,
  mapping: MiniWebsiteLeadFieldMapping,
): MiniWebsiteLeadField[] {
  return fields.map((field, position) => {
    if (position === index) return { ...field, mapping };
    return mapping !== "none" && field.mapping === mapping
      ? { ...field, mapping: "none" as const }
      : field;
  });
}

export const ACTION_TYPE_LABELS: Record<MiniWebsiteActionType, string> = {
  none: "بێ دوگمە",
  link: "لینک",
  whatsapp: "واتساپ",
  phone: "پەیوەندی تەلەفۆنی",
};
