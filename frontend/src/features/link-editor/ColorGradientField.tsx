"use client";

import { Palette } from "lucide-react";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { ColorGradientModal } from "./ColorGradientModal";

interface ColorGradientFieldProps {
  value: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  title: string;
  subtitle: string;
  solidFallback?: string;
  gradientFallback?: string;
  error?: string;
}

export function ColorGradientField({
  value,
  isOpen,
  onOpen,
  onClose,
  onChange,
  title,
  subtitle,
  solidFallback = "#000000",
  gradientFallback = "#0066ff",
  error,
}: ColorGradientFieldProps) {
  const color = parseWebsiteColor(value);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        data-invalid={error ? "true" : undefined}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-xs font-bold text-slate-600 transition focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-slate-200 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/50"
            : "border-slate-200 hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]/20 dark:border-white/10"
        }`}
      >
        <span
          className="h-7 min-w-8 flex-1 rounded-lg border border-black/10 shadow-sm"
          style={{ background: color.css }}
        />
        <Palette
          className="h-4 w-4 shrink-0"
          style={{ color: color.primary }}
        />
      </button>
      {error && (
        <span className="mt-1.5 block text-[10px] font-semibold leading-4 text-rose-500">
          {error}
        </span>
      )}
      <ColorGradientModal
        isOpen={isOpen}
        value={value}
        onChange={onChange}
        onClose={onClose}
        solidFallback={solidFallback}
        gradientFallback={gradientFallback}
        title={title}
        subtitle={subtitle}
      />
    </>
  );
}
