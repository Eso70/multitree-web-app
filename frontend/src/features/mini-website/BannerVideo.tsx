"use client";

/**
 * A banner video source, resolved to the provider that plays it.
 */
export type BannerVideoSource =
  | { provider: "file"; url: string }
  | { provider: "youtube"; url: string; id: string }
  | { provider: "vimeo"; url: string; id: string };

/** Pulls the video id out of any YouTube URL shape, share links included. */
export function youtubeVideoId(value = ""): string | null {
  const match = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/,
  );
  return match?.[1] ?? null;
}

/** A plain, user-controlled embed — used by the gallery and video sections. */
export function youtubeEmbedUrl(value = ""): string | null {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : null;
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * Resolves a pasted URL to a playable banner source with the provider's own
 * controls turned on — timeline, volume, fullscreen and settings all come from
 * the player itself rather than being reimplemented.
 *
 * Playback still starts muted because every browser blocks autoplay with sound;
 * the viewer unmutes from the player's own volume control.
 */
export function bannerVideoSource(value = ""): BannerVideoSource | null {
  const youtube = youtubeVideoId(value);
  if (youtube) {
    // `loop` is ignored on a single-video embed unless `playlist` repeats the
    // id, and iOS refuses to autoplay without `playsinline`.
    const params = new URLSearchParams({
      rel: "0",
      autoplay: "1",
      mute: "1",
      controls: "1",
      loop: "1",
      playsinline: "1",
      playlist: youtube,
    });
    return {
      provider: "youtube",
      id: youtube,
      url: `https://www.youtube.com/embed/${youtube}?${params}`,
    };
  }

  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo?.[1]) {
    // Deliberately not `background=1`: it strips the controls and hard-mutes
    // the player, which is the opposite of what we want here.
    const params = new URLSearchParams({
      autoplay: "1",
      muted: "1",
      loop: "1",
      controls: "1",
      playsinline: "1",
    });
    return {
      provider: "vimeo",
      id: vimeo[1],
      url: `https://player.vimeo.com/video/${vimeo[1]}?${params}`,
    };
  }

  if (/^https?:\/\/.+\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(value)) {
    return { provider: "file", url: value };
  }
  return isHttpUrl(value) ? { provider: "file", url: value } : null;
}

/**
 * The mini website's hero video, showing the provider's full player.
 *
 * The banner is laid out at 16:9 by the caller when a video is set, so the
 * player fills it exactly. That matters: cropping the frame to cover a
 * fixed-height banner would push the control bar off the bottom edge, and no
 * amount of CSS can letterbox an iframe (`object-fit` does not apply to one)
 * without distorting it.
 */
export function BannerVideo({
  source,
  interactive,
}: {
  source: BannerVideoSource;
  interactive: boolean;
}) {
  if (source.provider === "file") {
    return (
      <video
        src={source.url}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        controls={interactive}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  return (
    <iframe
      src={source.url}
        title="ڤیدیۆی بانەر"
      // Non-interactive previews must not swallow clicks meant for the editor.
      className={`absolute inset-0 h-full w-full border-0 bg-black ${interactive ? "" : "pointer-events-none"}`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      tabIndex={interactive ? undefined : -1}
    />
  );
}
