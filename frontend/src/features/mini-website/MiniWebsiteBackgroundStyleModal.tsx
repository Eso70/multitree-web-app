"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Check, Sparkles, X } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import {
  BACKGROUND_STYLE_OPTIONS,
  MiniWebsiteBackgroundPattern,
} from "./mini-website-background-styles";
import type { MiniWebsiteBackgroundStyle } from "./types";

export interface MiniWebsiteBackgroundStyleModalProps {
  isOpen: boolean;
  value: MiniWebsiteBackgroundStyle;
  onChange: (value: MiniWebsiteBackgroundStyle) => void;
  onClose: () => void;
}

// Compact pattern card, matching the linktree editor's template card.
const BackgroundStyleCard = memo(function BackgroundStyleCard({
  option,
  isSelected,
  onSelect,
}: {
  option: (typeof BACKGROUND_STYLE_OPTIONS)[number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      animate={{ scale: isSelected ? 1.05 : 1 }}
      aria-checked={isSelected}
      aria-label={option.label}
      className={`group relative aspect-4/3 w-full overflow-hidden rounded-xl border-2 ${
        isSelected
          ? "shadow-lg"
          : "border-slate-200 hover:border-brand-500/40 hover:shadow-md"
      }`}
      onClick={onSelect}
      role="radio"
      style={
        isSelected
          ? ({
              borderColor: "var(--theme-primary, #64748b)",
              "--tw-ring-color":
                "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
            } as React.CSSProperties)
          : undefined
      }
      type="button"
      whileHover={{ scale: isSelected ? 1.05 : 1.02 }}
    >
      <div className="flex h-full flex-col bg-white">
        {/* Pattern preview, drawn solid enough to read at this size */}
        <div className="relative min-h-0 flex-1">
          <MiniWebsiteBackgroundPattern
            accent="#334155"
            className="pointer-events-none absolute inset-0 h-full w-full"
            opacityScale={3}
            style={option.value}
          />
          {option.value === "none" && (
            <span
              className="absolute inset-0 grid place-items-center text-sm text-slate-300"
              aria-hidden
            >
              —
            </span>
          )}
        </div>

        {/* Caption sits below the pattern instead of over it */}
        <span className="shrink-0 border-t border-slate-100 px-1 py-1 text-center text-[9px] font-semibold leading-tight text-slate-600 sm:text-[10px]">
          {option.label}
        </span>
      </div>

      {isSelected && (
        <div
          className="absolute right-0.5 top-0.5 rounded-full p-0.5 shadow-lg sm:right-1 sm:top-1"
          style={{ background: "var(--theme-css, #64748b)" }}
        >
          <Check className="h-2 w-2 text-white sm:h-2.5 sm:w-2.5" strokeWidth={3} />
        </div>
      )}
    </motion.button>
  );
});

BackgroundStyleCard.displayName = "BackgroundStyleCard";

/**
 * Reusable picker for the mini-website background pattern, presented with the
 * same shell as the linktree editor's template selector. Choosing an option
 * reports it and closes.
 */
export const MiniWebsiteBackgroundStyleModal = memo(
  function MiniWebsiteBackgroundStyleModal({
    isOpen,
    value,
    onChange,
    onClose,
  }: MiniWebsiteBackgroundStyleModalProps) {
    const [mounted, setMounted] = useState(false);
    const dialogRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const frame = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(frame);
    }, []);

    const handleSelect = useCallback(
      (style: MiniWebsiteBackgroundStyle) => {
        onChange(style);
        onClose();
      },
      [onChange, onClose],
    );

    useModalKeyboard({
      isOpen: isOpen && mounted,
      onEscape: onClose,
      onEnter: () => handleSelect(value),
      dialogRef,
    });

    if (!isOpen || !mounted) return null;

    const modalContent = (
      <>
        {/* Backdrop with blur */}
        <motion.div
          animate={{ opacity: 1 }}
          aria-hidden
          className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal container */}
        <motion.div
          animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
          aria-label="شێوازی پاشبنەما هەڵبژێرە"
          aria-modal="true"
          className="modal-ltr fixed left-1/2 top-1/2 z-[201] max-h-[85vh] w-[95vw] max-w-2xl overflow-hidden rounded-2xl border border-gray-100/50 bg-white/95 shadow-2xl backdrop-blur-sm sm:w-[85vw] md:w-[75vw]"
          dir="ltr"
          initial={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.95 }}
          ref={dialogRef}
          role="dialog"
        >
          {/* Header */}
          <div className="border-b border-gray-100/50">
            <div className="flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="rounded-xl border p-1.5 shadow-sm sm:p-2"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
                  }}
                >
                  <Sparkles
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    style={{ color: "var(--theme-primary, #64748b)" }}
                  />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-700 sm:text-lg">
                    شێوازی پاشبنەما هەڵبژێرە
                  </h2>
                  <p
                    className="mt-0.5 text-[10px] sm:text-xs"
                    style={{ color: "var(--theme-primary, #64748b)" }}
                  >
                    {BACKGROUND_STYLE_OPTIONS.length} شێواز
                  </p>
                </div>
              </div>

              <button
                aria-label="Close"
                className="shrink-0 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50 to-gray-50 p-1.5 text-slate-500 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:text-slate-700 hover:shadow sm:p-2"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex items-center justify-center overflow-y-auto bg-linear-to-br from-white to-slate-50/20 p-3 sm:p-4"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(156,163,175,0.5) transparent",
            }}
          >
            <div className="w-full">
              <div
                aria-label="شێوازی پاشبنەما"
                className="grid grid-cols-3 justify-items-center gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5 md:gap-3"
                role="radiogroup"
              >
                {BACKGROUND_STYLE_OPTIONS.map((option, index) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-22.5 sm:max-w-23.75 md:max-w-25"
                    initial={{ opacity: 0, y: 10 }}
                    key={option.value}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    <BackgroundStyleCard
                      isSelected={value === option.value}
                      onSelect={() => handleSelect(option.value)}
                      option={option}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </>
    );

    return createPortal(modalContent, document.body);
  },
);

MiniWebsiteBackgroundStyleModal.displayName = "MiniWebsiteBackgroundStyleModal";
