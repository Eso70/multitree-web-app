"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { youtubeVideoId } from "@/features/mini-website/BannerVideo";

const TUTORIAL_VIDEO_SRC = "/images/advertising/extracting-tiktok-code-video.MP4";

interface AdvertisingVideoPlayerProps {
  /** "full" is used on the dedicated video page; "compact" fits inside the phone mockup in the guide. */
  size?: "compact" | "full";
  className?: string;
  /** Overrides the bundled default video (e.g. a business-uploaded video or a YouTube link). */
  src?: string;
}

/**
 * Shared TikTok code-extraction video player: no native controls or play
 * button until the visitor taps the custom centered play button, then plays
 * unmuted at full volume (a real user gesture, so browsers allow it), with
 * download/playback-rate/picture-in-picture stripped from the controls menu.
 *
 * A YouTube link resolves to a standard embed instead; the provider's own
 * player handles playback with its own thumbnail and controls.
 */
export function AdvertisingVideoPlayer({ size = "compact", className, src }: AdvertisingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoSrc = src || TUTORIAL_VIDEO_SRC;
  const youtubeId = youtubeVideoId(videoSrc);

  if (youtubeId) {
    return (
      <div className={cn("relative h-full w-full bg-black", className)}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&playsinline=1`}
          title="ڤیدیۆی فێرکاری"
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  const play = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    void el.play();
    setIsPlaying(true);
  };

  const buttonSizeClass = size === "full" ? "h-20 w-20" : "h-14 w-14";
  const iconSizeClass = size === "full" ? "h-9 w-9" : "h-6 w-6";

  return (
    <div className={cn("relative h-full w-full bg-black", className)}>
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        controls={isPlaying}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={play}
          aria-label="لێدانی ڤیدیۆ"
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/35"
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105",
              buttonSizeClass,
            )}
          >
            <Play
              className={cn("ms-0.5", iconSizeClass)}
              fill="currentColor"
              style={{ color: "var(--business-website-color, var(--theme-primary, var(--multitree-accent)))" }}
            />
          </span>
        </button>
      )}
    </div>
  );
}
