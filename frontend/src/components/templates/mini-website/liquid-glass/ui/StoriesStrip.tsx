"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { motion } from "motion/react";
import type { MiniWebsiteStory } from "@/features/mini-website/types";
import { SWISS_ACCENT } from "../liquid-glass-utils";

/** Every story ever opened, across every mini website viewed in this browser. */
const SEEN_STORIES_KEY = "multitree:seen-stories";
/** Keeps the stored list from growing forever across many different pages. */
const SEEN_STORIES_LIMIT = 300;

function readSeenStories(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_STORIES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id) => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

/**
 * A row of story bubbles for the platforms a business posts to. Opened bubbles
 * stay greyed out in this browser so repeat visitors can tell what is new.
 */
export function StoriesStrip({
  stories,
  interactive,
}: {
  stories: MiniWebsiteStory[];
  interactive: boolean;
}) {
  // Starts empty on every render, server and client alike, so hydration's
  // first client paint matches what the server sent — the server never has
  // localStorage to read. The real seen set only exists in the browser, so
  // it can only be picked up after mount, in the effect below.
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!interactive) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeenIds(readSeenStories());
  }, [interactive]);

  const markSeen = useCallback(
    (id: string) => {
      if (!interactive) return;
      setSeenIds((current) => {
        if (current.has(id)) return current;
        const next = new Set(current);
        next.add(id);
        try {
          const trimmed = Array.from(next).slice(-SEEN_STORIES_LIMIT);
          window.localStorage.setItem(
            SEEN_STORIES_KEY,
            JSON.stringify(trimmed),
          );
        } catch {
          // Private-browsing or a full quota: the ring just won't persist.
        }
        return next;
      });
    },
    [interactive],
  );

  if (!stories.length) return null;
  return (
    <section
      className="overflow-x-auto overflow-y-hidden px-1 pt-3 pb-2"
      aria-label="ستۆرییەکان"
    >
      <div className="flex w-max min-w-full justify-center gap-3 px-1">
        {stories.map((story) => {
          const href = story.mediaType === "image" ? story.image : story.url;
          const seen = seenIds.has(story.id);
          return (
            <a
              key={story.id}
              href={interactive ? href : undefined}
              target={interactive ? "_blank" : undefined}
              rel="noreferrer"
              data-mini-action={
                interactive ? `mini:story:${story.id}` : undefined
              }
              data-mini-image-src={
                interactive && story.mediaType === "image"
                  ? story.image
                  : undefined
              }
              data-mini-image-alt={
                interactive && story.mediaType === "image"
                  ? story.title || story.platform
                  : undefined
              }
              data-mini-image-group="stories"
              onClick={(event) => {
                if (!interactive) {
                  event.preventDefault();
                  return;
                }
                markSeen(story.id);
              }}
              className={`w-[4.75rem] text-center ${interactive ? "cursor-pointer" : "cursor-default"}`}
            >
              <motion.span
                className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-current bg-black/5 p-0.5 transition-colors duration-300 sm:h-[4.5rem] sm:w-[4.5rem]"
                style={{ color: seen ? "#94a3b8" : SWISS_ACCENT }}
                whileHover={interactive ? { y: -4, scale: 1.06 } : undefined}
                whileTap={interactive ? { scale: 0.94 } : undefined}
              >
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900 text-white">
                  {story.image ? (
                    <Image
                      src={story.image}
                      alt={story.title || story.platform}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
                  )}
                </span>
              </motion.span>
              <span
                className="mt-1.5 block truncate text-[10px] font-black"
                dir="auto"
              >
                {story.title || story.platform}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
