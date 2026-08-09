import type { MiniWebsiteVideoPlatform } from "@linktree/types";

export const VIDEO_PLATFORM_LABELS: Record<MiniWebsiteVideoPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  other: "ڤیدیۆی تر",
};

export type VideoPlayerSource = {
  kind: "iframe" | "file";
  url: string;
  aspect: "landscape" | "portrait" | "square";
  provider:
    | "youtube"
    | "tiktok"
    | "instagram"
    | "facebook"
    | "vimeo"
    | "dailymotion"
    | "streamable"
    | "loom"
    | "file";
};

function matches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Converts a public share URL into the provider's browser player.
 *
 * Providers expose different URL shapes, but the section should only need to
 * know whether it is rendering an iframe or a native video file. Returning
 * `null` keeps unknown and non-public pages as safe external links.
 */
export function videoPlayerSource(urlValue: string): VideoPlayerSource | null {
  let url: URL;
  try {
    url = new URL(urlValue.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "youtu.be" || matches(hostname, "youtube.com")) {
    const id =
      hostname === "youtu.be"
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") ||
          url.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]+)/)?.[1];
    if (id && /^[A-Za-z0-9_-]{6,}$/.test(id)) {
      return {
        kind: "iframe",
        url: `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`,
        aspect: url.pathname.includes("/shorts/") ? "portrait" : "landscape",
        provider: "youtube",
      };
    }
  }

  if (matches(hostname, "tiktok.com")) {
    const id = url.pathname.match(
      /\/(?:video|player\/v1|embed\/v2)\/(\d+)/,
    )?.[1];
    if (id) {
      const params = new URLSearchParams({
        controls: "1",
        autoplay: "0",
        description: "1",
        music_info: "1",
        rel: "0",
      });
      return {
        kind: "iframe",
        url: `https://www.tiktok.com/player/v1/${id}?${params}`,
        aspect: "portrait",
        provider: "tiktok",
      };
    }
  }

  if (matches(hostname, "instagram.com")) {
    const match = url.pathname.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (match) {
      const format = match[1] === "reels" ? "reel" : match[1];
      return {
        kind: "iframe",
        url: `https://www.instagram.com/${format}/${match[2]}/embed/`,
        aspect: format === "p" ? "square" : "portrait",
        provider: "instagram",
      };
    }
  }

  if (matches(hostname, "facebook.com") || hostname === "fb.watch") {
    const params = new URLSearchParams({
      href: url.toString(),
      show_text: "false",
      width: "560",
    });
    return {
      kind: "iframe",
      url: `https://www.facebook.com/plugins/video.php?${params}`,
      aspect: url.pathname.includes("/reel/") ? "portrait" : "landscape",
      provider: "facebook",
    };
  }

  if (matches(hostname, "vimeo.com")) {
    const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
    if (id) {
      return {
        kind: "iframe",
        url: `https://player.vimeo.com/video/${id}?playsinline=1`,
        aspect: "landscape",
        provider: "vimeo",
      };
    }
  }

  if (matches(hostname, "dailymotion.com") || hostname === "dai.ly") {
    const id =
      hostname === "dai.ly"
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.pathname.match(/\/(?:embed\/)?video\/([A-Za-z0-9]+)/)?.[1];
    if (id) {
      return {
        kind: "iframe",
        url: `https://www.dailymotion.com/embed/video/${id}`,
        aspect: "landscape",
        provider: "dailymotion",
      };
    }
  }

  if (hostname === "streamable.com") {
    const id = url.pathname.match(/\/(?:e\/)?([A-Za-z0-9]+)/)?.[1];
    if (id) {
      return {
        kind: "iframe",
        url: `https://streamable.com/e/${id}`,
        aspect: "landscape",
        provider: "streamable",
      };
    }
  }

  if (hostname === "loom.com" || hostname === "www.loom.com") {
    const id = url.pathname.match(/\/(?:share|embed)\/([A-Za-z0-9]+)/)?.[1];
    if (id) {
      return {
        kind: "iframe",
        url: `https://www.loom.com/embed/${id}`,
        aspect: "landscape",
        provider: "loom",
      };
    }
  }

  if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(url.toString())) {
    return {
      kind: "file",
      url: url.toString(),
      aspect: "landscape",
      provider: "file",
    };
  }

  return null;
}

export function detectVideoPlatform(
  urlValue: string,
): MiniWebsiteVideoPlatform {
  try {
    const url = new URL(urlValue.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "youtu.be" || matches(hostname, "youtube.com")) {
      return "youtube";
    }
    if (matches(hostname, "tiktok.com")) return "tiktok";
    if (matches(hostname, "instagram.com")) return "instagram";
    if (matches(hostname, "facebook.com")) return "facebook";
  } catch {
    return "other";
  }
  return "other";
}

export function isSecureVideoUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

export function isYoutubeStandardVideoUrl(value: string): boolean {
  const source = videoPlayerSource(value);
  return source?.provider === "youtube" && source.aspect === "landscape";
}

export function isShortFormVideoUrl(value: string): boolean {
  const source = videoPlayerSource(value);
  if (
    source?.aspect === "portrait" &&
    ["youtube", "tiktok", "instagram", "facebook"].includes(source.provider)
  ) {
    return true;
  }
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      url.protocol === "https:" &&
      /^(?:vm|vt)\.tiktok\.com$/.test(hostname) &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}
