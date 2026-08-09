"use client";

import { useState, type CSSProperties } from "react";
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
}

function customSwatchStyle(value: string): CSSProperties {
  if (value.startsWith("gradient:")) {
    const parts = value.split(":");
    const dir = parts[1];
    const from = parts[2];
    const to = parts[3];
    const cssDir =
      dir === "to-r"
        ? "to right"
        : dir === "to-b"
          ? "to bottom"
          : dir === "to-br"
            ? "to bottom right"
            : dir === "to-bl"
              ? "to bottom left"
              : "";
    return dir === "radial"
      ? { background: `radial-gradient(circle, ${from}, ${to})` }
      : { background: `linear-gradient(${cssDir}, ${from}, ${to})` };
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
}: BackgroundColorPickerProps) {
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const isCustom =
    value.startsWith("gradient:") ||
    (value.startsWith("#") && !colors.some((color) => color.value === value));

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
              title="دڵخواز"
            >
              <span className="absolute inset-0" style={customSwatchStyle(value)} />
            </button>
            <span className="text-[8px] text-gray-500 leading-tight text-center w-7 truncate">دڵخواز</span>
          </div>
        )}

        {colors.map((color) => (
          <div key={color.id} className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                onChange(color.value);
                setShowGradientPicker(false);
              }}
              onBlur={onBlur}
              className={`relative h-6 w-6 overflow-hidden rounded-md border-2 transition-all duration-200 ${
                value === color.value
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
              {value === color.value && (
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
          onChange={onChange}
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
