'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { parseWebsiteColor, readableInk, type ParsedColor } from '@/lib/utils/parse-website-color';
import { applyCursorColor, resetCursorColor } from '@/lib/utils/cursor-theme';

interface ThemeContextValue {
  color: ParsedColor;
  cssVars: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  websiteColor: string | null;
  children: React.ReactNode;
  /**
   * Business dashboards are tenant-branded surfaces. In that mode, legacy
   * controls that still consume the platform accent are redirected to the
   * tenant colour as well. Public page templates leave this disabled so their
   * authored palette remains independent.
   */
  documentTheme?: 'theme-only' | 'business';
}

export function ThemeProvider({
  websiteColor,
  children,
  documentTheme = 'theme-only',
}: ThemeProviderProps) {
  const color = useMemo(() => parseWebsiteColor(websiteColor), [websiteColor]);
  const ink = useMemo(() => readableInk(color.primary), [color.primary]);

  const cssVars = useMemo(() => ({
    '--theme-primary': color.primary,
    '--theme-css': color.css,
    '--theme-type': color.type,
    '--theme-ink': ink,
    // Override Tailwind v4 brand color tokens so all brand-* utilities use business's theme
    '--color-brand-500': color.primary,
    '--color-brand-600': color.primary,
    '--color-brand-400': color.primary,
    '--color-brand-300': color.primary,
    '--color-brand-100': color.primary,
    '--color-brand-50': color.primary,
    ...(documentTheme === 'business' ? {
      '--business-website-color': color.primary,
      '--business-website-css': color.css,
      '--sponsor-krd-accent': color.primary,
      '--sponsor-krd-accent-gradient': color.css,
      '--sponsor-krd-accent-ink': ink,
      '--sponsor-krd-accent-hover': `color-mix(in srgb, ${color.primary} 88%, black)`,
    } : {}),
  }), [color, documentTheme, ink]);

  useEffect(() => {
    const root = document.documentElement;
    let cancelled = false;
    const previousValues = new Map(
      Object.keys(cssVars).map((key) => [key, root.style.getPropertyValue(key)]),
    );
    const previousCursorValues = new Map(
      ['--custom-cursor-default', '--custom-cursor-text'].map((key) => [
        key,
        root.style.getPropertyValue(key),
      ]),
    );
    const previousThemeActive = root.getAttribute('data-theme-active');
    const previousBusinessTheme = root.getAttribute('data-business-theme-active');
    root.setAttribute('data-theme-active', 'true');
    if (documentTheme === 'business') {
      root.setAttribute('data-business-theme-active', 'true');
    }
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    void applyCursorColor(color.primary, root, () => !cancelled).catch(() => undefined);
    return () => {
      cancelled = true;
      if (previousThemeActive === null) root.removeAttribute('data-theme-active');
      else root.setAttribute('data-theme-active', previousThemeActive);
      if (previousBusinessTheme === null) {
        root.removeAttribute('data-business-theme-active');
      } else {
        root.setAttribute('data-business-theme-active', previousBusinessTheme);
      }
      previousValues.forEach((value, key) => {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      });
      resetCursorColor(root);
      previousCursorValues.forEach((value, key) => {
        if (value) root.style.setProperty(key, value);
      });
    };
  }, [color.primary, cssVars, documentTheme]);

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
