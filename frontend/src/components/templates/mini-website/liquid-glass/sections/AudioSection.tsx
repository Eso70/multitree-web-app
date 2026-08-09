import Image from "next/image";
import type { CSSProperties } from "react";
import { Play, Star } from "lucide-react";
import { RailButton, SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl, toneWash } from "../liquid-glass-utils";
import { AUDIO_TONES } from "./section-tokens";
import { audioEmbedSource } from "./section-utils";
import { usePagedItems } from "./use-paged-items";
import { AUDIO_PLATFORM_BADGES } from "@/features/mini-website/extra-section-options";
import type { MiniWebsiteAudio } from "@/features/mini-website/types";

export function AudioSection({
  items,
  interactive,
  tone = SWISS_ACCENT,
  fullPage,
  ...frame
}: {
  items: MiniWebsiteAudio[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = items.filter((item) => item.title.trim() && safeUrl(item.url));
  // Declared before the early return so the hook order never depends on
  // whether a business has any audio.
  const { page, visible, next, previous } = usePagedItems(shown, 1);

  if (!shown.length) return null;

  const [item] = visible;
  const embed = audioEmbedSource(item);
  const direct =
    item.platform === "direct" ||
    /\.(mp3|m4a|aac|ogg|oga|wav|flac)(?:[?#].*)?$/i.test(item.url);
  const audioTone = AUDIO_TONES[page % AUDIO_TONES.length];

  return (
    <SectionFrame tone={tone} fullPage={fullPage} {...frame}>
      {/* One featured episode at a time; the player itself is the hero, so the
          artwork stays a compact tile. */}
      <div className="relative">
        <article
          key={item.id}
          dir="rtl"
          className="flex min-w-0 flex-col overflow-hidden rounded-2xl border p-3.5 transition duration-300 hover:-translate-y-0.5 sm:p-4"
          style={{
            borderColor: toneWash(audioTone, 24),
            background: toneWash(audioTone, 7),
          }}
        >
          <div className="flex items-center gap-3">
            {item.image ? (
              <button
                type="button"
                data-mini-image-src={interactive ? item.image : undefined}
                data-mini-image-alt={item.image ? item.title : undefined}
                data-mini-image-group="audio"
                aria-label={
                  interactive ? `کردنەوەی وێنەی ${item.title}` : undefined
                }
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20 ${
                  interactive
                    ? "cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset"
                    : "cursor-default"
                }`}
                style={
                  interactive
                    ? ({
                        "--tw-ring-color": toneWash(audioTone, 65),
                      } as CSSProperties)
                    : undefined
                }
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ) : (
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl sm:h-20 sm:w-20"
                style={{ background: toneWash(audioTone, 12), color: audioTone }}
              >
                <Play className="h-5 w-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <strong
                className={`block font-black ${
                  fullPage ? "text-lg sm:text-xl" : "text-sm"
                }`}
                dir="auto"
              >
                {item.title}
              </strong>
              <span
                className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black"
                style={{ background: toneWash(audioTone, 14), color: audioTone }}
                dir="ltr"
              >
                {AUDIO_PLATFORM_BADGES[item.platform]}
              </span>
            </span>
          </div>
          {item.description && (
            <p className="mt-2.5 text-[11px] leading-5 opacity-60" dir="auto">
              {item.description}
            </p>
          )}
          {direct ? (
            <audio
              controls
              preload="none"
              src={item.url}
              className="mt-3 h-10 w-full"
              style={{ accentColor: audioTone }}
            >
              Your browser does not support audio playback.
            </audio>
          ) : embed ? (
            <iframe
              title={item.title}
              src={embed}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
              allowFullScreen
              className={`mt-3 w-full border-0 ${
                item.platform === "youtube"
                  ? "aspect-video rounded-xl"
                  : item.platform === "spotify"
                    ? "h-[232px] rounded-xl"
                    : "h-[166px] rounded-xl"
              } ${interactive ? "" : "pointer-events-none"}`}
            />
          ) : (
            <a
              href={interactive ? item.url : undefined}
              target="_blank"
              rel="noreferrer"
              className="mini-glass-action mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-black text-white"
              style={{ backgroundColor: toneWash(audioTone, 78) }}
              data-mini-action={`audio:${item.id}`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play audio
            </a>
          )}
        </article>

        {shown.length > 1 && (
          <>
            <RailButton side="left" label="دەنگی پێشوو" onClick={previous} />
            <RailButton side="right" label="دەنگی دواتر" onClick={next} />
          </>
        )}
      </div>
    </SectionFrame>
  );
}
