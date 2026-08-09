import { useEffect, useState } from "react";
import type { Star } from "lucide-react";
import { Play } from "lucide-react";
import { MotionPulseIcon } from "@/components/motion/MotionPrimitives";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import { SnapRail } from "../ui";
import { useNearViewport } from "@/hooks/useNearViewport";
import {
  VIDEO_PLATFORM_LABELS,
  videoPlayerSource,
  type VideoPlayerSource,
} from "@/features/mini-website/video-links";
import { PLATFORM_BRANDS } from "@/lib/brand/platform-brands";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";
import type { MiniWebsiteVideo } from "@/features/mini-website/types";

export function VideoSection({
  videos,
  acceptsUrl,
  interactive,
  brandLabels = false,
  layout = "rail",
  tone = SWISS_ACCENT,
  ...frame
}: {
  videos: MiniWebsiteVideo[];
  acceptsUrl: (url: string) => boolean;
  interactive: boolean;
  /** Label each card with its platform's own colours instead of the tone. */
  brandLabels?: boolean;
  /** `stack` gives every card the section's full width, one per row. */
  layout?: "rail" | "stack";
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = videos.filter(
    (video) => video.title.trim() && acceptsUrl(video.url),
  );
  if (!shown.length) return null;
  const stacked = layout === "stack" && frame.fullPage;
  return (
    <SectionFrame tone={tone} {...frame}>
      {stacked ? (
        <div className="grid gap-5 sm:gap-6">
          {shown.map((video) => (
            <PlayableVideoCard
              key={video.id}
              video={video}
              interactive={interactive}
              brandLabel={brandLabels}
              full
              tone={tone}
            />
          ))}
        </div>
      ) : (
        <SnapRail
          label="ڤیدیۆکان"
          items={shown}
          renderItem={(video) => (
            <PlayableVideoCard
              video={video}
              interactive={interactive}
              brandLabel={brandLabels}
              tone={tone}
            />
          )}
        />
      )}
    </SectionFrame>
  );
}

function PlayableVideoCard({
  video,
  interactive,
  brandLabel = false,
  full = false,
  tone,
}: {
  video: MiniWebsiteVideo;
  interactive: boolean;
  brandLabel?: boolean;
  full?: boolean;
  tone: string;
}) {
  const directSource = videoPlayerSource(video.url);
  const {
    ref: cardRef,
    isNear: mediaReady,
  } = useNearViewport<HTMLElement>({ rootMargin: "900px 0px" });
  const [remoteSource, setRemoteSource] = useState<{
    input: string;
    source: VideoPlayerSource | null;
  } | null>(null);

  // TikTok's common vm./vt. share links do not contain the numeric post ID
  // required by its player. Its public oEmbed response resolves those links and
  // includes that ID, after which the same official player can be used.
  useEffect(() => {
    if (
      !mediaReady ||
      videoPlayerSource(video.url) ||
      video.platform !== "tiktok"
    )
      return;

    const controller = new AbortController();
    const input = video.url;
    void fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(input)}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw new Error("TikTok embed lookup failed");
        return response.json() as Promise<{ html?: string }>;
      })
      .then((payload) => {
        const id = payload.html?.match(/data-video-id="(\d+)"/)?.[1];
        const source = id
          ? videoPlayerSource(`https://www.tiktok.com/@embed/video/${id}`)
          : null;
        setRemoteSource({ input, source });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setRemoteSource({ input, source: null });
      });

    return () => controller.abort();
  }, [mediaReady, video.platform, video.url]);

  const source =
    directSource ||
    (remoteSource?.input === video.url ? remoteSource.source : null);
  const resolvingTikTok =
    video.platform === "tiktok" &&
    !directSource &&
    remoteSource?.input !== video.url;
  const portrait = source?.aspect === "portrait" || resolvingTikTok;
  const square = source?.aspect === "square";

  return (
    <article
      ref={cardRef}
      className={
        full
          ? // Stacked: the card owns the row, so the player fills the section
            // at every width instead of holding a fixed card size.
            "w-full min-w-0"
          : portrait
            ? "w-[72vw] max-w-[20rem] sm:w-[20rem]"
            : square
              ? "w-[78vw] max-w-[25rem] sm:w-[25rem]"
              : "w-[82vw] max-w-[32rem] sm:w-[58vw] lg:w-[28rem]"
      }
    >
      {!mediaReady ? (
        <div
          className={`${portrait ? "aspect-[9/16]" : square ? "aspect-square" : "aspect-video"} rounded-2xl bg-current/[0.04]`}
          aria-hidden="true"
        />
      ) : source?.kind === "iframe" ? (
        <div
          className={`${portrait ? "aspect-[9/16]" : square ? "aspect-square" : "aspect-video"} overflow-hidden rounded-2xl bg-black`}
        >
          <iframe
            src={source.url}
            title={video.title}
            className="h-full w-full"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : source?.kind === "file" ? (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <video
            src={source.url}
            title={video.title}
            className="h-full w-full object-contain"
            controls
            playsInline
            preload="none"
          />
        </div>
      ) : resolvingTikTok ? (
        <div className="flex aspect-[9/16] items-center justify-center rounded-2xl bg-slate-950 text-white">
          <MotionPulseIcon>
            <Play className="h-11 w-11 opacity-60" />
          </MotionPulseIcon>
        </div>
      ) : (
        <a
          href={interactive ? video.url : undefined}
          onClick={(event) => {
            if (!interactive) event.preventDefault();
          }}
          target={interactive ? "_blank" : undefined}
          rel="noreferrer"
          data-mini-action={`mini:video:${video.id}`}
          className="flex aspect-video items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:opacity-90"
        >
          <Play className="h-11 w-11" />
        </a>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 truncate text-sm font-black" dir="auto">
          {video.title}
        </p>
        {brandLabel ? (
          // Each clip is badged in its own platform's colours — TikTok's black,
          // Instagram's sweep, Facebook's blue. YouTube's mark is the red badge
          // plus the white triangle together, so its brand entry carries a
          // transparent background; it is given a white chip and its near-black
          // label, which is the only pairing that keeps the mark readable.
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ring-slate-900/10"
            style={{
              background:
                PLATFORM_BRANDS[video.platform]?.background === "transparent"
                  ? "#ffffff"
                  : (PLATFORM_BRANDS[video.platform]?.background ?? tone),
              color: PLATFORM_BRANDS[video.platform]?.foreground ?? "#ffffff",
            }}
            dir="ltr"
          >
            <PlatformIcon
              platform={video.platform}
              className="h-3 w-3"
              tone="brand"
            />
            {VIDEO_PLATFORM_LABELS[video.platform]}
          </span>
        ) : (
          <span
            className="shrink-0 text-[10px] font-black"
            style={{ color: tone }}
            dir="ltr"
          >
            {VIDEO_PLATFORM_LABELS[video.platform]}
          </span>
        )}
      </div>
    </article>
  );
}
