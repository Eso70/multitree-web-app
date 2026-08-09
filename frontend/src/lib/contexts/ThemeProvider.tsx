'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { parseWebsiteColor, readableInk, type ParsedColor } from '@/lib/utils/parse-website-color';
import { applyCursorColor, resetCursorColor } from '@/lib/utils/cursor-theme';

interface ThemeContextValue {
  color: ParsedColor;
  cssVars: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ websiteColor, children }: { websiteColor: string | null; children: React.ReactNode }) {
  const color = useMemo(() => parseWebsiteColor(websiteColor), [websiteColor]);

  const cssVars = useMemo(() => ({
    '--theme-primary': color.primary,
    '--theme-css': color.css,
    '--theme-type': color.type,
    '--theme-ink': readableInk(color.primary),
    // Override Tailwind v4 brand color tokens so all brand-* utilities use business's theme
    '--color-brand-500': color.primary,
    '--color-brand-600': color.primary,
    '--color-brand-400': color.primary,
    '--color-brand-300': color.primary,
    '--color-brand-100': color.primary,
    '--color-brand-50': color.primary,
  }), [color]);

  useEffect(() => {
    const root = document.documentElement;
    let cancelled = false;
    root.setAttribute('data-theme-active', 'true');
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    void applyCursorColor(color.primary, root, () => !cancelled).catch(() => undefined);
    return () => {
      cancelled = true;
      root.removeAttribute('data-theme-active');
      Object.keys(cssVars).forEach(key => root.style.removeProperty(key));
      resetCursorColor(root);
    };
  }, [color.primary, cssVars]);

  return (
    <ThemeContext.Provider value={{ color, cssVars }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
