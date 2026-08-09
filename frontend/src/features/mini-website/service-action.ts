import type { MiniWebsiteActionType, MiniWebsiteService } from "@linktree/types";

/**
 * Where an offer's button goes.
 *
 * The server builds and stores this, and a saved offer arrives with `url`
 * already filled in. The same rules are repeated here for one reason: the
 * editor's live preview has to show a working button before the page has ever
 * been saved. Keep the two in step — `buildActionUrl` in `mini-websites.service.ts`
 * is the authority.
 */
export function serviceActionHref(service: MiniWebsiteService): string {
  if (service.url) return service.url;
  return buildActionHref(
    service.actionType,
    service.actionValue,
    service.actionCountryCode,
  );
}

export function buildActionHref(
  type: MiniWebsiteActionType,
  value: string,
  countryCode: string,
): string {
  const entry = value.trim();
  if (type === "none" || !entry) return "";
  if (type === "link") return /^https?:\/\//i.test(entry) ? entry : "";
  const digits = entry.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  const full = `${countryCode.replace(/\D/g, "") || "964"}${digits}`;
  return type === "whatsapp" ? `https://wa.me/${full}` : `tel:+${full}`;
}

/**
 * The default wording for a button, chosen from what it does.
 *
 * Prefilled the way a social link's display name is: the field is still free
 * text, but nobody has to invent "داواکاری لە واتساپ" from scratch, and a page
 * left untouched still reads as though it was written on purpose.
 */
export const ACTION_LABEL_DEFAULTS: Record<MiniWebsiteActionType, string> = {
  none: "",
  whatsapp: "داواکاری لە واتساپ",
  phone: "پەیوەندی بکە",
  link: "کردنەوە",
};

/** True when a label is one of the defaults, so replacing it loses nothing. */
export function isDefaultActionLabel(label: string): boolean {
  const value = label.trim();
  return !value || Object.values(ACTION_LABEL_DEFAULTS).includes(value);
}

/** The label to show on a button, falling back to the default for its type. */
export function actionLabelFor(service: MiniWebsiteService): string {
  return service.actionLabel.trim() || ACTION_LABEL_DEFAULTS[service.actionType];
}

/** The platform key the shared phone input expects for each action type. */
export function actionInputPlatform(type: MiniWebsiteActionType): string {
  return type === "phone" ? "phone" : "whatsapp";
}
