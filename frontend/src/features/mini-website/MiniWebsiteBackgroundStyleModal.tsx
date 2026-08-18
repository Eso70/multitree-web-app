"use client";

/**
 * The mini-website name for the shared background-pattern picker.
 *
 * The modal itself is in `components/shared/BackgroundPatternModal`, because
 * the linktree editor opens the same one. This alias stays so mini-website
 * callers read the way they always did.
 */
export {
  BackgroundPatternModal as MiniWebsiteBackgroundStyleModal,
  type BackgroundPatternModalProps as MiniWebsiteBackgroundStyleModalProps,
} from "@/components/shared/BackgroundPatternModal";
