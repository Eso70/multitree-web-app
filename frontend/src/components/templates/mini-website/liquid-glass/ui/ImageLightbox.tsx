"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion } from "motion/react";
import { latinDigits } from "@/features/mini-website/hours";

export type LightboxImage = {
  src: string;
  alt: string;
};

/**
 * Full-screen viewer for every `[data-mini-image-src]` trigger on the page.
 * Arrow keys and edge swipes page through a group; Escape or the backdrop
 * closes it.
 */
export function ImageLightbox({
  images,
  index,
  accent,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  accent: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const current = images[index];
  const hasMultiple = images.length > 1;
  const move = useCallback(
    (direction: -1 | 1) => {
      if (!images.length) return;
      onIndexChange((index + direction + images.length) % images.length);
    },
    [images.length, index, onIndexChange],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [move, onClose]);

  if (!current) return null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="پیشاندانی وێنە"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/[0.82] p-3 text-white backdrop-blur-xl sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 45)
          return;
        move(end > start ? -1 : 1);
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 sm:p-5">
        <span className="rounded-full bg-black/45 px-3 py-2 text-xs font-black backdrop-blur-md">
          {latinDigits(`${index + 1} / ${images.length}`)}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/45 transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="داخستن"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        className="relative h-full w-full max-w-[96rem]"
        onMouseDown={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image
          src={current.src}
          alt={current.alt || "وێنە"}
          fill
          className="object-contain"
          sizes="100vw"
          unoptimized
          priority
        />
      </motion.div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 shadow-lg backdrop-blur-xl transition duration-300 hover:scale-[1.025] hover:bg-white/90 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6 sm:h-14 sm:w-14"
            aria-label="وێنەی پێشوو"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 shadow-lg backdrop-blur-xl transition duration-300 hover:scale-[1.025] hover:bg-white/90 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:h-14 sm:w-14"
            aria-label="وێنەی دواتر"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {current.alt && (
        <p
          className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-[80vw] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-bold text-white shadow-lg backdrop-blur-md sm:text-sm"
          style={{ backgroundColor: accent }}
          dir="auto"
        >
          {current.alt}
        </p>
      )}
    </motion.div>
  );
}
