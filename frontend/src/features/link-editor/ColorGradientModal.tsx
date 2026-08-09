"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Pipette, X } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import {
  parseWebsiteColor,
  WEBSITE_GRADIENT_DIRECTIONS,
  type WebsiteGradientDirection,
} from "@/lib/utils/parse-website-color";

type ColorMode = "hex" | "rgb" | "hsl";
type ActiveColor = "from" | "to";

interface ColorGradientModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  solidFallback?: string;
  gradientFallback?: string;
  title?: string;
  subtitle?: string;
  allowGradient?: boolean;
}

declare global {
  interface Window {
    EyeDropper?: new () => {
      open: () => Promise<{ sRGBHex: string }>;
    };
  }
}

const QUICK_COLORS = [
  "#ffffff",
  "#000000",
  "#64748b",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#d97706",
];

function normalizeHex(value: string, fallback = "#000000") {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return fallback;
}

function hexToRgb(hex: string) {
  const safe = normalizeHex(hex);
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case red:
        h = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        h = (blue - red) / delta + 2;
        break;
      default:
        h = (red - green) / delta + 4;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(h: number, s: number, l: number) {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lit = Math.min(100, Math.max(0, l)) / 100;

  if (sat === 0) {
    const gray = Math.round(lit * 255);
    return rgbToHex(gray, gray, gray);
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
  const p = 2 * lit - q;
  return rgbToHex(
    hueToRgb(p, q, hue + 1 / 3) * 255,
    hueToRgb(p, q, hue) * 255,
    hueToRgb(p, q, hue - 1 / 3) * 255,
  );
}

function parseColorValue(value: string, solidFallback: string, gradientFallback: string) {
  if (value.startsWith("gradient:")) {
    const [, direction, from, to] = value.split(":");
    return {
      mode: "gradient" as const,
      direction: (
        WEBSITE_GRADIENT_DIRECTIONS.includes(
          direction as WebsiteGradientDirection,
        )
          ? direction
          : "to-b"
      ) as WebsiteGradientDirection,
      from: normalizeHex(from || solidFallback, solidFallback),
      to: normalizeHex(to || gradientFallback, gradientFallback),
    };
  }

  const solid = normalizeHex(value, solidFallback);
  return {
    mode: "solid" as const,
    direction: "to-b" as WebsiteGradientDirection,
    from: solid,
    to: solid,
  };
}

function getPreviewStyle(
  from: string,
  to: string,
  direction: WebsiteGradientDirection,
) {
  if (from === to) return { backgroundColor: from };
  return {
    background: parseWebsiteColor(
      `gradient:${direction}:${from}:${to}`,
    ).css,
  };
}

export function ColorGradientModal({
  isOpen,
  value,
  onChange,
  onClose,
  solidFallback = "#000000",
  gradientFallback = "#0066ff",
  title = "ڕەنگی دڵخواز",
  subtitle = "ڕەنگی تاک یان گرادیێنت دروست بکە",
  allowGradient = true,
}: ColorGradientModalProps) {
  const [mounted, setMounted] = useState(false);
  const parsedInitial = useMemo(
    () => parseColorValue(value, solidFallback, gradientFallback),
    [value, solidFallback, gradientFallback],
  );
  const [isGradient, setIsGradient] = useState(parsedInitial.mode === "gradient");
  const [from, setFrom] = useState(parsedInitial.from);
  const [to, setTo] = useState(parsedInitial.to);
  const [direction, setDirection] =
    useState<WebsiteGradientDirection>(parsedInitial.direction);
  const [activeColor, setActiveColor] = useState<ActiveColor>("from");
  const [inputMode, setInputMode] = useState<ColorMode>("hex");
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  const [pickedColors, setPickedColors] = useState<string[]>([]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const parsed = parseColorValue(value, solidFallback, gradientFallback);
      setIsGradient(allowGradient && parsed.mode === "gradient");
      setFrom(parsed.from);
      setTo(parsed.to);
      setDirection(parsed.direction);
      setActiveColor("from");
      setInputMode("hex");
      setPickerMessage(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, value, solidFallback, gradientFallback, allowGradient]);

  const activeValue = activeColor === "from" ? from : to;
  const themedButtonStyle = {
    background: "var(--theme-css, var(--multitree-accent))",
    color: "var(--theme-ink, var(--multitree-accent-ink))",
  };
  const rgb = hexToRgb(activeValue);
  const hsl = hexToHsl(activeValue);
  const setActiveValue = (nextValue: string) => {
    const nextHex = normalizeHex(nextValue, activeValue);
    if (activeColor === "from") {
      setFrom(nextHex);
      if (!isGradient) setTo(nextHex);
    } else {
      setTo(nextHex);
    }
  };

  const pickScreenColor = async () => {
    setPickerMessage(null);

    if (typeof window === "undefined" || typeof window.EyeDropper !== "function") {
      setPickerMessage("ئەم وێبگەڕە پشتگیری پێنووسی ڕەنگ ناکات.");
      return;
    }

    setIsPickingColor(true);
    try {
      const result = await new window.EyeDropper().open();
      const pickedColor = normalizeHex(result.sRGBHex, activeValue);
      setActiveValue(pickedColor);
      setPickedColors((previous) => [
        pickedColor,
        ...previous.filter((color) => color !== pickedColor),
      ].slice(0, 8));
      setPickerMessage("ڕەنگەکە وەرگیرا.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name !== "AbortError") {
        setPickerMessage("نەتوانرا ڕەنگەکە وەربگیرێت. تکایە دووبارە هەوڵبدەوە.");
      }
    } finally {
      setIsPickingColor(false);
    }
  };

  const applyColor = () => {
    if (!allowGradient || !isGradient) {
      onChange(from);
    } else {
      onChange(`gradient:${direction}:${from}:${to}`);
    }
    onClose();
  };

  useModalKeyboard({
    isOpen: isOpen && mounted,
    onEscape: onClose,
    onEnter: applyColor,
  });

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[200] bg-black/30 backdrop-blur-lg   duration-300 transition-opacity ${isPickingColor ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={`modal-ltr fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[85vw] md:w-[75vw] max-w-md max-h-[85vh] overflow-hidden rounded-2xl bg-white border border-gray-100/50 shadow-2xl    duration-300 transition-opacity ${isPickingColor ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        dir="ltr"
      >
        <div className="border-b border-gray-100/50">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="rounded-xl p-1.5 sm:p-2 shadow-sm border"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
                }}
              >
                <span
                  className="block h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full"
                  style={{ background: "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
                />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-700">{title}</h2>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-1.5 sm:p-2 bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-500 hover:text-slate-700 transition-all duration-300 border border-slate-100 shadow-sm hover:shadow"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-4 space-y-4" style={{ maxHeight: "calc(85vh - 130px)", scrollbarWidth: "thin", scrollbarColor: "rgba(156,163,175,0.5) transparent" }}>
          {allowGradient && <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setIsGradient(false);
                setTo(from);
                setActiveColor("from");
              }}
              className={`flex-1 py-2 text-xs font-medium transition-all ${!isGradient ? "shadow-sm" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              style={!isGradient ? themedButtonStyle : undefined}
            >
              ڕەنگی تاک
            </button>
            <button
              type="button"
              onClick={() => {
                setIsGradient(true);
                if (from === to) setTo(gradientFallback);
              }}
              className={`flex-1 py-2 text-xs font-medium transition-all ${isGradient ? "shadow-sm" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              style={isGradient ? themedButtonStyle : undefined}
            >
              گرادیێنت
            </button>
          </div>}

          <div
            className="h-14 w-full rounded-xl border border-gray-200 shadow-inner"
            style={getPreviewStyle(from, isGradient ? to : from, direction)}
          />

          {isGradient && (
            <div className="flex rounded-lg bg-gray-50 border border-gray-200 p-0.5 gap-0.5">
              {([
                ["from", "ڕەنگی یەکەم"],
                ["to", "ڕەنگی دووەم"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveColor(id)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${activeColor === id ? "shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  style={activeColor === id ? themedButtonStyle : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex rounded-lg bg-gray-50 border border-gray-200 p-0.5 gap-0.5">
            {(["hex", "rgb", "hsl"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold uppercase transition-all ${inputMode === mode ? "shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                style={inputMode === mode ? themedButtonStyle : undefined}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              {isGradient ? (activeColor === "from" ? "ڕەنگی یەکەم" : "ڕەنگی دووەم") : "ڕەنگ"}
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
              <span
                className="h-10 w-12 shrink-0 rounded-lg border border-gray-200 shadow-inner"
                style={{ backgroundColor: activeValue }}
                aria-hidden
              />
              <input
                type="text"
                value={activeValue}
                onChange={(event) => setActiveValue(event.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2 font-mono text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                placeholder="#000000"
                inputMode="text"
              />
              <button
                type="button"
                onClick={pickScreenColor}
                disabled={isPickingColor}
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-100 disabled:cursor-wait disabled:opacity-70"
                title="پێنووسی ڕەنگ"
              >
                <Pipette className="h-4 w-4" />
                <span className="hidden sm:inline">{isPickingColor ? "..." : "پێنووس"}</span>
              </button>
            </div>
            {pickerMessage && (
              <p className="text-[11px] text-gray-500">{pickerMessage}</p>
            )}

            {inputMode === "rgb" && (
              <div className="space-y-2">
                {(["r", "g", "b"] as const).map((channel) => (
                  <div key={channel} className="grid grid-cols-[28px_1fr_58px] items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-gray-500">{channel}</span>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgb[channel]}
                      onChange={(event) => {
                        const next = { ...rgb, [channel]: Number(event.target.value) };
                        setActiveValue(rgbToHex(next.r, next.g, next.b));
                      }}
                      className="accent-[var(--theme-primary,#64748b)]"
                    />
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb[channel]}
                      onChange={(event) => {
                        const next = { ...rgb, [channel]: Number(event.target.value) };
                        setActiveValue(rgbToHex(next.r, next.g, next.b));
                      }}
                      className="w-full rounded-lg border border-gray-200 px-1.5 py-1 text-center text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                ))}
              </div>
            )}

            {inputMode === "hsl" && (
              <div className="space-y-2">
                {([
                  ["h", "H", 360],
                  ["s", "S", 100],
                  ["l", "L", 100],
                ] as const).map(([key, label, max]) => (
                  <div key={key} className="grid grid-cols-[28px_1fr_58px] items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase text-gray-500">{label}</span>
                    <input
                      type="range"
                      min="0"
                      max={max}
                      value={hsl[key]}
                      onChange={(event) => {
                        const next = { ...hsl, [key]: Number(event.target.value) };
                        setActiveValue(hslToHex(next.h, next.s, next.l));
                      }}
                      className="accent-[var(--theme-primary,#64748b)]"
                    />
                    <input
                      type="number"
                      min="0"
                      max={max}
                      value={hsl[key]}
                      onChange={(event) => {
                        const next = { ...hsl, [key]: Number(event.target.value) };
                        setActiveValue(hslToHex(next.h, next.s, next.l));
                      }}
                      className="w-full rounded-lg border border-gray-200 px-1.5 py-1 text-center text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {isGradient && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">ئاراستەی گرادیێنت</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "to-r", label: "→", title: "چەپ بۆ ڕاست" },
                  { id: "to-l", label: "←", title: "ڕاست بۆ چەپ" },
                  { id: "to-b", label: "↓", title: "سەرەوە بۆ خوارەوە" },
                  { id: "to-t", label: "↑", title: "خوارەوە بۆ سەرەوە" },
                  { id: "to-br", label: "↘", title: "لاتەنیشت" },
                  { id: "to-bl", label: "↙", title: "لاتەنیشت پێچەوانە" },
                  { id: "to-tr", label: "↗", title: "بۆ سەرەوەی ڕاست" },
                  { id: "to-tl", label: "↖", title: "بۆ سەرەوەی چەپ" },
                  { id: "radial", label: "◎", title: "بازنەیی" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.title}
                    onClick={() =>
                      setDirection(item.id as WebsiteGradientDirection)
                    }
                    className={`h-9 w-full rounded-xl text-sm font-medium border transition-all ${direction === item.id ? "border-transparent shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                    style={direction === item.id ? { ...themedButtonStyle, borderColor: "var(--theme-primary, var(--multitree-accent))" } : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">ڕەنگی ئامادە</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setActiveValue(color)}
                  className={`h-7 w-7 rounded-lg border transition-all ${activeValue === color ? "border-gray-900 scale-110 ring-1 ring-gray-900/30" : "border-gray-200 hover:scale-105"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {pickedColors.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">ڕەنگە وەرگیراوەکان</label>
              <div className="flex flex-wrap gap-1.5">
                {pickedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setActiveValue(color)}
                    className={`h-7 w-7 rounded-lg border transition-all ${activeValue === color ? "border-gray-900 scale-110 ring-1 ring-gray-900/30" : "border-gray-200 hover:scale-105"}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100/50 p-3 sm:p-4">
          <button
            type="button"
            onClick={applyColor}
            className="w-full rounded-xl py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:opacity-90 transition-all duration-300"
            style={themedButtonStyle}
          >
            جێبەجێکردن
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
