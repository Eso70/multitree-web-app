import type { MiniWebsiteOwnedPropertyType } from "@linktree/types";

export const OWNED_PROPERTY_TYPE_LABELS: Record<
  MiniWebsiteOwnedPropertyType,
  string
> = {
  brand: "براند",
  company: "کۆمپانیا",
  shop: "دووکان",
  organization: "دامەزراوە",
  facebook: "پەڕەی Facebook",
  instagram: "هەژماری Instagram",
  youtube: "کەناڵی YouTube",
  website: "وێبسایت",
  other: "جۆرێکی تر",
};

export function detectOwnedPropertyType(
  value: string,
): MiniWebsiteOwnedPropertyType | null {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "facebook.com" || hostname.endsWith(".facebook.com"))
      return "facebook";
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com"))
      return "instagram";
    if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be"
    )
      return "youtube";
    if (url.protocol === "https:" || url.protocol === "http:") return "website";
  } catch {
    return null;
  }
  return null;
}

export function ownedPropertyButtonLabel(
  type: MiniWebsiteOwnedPropertyType,
): string {
  if (type === "facebook") return "سەردانی پەڕەی Facebook";
  if (type === "instagram") return "سەردانی Instagram";
  if (type === "youtube") return "سەردانی کەناڵی YouTube";
  if (type === "shop") return "سەردانی دووکان";
  if (type === "company") return "سەردانی کۆمپانیا";
  if (type === "organization") return "سەردانی دامەزراوە";
  if (type === "brand") return "سەردانی براند";
  return "سەردانی پەڕەی فەرمی";
}
