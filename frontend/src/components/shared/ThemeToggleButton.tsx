"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { persistAppTheme, readAppTheme } from "@/lib/app-theme";

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const dark = readAppTheme() === "dark";
      setIsDark(dark);
      persistAppTheme(dark ? "dark" : "light");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((current) => {
      const next = !current;
      persistAppTheme(next ? "dark" : "light");
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/85 text-slate-500 shadow-sm backdrop-blur transition hover:text-slate-900 dark:border-white/10 dark:bg-[#171a20]/90 dark:text-slate-400 dark:hover:text-white ${className}`}
      aria-label="Change theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}