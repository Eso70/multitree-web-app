import {
  Banknote,
  CreditCard,
  Landmark,
  WalletCards,
} from "lucide-react";
import { latinDigits } from "@/features/mini-website/hours";
import type {
  MiniWebsiteAudio,
  MiniWebsiteOwnedProperty,
  MiniWebsitePaymentMethod,
} from "@/features/mini-website/types";
import { videoPlayerSource } from "@/features/mini-website/video-links";

export type RecordLine = {
  title: string;
  detail: string;
  third: string;
  fourth: string;
  raw: string;
};

export function withLatinDigits<T>(value: T): T {
  if (typeof value === "string") return latinDigits(value) as T;
  if (Array.isArray(value))
    return value.map((item) => withLatinDigits(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, withLatinDigits(item)]),
    ) as T;
  }
  return value;
}

export function records(value = ""): RecordLine[] {
  const seen = new Set<string>();
  return value
    .split("\n")
    .map((raw) => raw.trim())
    .filter((raw) => {
      if (!raw) return false;
      const key = raw.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((raw) => {
      const [title = "", detail = "", third = "", fourth = ""] = raw
        .split("|")
        .map((part) => part.trim());
      return { title, detail, third, fourth, raw };
    });
}

export function paymentMethodIcon(provider: MiniWebsitePaymentMethod["provider"]) {
  if (provider === "cash") return Banknote;
  if (provider === "bankTransfer") return Landmark;
  if (provider === "qicard") return CreditCard;
  return WalletCards;
}

/**
 * The saved percentage, when both prices are plain amounts.
 *
 * Prices are free text — `٥٠٠٠ دینار`, `50,000 IQD`, `بەخۆڕایی` — so this
 * returns null unless both sides reduce to a number and the offer is genuinely
 * the lower one. A wrong percentage on a business's own promotion is worse
 * than no badge at all, so the accepted band is deliberately narrow.
 */
export function offerDiscount(originalPrice: string, offerPrice: string) {
  const amount = (value: string) => {
    const parsed = Number.parseFloat(
      latinDigits(value).replace(/[^\d.]/g, ""),
    );
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const original = amount(originalPrice);
  const offer = amount(offerPrice);
  if (!original || !offer || offer >= original) return null;
  const percent = Math.round((1 - offer / original) * 100);
  return percent >= 5 && percent <= 95 ? percent : null;
}

export function audioEmbedSource(item: MiniWebsiteAudio): string | null {
  try {
    const url = new URL(item.url);
    if (item.platform === "spotify" && url.hostname.endsWith("spotify.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const typeIndex = parts.findIndex((part) =>
        ["episode", "track", "show", "album", "playlist"].includes(part),
      );
      if (typeIndex >= 0 && parts[typeIndex + 1])
        return `https://open.spotify.com/embed/${parts[typeIndex]}/${parts[typeIndex + 1]}`;
    }
    if (item.platform === "soundcloud")
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(item.url)}&color=%2364748b&auto_play=false&hide_related=true&show_comments=false`;
    if (item.platform === "apple" && url.hostname.includes("apple.com"))
      return `https://embed.${url.hostname.replace(/^www\./, "")}${url.pathname}${url.search}`;
    if (item.platform === "youtube") {
      const source = videoPlayerSource(item.url);
      return source?.kind === "iframe" ? source.url : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function ownedPropertyEmbed(
  property: MiniWebsiteOwnedProperty,
): { src: string; aspect: string; title: string } | null {
  const preferred = property.featuredUrl || property.url;
  try {
    const url = new URL(preferred);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (
      property.propertyType === "facebook" &&
      (hostname === "facebook.com" || hostname.endsWith(".facebook.com"))
    ) {
      const featured = Boolean(property.featuredUrl);
      const plugin = featured ? "post.php" : "page.php";
      const query = new URLSearchParams({
        href: preferred,
        width: "500",
        height: featured ? "420" : "360",
        show_text: "true",
        hide_cover: "false",
        show_facepile: "false",
      });
      if (!featured) query.set("tabs", "timeline");
      return {
        src: `https://www.facebook.com/plugins/${plugin}?${query.toString()}`,
        aspect: featured ? "h-[420px]" : "h-[360px]",
        title: `${property.name} لە Facebook`,
      };
    }

    if (
      property.propertyType === "instagram" &&
      property.featuredUrl &&
      (hostname === "instagram.com" || hostname.endsWith(".instagram.com"))
    ) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["p", "reel", "tv"].includes(parts[0]) && parts[1])
        return {
          src: `https://www.instagram.com/${parts[0]}/${parts[1]}/embed/`,
          aspect: "h-[480px]",
          title: `${property.name} لە Instagram`,
        };
    }

    if (property.propertyType === "youtube") {
      if (property.featuredUrl) {
        const source = videoPlayerSource(property.featuredUrl);
        if (source?.kind === "iframe")
          return {
            src: source.url,
            aspect: "aspect-video",
            title: `${property.name} لە YouTube`,
          };
        const playlistId = url.searchParams.get("list");
        if (playlistId)
          return {
            src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`,
            aspect: "aspect-video",
            title: `لیستی پەخشی ${property.name}`,
          };
      } else {
        const parts = url.pathname.split("/").filter(Boolean);
        const channelIndex = parts.indexOf("channel");
        const channelId =
          channelIndex >= 0 ? parts[channelIndex + 1] : undefined;
        if (channelId?.startsWith("UC"))
          return {
            src: `https://www.youtube-nocookie.com/embed/videoseries?list=UU${encodeURIComponent(channelId.slice(2))}`,
            aspect: "aspect-video",
            title: `بارکراوەکانی ${property.name}`,
          };
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * The address a browser would show for this page, split into the part that
 * proves who it is and the part that names the page.
 *
 * Read from the URL itself rather than from the business's chosen category:
 * the host is what makes the mockup read as authentic — a visitor recognises
 * `facebook.com` before they read anything else — and a category can disagree
 * with the link actually pasted.
 */
export function ownedPropertyAddress(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    const path = `${url.pathname}${url.search}`.replace(/\/$/, "");
    return { host, path, secure: url.protocol === "https:" };
  } catch {
    return null;
  }
}
