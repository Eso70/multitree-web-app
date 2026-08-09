import Image from "next/image";
import type { Star } from "lucide-react";
import { RailButton, SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import { usePagedItems } from "./use-paged-items";
import type { MiniWebsiteGalleryImage } from "@/features/mini-website/types";

const GALLERY_PER_PAGE = 4;

export function GallerySection({
  images,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  images: MiniWebsiteGalleryImage[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = images.filter((image) => image.image);
  const { pageCount, start, visible, next, previous } = usePagedItems(
    shown,
    GALLERY_PER_PAGE,
  );

  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="relative">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {visible.map((image, imageIndex) => (
            <button
              type="button"
              key={image.id || image.image}
              data-mini-image-src={interactive ? image.image : undefined}
              data-mini-image-alt={
                interactive
                  ? image.caption || `وێنەی ${start + imageIndex + 1}`
                  : undefined
              }
              data-mini-image-group="gallery"
              aria-label={image.caption || `وێنەی ${start + imageIndex + 1}`}
              className={`group relative aspect-[4/3] overflow-hidden rounded-2xl transition duration-300 hover:opacity-90 ${interactive ? "cursor-pointer" : "cursor-default"}`}
            >
              <Image
                src={image.image}
                alt={image.caption || `وێنەی ${start + imageIndex + 1}`}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                unoptimized
              />
              {image.caption && (
                <span
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-3.5 pt-10 text-right text-[11px] font-black text-white sm:text-xs"
                  dir="auto"
                >
                  {image.caption}
                </span>
              )}
            </button>
          ))}
        </div>

        {pageCount > 1 && (
          <>
            <RailButton side="left" label="گەلەری — پێشوو" onClick={previous} />
            <RailButton side="right" label="گەلەری — دواتر" onClick={next} />
          </>
        )}
      </div>
    </SectionFrame>
  );
}