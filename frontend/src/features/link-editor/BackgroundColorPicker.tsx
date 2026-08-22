"use client";

import { useState, type CSSProperties } from "react";
import { ImagePlus, X } from "lucide-react";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { ColorGradientModal } from "./ColorGradientModal";

export interface BackgroundColorOption {
  id: string;
  name: string;
  value: string;
  isSolid: boolean;
  gradient: string;
}

/** Simple base rainbow palette for surfaces that don't need the full linktree gradient set. */
export const RAINBOW_BACKGROUND_COLORS: BackgroundColorOption[] = [
  { id: "red", name: "Red", value: "#ef4444", isSolid: true, gradient: "" },
  { id: "orange", name: "Orange", value: "#f97316", isSolid: true, gradient: "" },
  { id: "yellow", name: "Yellow", value: "#eab308", isSolid: true, gradient: "" },
  { id: "green", name: "Green", value: "#22c55e", isSolid: true, gradient: "" },
  { id: "cyan", name: "Cyan", value: "#06b6d4", isSolid: true, gradient: "" },
  { id: "blue", name: "Blue", value: "#3b82f6", isSolid: true, gradient: "" },
  { id: "indigo", name: "Indigo", value: "#6366f1", isSolid: true, gradient: "" },
  { id: "violet", name: "Violet", value: "#8b5cf6", isSolid: true, gradient: "" },
  { id: "pink", name: "Pink", value: "#ec4899", isSolid: true, gradient: "" },
  { id: "black", name: "Black", value: "#0f172a", isSolid: true, gradient: "" },
  { id: "white", name: "White", value: "#ffffff", isSolid: true, gradient: "" },
];

interface BackgroundColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  allowGradient?: boolean;
  showCustom?: boolean;
  colors?: readonly BackgroundColorOption[];
  error?: string;
  /**
   * A background image replaces the colour surface entirely. The image tile is
   * only rendered for surfaces that accept one, so a picker without
   * `onImageChange` keeps its colours-only row.
   */
  imagePreview?: string | null;
  onImageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove?: () => void;
}

const IMAGE_TILE_LABEL = "وێنەی باکگڕاوند";
const IMAGE_REMOVE_LABEL = "لابردنی وێنەی باکگڕاوند";

/**
 * The swatch reads the gradient through `parseWebsiteColor`, never its own
 * direction table. A local table here only listed four of the nine directions
 * and emitted `linear-gradient(, …)` — invalid CSS, so choosing `to-t`, `to-l`,
 * `to-tr`, or `to-tl` blanked the swatch and read as "the direction did
 * nothing".
 */
function customSwatchStyle(value: string): CSSProperties {
  if (value.startsWith("gradient:")) {
    return { background: parseWebsiteColor(value).css };
  }
  return {
    background: "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
  };
}

export function BackgroundColorPicker({
  value,
  onChange,
  onBlur,
  allowGradient = true,
  showCustom = true,
  colors = RAINBOW_BACKGROUND_COLORS,
  error,
  imagePreview,
  onImageChange,
  onImageRemove,
}: BackgroundColorPickerProps) {
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const hasImage = !!imagePreview;
  // An image overrides every colour, so no swatch reads as selected while one
  // is set.
  const isCustom =
    !hasImage &&
    (value.startsWith("gradient:") ||
      (value.startsWith("#") && !colors.some((color) => color.value === value)));

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showCustom && (
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => setShowGradientPicker(true)}
              className={`relative h-6 w-6 overflow-hidden rounded-md border-2 transition-all duration-200 ${
                isCustom
                  ? "border-brand-500 scale-110 ring-1 ring-brand-500/50 shadow-sm z-10"
                  : "border-gray-300 hover:border-gray-400 hover:scale-105"
              }`}
              title="ئارەزوومەندانەیە"
            >
              <span className="absolute inset-0" style={customSwatchStyle(value)} />
            </button>
            <span className="text-[8px] text-gray-500 leading-tight text-center w-7 truncate">ئارەزوومەندانەیە</span>
          </div>
        )}

        {onImageChange && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="relative">
              <label
                className={`relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 transition-all duration-200 ${
                  hasImage
                    ? "border-brand-500 scale-110 ring-1 ring-brand-500/50 shadow-sm z-10"
                    : "border-gray-300 hover:border-gray-400 hover:scale-105"
                }`}
                title={IMAGE_TILE_LABEL}
              >
                {imagePreview ? (
                  // A data URL preview and an uploaded path both render here, so
                  // the optimizer is bypassed.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5 text-gray-500" />
                )}
                <input
                  aria-label={IMAGE_TILE_LABEL}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={onImageChange}
                  className="hidden"
                />
              </label>
              {hasImage && onImageRemove && (
                <button
                  type="button"
                  onClick={onImageRemove}
                  aria-label={IMAGE_REMOVE_LABEL}
                  title={IMAGE_REMOVE_LABEL}
                  className="absolute -right-1.5 -top-1.5 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-700 text-white shadow-sm transition hover:bg-gray-900"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
            <span className="text-[8px] text-gray-500 leading-tight text-center w-7 truncate">{IMAGE_TILE_LABEL}</span>
          </div>
        )}

        {colors.map((color) => (
          <div key={color.id} className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                // Choosing a colour drops the image, because the image is the
                // background instead of the colour rather than on top of it.
                onImageRemove?.();
                onChange(color.value);
                setShowGradientPicker(false);
              }}
              onBlur={onBlur}
              className={`relative h-6 w-6 overflow-hidden rounded-md border-2 transition-all duration-200 ${
                !hasImage && value === color.value
                  ? "border-brand-500 scale-110 ring-1 ring-brand-500/50 shadow-sm z-10"
                  : "border-gray-300 hover:border-gray-400 hover:scale-105"
              }`}
              title={color.name}
            >
              {color.isSolid ? (
                <span className="absolute inset-0 transition-opacity duration-200" style={{ backgroundColor: color.value }} />
              ) : (
                <span className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-200 ${color.gradient}`} />
              )}
              {!hasImage && value === color.value && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <span className="h-1 w-1 rounded-full bg-white" />
                </span>
              )}
            </button>
            <span className="text-[8px] text-gray-500 leading-tight text-center w-7 truncate">{color.name}</span>
          </div>
        ))}
      </div>

      {showCustom && (
        <ColorGradientModal
          isOpen={showGradientPicker}
          value={value}
          onChange={(next) => {
            onImageRemove?.();
            onChange(next);
          }}
          onClose={() => setShowGradientPicker(false)}
          solidFallback="#ff0000"
          gradientFallback="#0066ff"
          allowGradient={allowGradient}
        />
      )}

      {error && <p className="text-xs text-red-500 mt-1 font-kurdish">{error}</p>}
    </>
  );
}
