"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { persistAppTheme, readAppTheme } from "@/lib/app-theme";

interface PublicNavbarBranding {
  logo?: string;
  name: string;
  accentColor?: string;
}

interface PublicSiteNavbarProps {
  appearance?: "multitree" | "business";
  branding?: PublicNavbarBranding;
  homeHref?: string;
  sectionBaseHref?: string;
  navigationItems?: ReadonlyArray<{ label: string; href: string }>;
  action?: { label: string; href: string; external?: boolean } | null;
  /** Whether the first nav item is emphasized like an active page. Default true. */
  emphasizeFirstNavItem?: boolean;
}

export function PublicSiteNavbar({
  appearance = "multitree",
  branding,
  homeHref = "/",
  sectionBaseHref = "",
  navigationItems,
  action,
  emphasizeFirstNavItem = true,
}: PublicSiteNavbarProps = {}) {
  const primaryColor = branding?.accentColor || "var(--multitree-accent)";
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const reduceMotion = useReducedMotion() ?? false;
  const resolvedNavigationItems =
    navigationItems ??
    (branding
      ? []
      : [
          { label: "Features", href: `${sectionBaseHref}#features` },
          { label: "Solutions", href: `${sectionBaseHref}#solutions` },
          { label: "Pricing", href: `${sectionBaseHref}#pricing` },
        ]);
  const resolvedAction =
    action === undefined
      ? branding
        ? null
        : { label: "Learn more", href: `${sectionBaseHref}#features` }
      : action;
  const atTopClass = "border-transparent bg-transparent shadow-none";
  const scrolledClass =
    appearance === "business"
      ? "border-transparent"
      : "border-black/8 shadow-[0_8px_24px_-16px_rgba(15,23,42,.28)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/8 dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,.6)]";
  const glassBackground =
    theme === "dark"
      ? appearance === "business"
        ? "rgba(11, 13, 14, 0.58)"
        : "rgba(15, 23, 42, 0.72)"
      : "rgba(248, 249, 250, 0.58)";
  const mobileGlassBackground =
    theme === "dark"
      ? appearance === "business"
        ? "rgba(11, 13, 14, 0.68)"
        : "rgba(15, 23, 42, 0.82)"
      : "rgba(248, 249, 250, 0.68)";
  const businessGlassActive =
    appearance === "business" && (scrolled || menuOpen);
  const navbarBackground =
    appearance === "business"
      ? businessGlassActive
        ? glassBackground
        : "transparent"
      : theme === "dark"
        ? "rgb(15, 23, 42)"
        : "rgb(248, 249, 250)";
  const mobileBackground =
    appearance === "business"
      ? mobileGlassBackground
      : theme === "dark"
        ? "rgb(15, 23, 42)"
        : "rgb(248, 249, 250)";
  const navbarShadow = businessGlassActive
    ? theme === "dark"
      ? "0 10px 30px -20px rgba(0, 0, 0, 0.65)"
      : "0 10px 30px -20px rgba(15, 23, 42, 0.32)"
    : "0 0 0 0 rgba(0, 0, 0, 0)";
  const navbarBackdrop = businessGlassActive
    ? "blur(24px) saturate(1.75)"
    : "blur(0px) saturate(1)";
  const brandingContent = (
    <>
      <Image
        src={branding?.logo || "/images/Logo.jpg"}
        alt={branding ? `${branding.name} logo` : "MultiTree logo"}
        width={30}
        height={30}
        className="rounded-lg object-cover shadow-sm"
      />
      <span className="text-base font-bold tracking-tight text-slate-950 dark:text-white sm:text-lg">
        {branding?.name || "MultiTree"}
      </span>
    </>
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        readAppTheme() === "dark";
      persistAppTheme(isDark ? "dark" : "light");
      setTheme(isDark ? "dark" : "light");
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let frame = 0;
    const syncScrolledState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 0));
    };
    syncScrolledState();
    window.addEventListener("scroll", syncScrolledState, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncScrolledState);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    persistAppTheme(nextTheme);
    setTheme(nextTheme);
  };

  const navbar = (
    <motion.nav
      dir="ltr"
      aria-label="Primary navigation"
      className={`fixed inset-x-0 top-0 z-50 w-full border-b text-slate-950 dark:text-white ${businessGlassActive ? scrolledClass : atTopClass}`}
      initial={false}
      animate={{
        backgroundColor: navbarBackground,
        backdropFilter: navbarBackdrop,
        boxShadow: navbarShadow,
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <div className="mx-auto flex h-[60px] w-full max-w-[75rem] items-center justify-between px-5 sm:px-6">
        {homeHref.startsWith("#") ? (
          <a href={homeHref} className="flex items-center gap-2">
            {brandingContent}
          </a>
        ) : (
          <Link href={homeHref} className="flex items-center gap-2">
            {brandingContent}
          </Link>
        )}

        <div className="hidden items-center gap-5 lg:flex xl:gap-8">
          {resolvedNavigationItems.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className={
                emphasizeFirstNavItem && index === 0
                  ? "text-sm font-semibold text-slate-950 transition-colors hover:text-slate-600 dark:text-white dark:hover:text-white/75"
                  : "text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 dark:text-white/65 dark:hover:text-white"
              }
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-black/6 hover:text-slate-950 dark:text-white/75 dark:hover:bg-white/8 dark:hover:text-white"
            aria-label="Toggle theme mode"
          >
            {theme === "light" ? (
              <Moon className="size-5" />
            ) : (
              <Sun className="size-5" />
            )}
          </button>

          {resolvedAction ? (
            <a
              className="hidden min-h-9 items-center rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-[opacity,box-shadow] hover:opacity-90 hover:shadow lg:inline-flex"
              style={{
                backgroundColor: primaryColor,
                color: "var(--multitree-accent-ink)",
              }}
              href={resolvedAction.href}
              target={resolvedAction.external ? "_blank" : undefined}
              rel={resolvedAction.external ? "noopener noreferrer" : undefined}
            >
              {resolvedAction.label}
            </a>
          ) : null}

          {(resolvedNavigationItems.length > 0 || resolvedAction) && (
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-black/6 hover:text-slate-950 dark:text-white/75 dark:hover:bg-white/8 dark:hover:text-white lg:hidden"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          className="absolute inset-x-0 top-[60px] border-b border-black/8 p-4 shadow-[0_12px_28px_-18px_rgba(15,23,42,.32)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/8 dark:shadow-[0_12px_28px_-18px_rgba(0,0,0,.7)] lg:hidden"
          style={{ backgroundColor: mobileBackground }}
        >
          <div className="mx-auto flex max-w-[75rem] flex-col gap-1 text-sm font-medium text-slate-600 dark:text-white/75">
            {resolvedNavigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-black/6 px-2 py-3 transition-colors hover:text-slate-950 dark:border-white/6 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
            {resolvedAction && (
              <a
                href={resolvedAction.href}
                target={resolvedAction.external ? "_blank" : undefined}
                rel={resolvedAction.external ? "noopener noreferrer" : undefined}
                onClick={() => setMenuOpen(false)}
                className="mt-2 px-2 py-3 font-semibold"
                style={{ color: primaryColor }}
              >
                {resolvedAction.label}
              </a>
            )}
          </div>
        </div>
      )}
    </motion.nav>
  );

  if (!mounted) return navbar;
  return createPortal(navbar, document.body);
}
