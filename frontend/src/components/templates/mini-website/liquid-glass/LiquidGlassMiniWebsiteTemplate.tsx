"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  memo,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ChevronUp,
  Eye,
  Moon,
  Share2,
  Sun,
} from "lucide-react";
import { Skeleton } from "@/components/shared/Skeleton";
import { SOCIAL_PLATFORMS } from "@/features/link-editor/modal-constants";
import {
  BannerVideo,
  bannerVideoSource,
} from "@/features/mini-website/BannerVideo";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { PublicSiteFooter } from "@/components/public/PublicSiteFooter";
import { VerifiedBadge } from "@/components/public/VerifiedBadge";
import { MINI_WEBSITE_SECTIONS } from "@/features/mini-website/types";
import { withLatinDigits } from "./sections";
import {
  SECTION_REGISTRY,
  sectionHeaderTone,
  sectionPlacementClass,
  type SectionRegistryContext,
} from "./sections/registry";
import { useNearViewport } from "@/hooks/useNearViewport";
import {
  ImageLightbox,
  PortfolioDecorations,
  ShareDialog,
  StoriesStrip,
  type LightboxImage,
} from "./ui";
import type {
  MiniWebsiteTemplateProps,
  MiniWebsiteTemplateViewport,
  ProfileLike,
} from "../types";

const variationClasses = {
  soft: "bg-[#f6f8f3] text-slate-900",
  glass: "bg-[#0d1512] text-white",
  minimal: "bg-white text-slate-950",
  warm: "bg-[#fff9ef] text-stone-900",
};

const viewportClasses: Record<MiniWebsiteTemplateViewport, string> = {
  mobile: "max-w-[360px] rounded-[34px]",
  tablet: "max-w-[680px] rounded-[28px]",
  desktop: "max-w-[1040px] rounded-[24px]",
};

/** How long a section keeps its skeleton once it scrolls into range. */
const SECTION_SKELETON_PENDING_MS = 450;

/**
 * Scroll-triggered skeleton for a portfolio section.
 *
 * On the full public page, sections below the fold render as skeleton cards
 * until they near the viewport; each then holds the skeleton briefly — the
 * "pending" moment — before the real section mounts and animates in. Off the
 * full page (editor previews) sections render immediately so the canvas never
 * shows placeholders. Empty sections mount to nothing, keeping the outer
 * card's `[&:empty]:hidden` rule intact.
 */
function LazySectionSkeleton({
  fullPage,
  children,
}: {
  fullPage: boolean;
  children: React.ReactNode;
}) {
  const {
    ref,
    isNear: nearViewport,
  } = useNearViewport<HTMLDivElement>({ rootMargin: "900px 0px" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!nearViewport || loaded) return;
    const timer = window.setTimeout(
      () => setLoaded(true),
      SECTION_SKELETON_PENDING_MS,
    );
    return () => window.clearTimeout(timer);
  }, [nearViewport, loaded]);

  if (!fullPage || loaded) return <>{children}</>;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="flex min-h-[320px] flex-col gap-5 py-2"
    >
      <div className="flex items-center gap-3.5">
        <Skeleton className="h-12 w-12 shrink-0" rounded="rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-44 max-w-full" rounded="rounded-md" />
          <Skeleton className="h-3 w-64 max-w-full" rounded="rounded-md" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-full min-h-24 w-full" rounded="rounded-2xl" />
        <Skeleton
          className="hidden h-full min-h-24 w-full sm:block"
          rounded="rounded-2xl"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" rounded="rounded-xl" />
        ))}
      </div>
    </div>
  );
}


/** One real list; arrow navigation wraps without cloning heavy media cards. */
export function LiquidGlassMiniWebsiteTemplate({
  profile: sourceProfile,
  compact = false,
  viewport = "mobile",
  interactive = false,
  fullPage = false,
  embeddedPreview = false,
  leadFormEndpoint,
  onLeadSubmitted,
}: MiniWebsiteTemplateProps) {
  const profile = useMemo(
    () => withLatinDigits(sourceProfile),
    [sourceProfile],
  );
  // Declared before the effects below, which publish it onto the document root.
  const accentColor = parseWebsiteColor(profile.accentColor);
  const [dark, setDark] = useState(profile.variation === "glass");
  const [shareOpen, setShareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{
    images: LightboxImage[];
    index: number;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const systemReducedMotion = useReducedMotion();
  /**
   * Held back until after hydration.
   *
   * The hook reads a media query, so it is `null` on the server and `true` for
   * a reader who asked for less motion — and anything keyed to it then renders
   * differently in the two passes. The scroll bar below is the clearest case:
   * the server emits it and that client does not. Treating it as "no preference"
   * until mounted makes both passes agree, and the real preference applies a
   * tick later, before any of it has had time to move.
   */
  const prefersReducedMotion = portalReady ? systemReducedMotion : false;
  const { scrollYProgress } = useScroll({
    target: previewRef,
    offset: ["start start", "end end"],
  });
  const heroY = useTransform(
    scrollYProgress,
    [0, 0.2],
    [0, fullPage && !prefersReducedMotion ? 14 : 0],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => setPortalReady(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!fullPage) return;
    const root = document.documentElement;
    const pageBackground = dark ? "#09100e" : "#faf8ff";
    const previousRootBackground = root.style.backgroundColor;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousColorScheme = root.style.colorScheme;
    const rootWasDark = root.classList.contains("dark");

    root.style.backgroundColor = pageBackground;
    document.body.style.backgroundColor = pageBackground;
    root.style.colorScheme = dark ? "dark" : "light";
    root.classList.toggle("dark", dark);
    // The page's colour is also published on the root, not only on this
    // component's own element. Shared controls open their menus in a portal on
    // `document.body`, which sits outside this subtree — without this a date
    // picker or a dropdown would fall back to the neutral default the moment it
    // opened. The `dark` class above is on the root for the same reason.
    root.style.setProperty("--business-website-color", accentColor.primary);
    root.style.setProperty("--theme-primary", accentColor.primary);
    root.style.setProperty("--theme-css", accentColor.css);

    return () => {
      root.style.backgroundColor = previousRootBackground;
      document.body.style.backgroundColor = previousBodyBackground;
      root.style.colorScheme = previousColorScheme;
      root.classList.toggle("dark", rootWasDark);
      root.style.removeProperty("--business-website-color");
      root.style.removeProperty("--theme-primary");
      root.style.removeProperty("--theme-css");
    };
  }, [accentColor.css, accentColor.primary, dark, fullPage]);
  const content = profile.content;
  const {
    storiesEnabled,
    orderedSections,
    footerSectionLinks,
    footerMoreLinks,
    footerSocialLinks,
  } = useMemo(() => {
    const enabledSectionKeys = new Set(
      profile.sections
        .filter((section) => section.enabled)
        .map((section) => section.key),
    );
    const sections = MINI_WEBSITE_SECTIONS.filter(
      (section) =>
        enabledSectionKeys.has(section.key) && section.key !== "stories",
    ).map((section) => ({ key: section.key, enabled: true }));
    const sectionLinks = sections.slice(0, 6).map((section) => ({
      label: SECTION_REGISTRY[section.key]?.label || section.key,
      href: `#portfolio-${section.key}`,
    }));
    const moreLinks = sections.slice(6, 12).map((section) => ({
      label: SECTION_REGISTRY[section.key]?.label || section.key,
      href: `#portfolio-${section.key}`,
    }));
    const socialLinks = [...(profile.socialLinks || [])]
      .filter((link) => link.enabled !== false && Boolean(link.url))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .slice(0, 6)
      .map((link) => ({
        label:
          link.displayName?.trim() ||
          SOCIAL_PLATFORMS.find((platform) => platform.id === link.platform)
            ?.name ||
          getPlatformBrand(link.platform).name,
        href: link.url,
        external: /^https?:\/\//i.test(link.url),
      }));

    return {
      storiesEnabled: enabledSectionKeys.has("stories"),
      orderedSections: sections,
      footerSectionLinks: sectionLinks,
      footerMoreLinks: moreLinks,
      footerSocialLinks: socialLinks,
    };
  }, [profile.sections, profile.socialLinks]);
  const whatsappHref = profile.whatsappNumber
    ? `https://wa.me/${profile.whatsappNumber.replace(/\D/g, "")}`
    : undefined;
  const heroBackgroundType =
    content.heroBackgroundType ||
    (profile.cover ? "image" : content.heroYoutubeUrl ? "video" : "color");
  const heroVideo =
    heroBackgroundType === "video"
      ? bannerVideoSource(content.heroYoutubeUrl)
      : null;
  const heroImageOpenable =
    interactive && heroBackgroundType === "image" && Boolean(profile.cover);
  const heroColor = parseWebsiteColor(
    content.heroBackgroundColor || profile.accentColor,
  ).css;
  const renderPageSurface = fullPage || embeddedPreview;
  const shell = fullPage
    ? "min-h-[100svh] max-w-none border-0 shadow-none"
    : `border border-slate-200 shadow-xl dark:border-white/10 ${compact ? "max-w-[260px] rounded-[28px]" : viewportClasses[viewport]}`;
  const themeClass = dark
    ? "dark bg-[#0b1210] text-white"
    : variationClasses[
        profile.variation === "glass" ? "soft" : profile.variation
      ];
  const heroControlClass =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-900/[0.08] bg-white/75 text-current shadow-sm backdrop-blur-xl transition duration-300 hover:border-[var(--business-website-color)]/60 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-website-color)]/25 dark:border-white/[0.08] dark:bg-slate-950/70 dark:hover:bg-slate-950/85";
  const openImageViewer = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const target = event.target as HTMLElement;
      const trigger = target.closest<HTMLElement>("[data-mini-image-src]");
      const src = trigger?.dataset.miniImageSrc;
      if (!trigger || !src) return;
      const group = trigger.dataset.miniImageGroup || "page";

      event.preventDefault();
      const uniqueImages = new Map<string, LightboxImage>();
      previewRef.current
        ?.querySelectorAll<HTMLElement>("[data-mini-image-src]")
        .forEach((element) => {
          if ((element.dataset.miniImageGroup || "page") !== group) return;
          const imageSrc = element.dataset.miniImageSrc;
          if (!imageSrc || uniqueImages.has(imageSrc)) return;
          uniqueImages.set(imageSrc, {
            src: imageSrc,
            alt: element.dataset.miniImageAlt || "",
          });
        });
      const images = Array.from(uniqueImages.values());
      const index = Math.max(
        0,
        images.findIndex((image) => image.src === src),
      );
      setLightbox({ images, index });
    },
    [interactive],
  );

  return (
    <motion.div
        ref={previewRef}
        onClickCapture={openImageViewer}
        className={`mini-website-ltr relative isolate mx-auto w-full overflow-x-hidden transition-colors duration-500 ${shell} ${themeClass} ${renderPageSurface ? "mini-website-motion bg-[#faf8ff] dark:bg-[#09100e]" : ""}`}
        dir="ltr"
        initial={fullPage ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        style={
          {
            "--business-website-color": accentColor.primary,
            "--theme-primary": accentColor.primary,
            "--theme-css": accentColor.css,
            "--portfolio-surface-plain": dark ? "#111827" : "#ffffff",
            "--portfolio-surface-soft": dark
              ? `color-mix(in srgb, ${accentColor.primary} 7%, #111827)`
              : `color-mix(in srgb, ${accentColor.primary} 6%, #f2f3ff)`,
            "--portfolio-surface-mid": dark
              ? `color-mix(in srgb, ${accentColor.primary} 11%, #172033)`
              : `color-mix(in srgb, ${accentColor.primary} 10%, #eaedff)`,
            "--portfolio-surface-high": dark
              ? `color-mix(in srgb, ${accentColor.primary} 15%, #1f2937)`
              : `color-mix(in srgb, ${accentColor.primary} 14%, #e2e7ff)`,
          } as CSSProperties
        }
      >
        {renderPageSurface && (
          <PortfolioDecorations
            accent={accentColor.primary}
            backgroundStyle={profile.backgroundStyle || "grid"}
          />
        )}
        {fullPage && !prefersReducedMotion && (
          <motion.div
            className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left"
            style={{
              background: accentColor.css,
              scaleX: scrollYProgress,
            }}
            aria-hidden="true"
          />
        )}
        <header
          id="portfolio-home"
          className={`relative z-10 mx-auto ${fullPage ? "max-w-[1380px] px-4 pt-4 sm:px-6 sm:pt-6 xl:px-8 xl:pt-8" : "p-3"}`}
        >
          <motion.div
            className={`relative overflow-hidden border border-slate-900/[0.08] bg-slate-200 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.45)] dark:border-white/[0.08] dark:bg-slate-900 ${
              fullPage
                ? `${heroVideo ? "aspect-video sm:aspect-[16/7]" : "h-52 sm:h-72 lg:h-[25rem] xl:h-[28rem]"} rounded-[1.75rem] sm:rounded-[2.25rem]`
                : `${heroVideo ? "aspect-video" : "h-36"} rounded-2xl`
            } ${heroImageOpenable ? "cursor-zoom-in" : ""}`}
            data-mini-hero
            data-mini-image-src={
              heroImageOpenable ? profile.cover : undefined
            }
            data-mini-image-alt="وێنەی بەرگ"
            data-mini-image-group="hero"
            role={heroImageOpenable ? "button" : undefined}
            tabIndex={heroImageOpenable ? 0 : undefined}
            aria-label={
              heroImageOpenable ? "کردنەوەی وێنەی بەرگ" : undefined
            }
            onKeyDown={(event) => {
              if (
                heroImageOpenable &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
            style={{
              background:
                heroBackgroundType === "color" ? heroColor : accentColor.css,
              y: heroY,
            }}
            initial={
              fullPage
                ? { opacity: 0, scale: prefersReducedMotion ? 1 : 0.992 }
                : false
            }
            animate={{ opacity: 1, scale: 1 }}
          >
            {heroBackgroundType === "image" && profile.cover && (
              <Image
                src={profile.cover}
                alt="وێنەی بەرگ"
                fill
                className="object-cover"
                unoptimized
                priority={fullPage}
              />
            )}
            {heroVideo && (
              <BannerVideo
                source={heroVideo}
                interactive={interactive && !compact}
              />
            )}
          </motion.div>

          <motion.div
            className={
              fullPage
                ? "relative z-20 mx-1 mt-3 flex items-center justify-end gap-2 sm:mx-2"
                : "absolute right-7 top-7 z-20 flex items-center gap-2"
            }
            data-mini-controls
            initial={fullPage ? { opacity: 0, y: -8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <motion.button
              type="button"
              onClick={() => setDark((value) => !value)}
              className={heroControlClass}
              aria-label="ڕووکار"
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={dark ? "sun" : "moon"}
                  initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
                  transition={{ duration: 0.24 }}
                >
                  {dark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            {content.showShareTools !== false && (
              <motion.button
                type="button"
                onClick={() => setShareOpen(true)}
                className={heroControlClass}
                data-mini-open="mini:share"
                data-mini-open-label="هاوبەشکردن"
                aria-label="هاوبەشکردن"
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Share2 className="h-4 w-4" />
              </motion.button>
            )}
          </motion.div>

          <motion.div
            className={`relative z-10 mx-auto text-center ${
              fullPage ? "-mt-16 max-w-3xl px-3 sm:-mt-20" : "-mt-10 px-2"
            }`}
            initial={
              fullPage
                ? { opacity: 0, y: prefersReducedMotion ? 0 : 16 }
                : false
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.span
              className={`relative mx-auto block overflow-hidden rounded-full border-[3px] border-white/90 bg-white shadow-[0_20px_48px_-30px_rgba(15,23,42,0.42)] dark:border-[#09100e]/90 dark:bg-[#09100e] ${
                fullPage ? "h-32 w-32 sm:h-40 sm:w-40" : "h-20 w-20"
              } ${interactive ? "cursor-zoom-in" : ""}`}
              data-mini-image-src={interactive ? profile.avatar : undefined}
              data-mini-image-alt={interactive ? profile.name : undefined}
              data-mini-image-group="hero"
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `کردنەوەی وێنەی ${profile.name}` : undefined}
              onKeyDown={(event) => {
                if (interactive && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              whileHover={
                interactive && fullPage ? { scale: 1.015 } : undefined
              }
            >
              <Image
                src={profile.avatar || "/images/DefaultAvatar.png"}
                alt={profile.name}
                fill
                className="object-cover"
                unoptimized
              />
            </motion.span>
            <motion.h1
              className={`flex items-center justify-center gap-2 font-black tracking-[-0.045em] [overflow-wrap:anywhere] ${
                fullPage
                  ? "mt-5 text-3xl leading-tight sm:text-5xl"
                  : "mt-3 text-xl"
              }`}
              dir="auto"
              initial={fullPage ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              <span>{profile.name}</span>
              <VerifiedBadge compact={!fullPage} />
            </motion.h1>
            <motion.p
              className={`font-black ${
                fullPage ? "mt-3 text-base sm:text-xl" : "mt-2 text-xs"
              }`}
              style={{ color: accentColor.primary }}
              dir="auto"
              initial={fullPage ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              {profile.headline}
            </motion.p>
            <motion.p
              className={`mx-auto opacity-60 ${
                fullPage
                  ? "mt-4 max-w-2xl text-sm leading-7 sm:text-base sm:leading-8"
                  : "mt-2 text-[11px] leading-5"
              }`}
              dir="auto"
              initial={fullPage ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 0.34 }}
            >
              {profile.bio}
            </motion.p>
            {content.showViewCount !== false && "views" in profile && (
              <p
                className={`mx-auto flex items-center justify-center gap-1.5 font-semibold text-slate-400 dark:text-slate-500 ${
                  fullPage ? "mt-3 text-xs sm:text-sm" : "mt-2 text-[10px]"
                }`}
                dir="auto"
              >
                <Eye className="h-3.5 w-3.5" />
                {profile.views.toLocaleString("en-US")}
              </p>
            )}
          </motion.div>

          {storiesEnabled && profile.stories.length > 0 && (
            <motion.section
              className={`mx-auto ${
                fullPage ? "mt-9 max-w-4xl px-1 sm:mt-12" : "mt-5 px-1"
              }`}
              initial={
                fullPage
                  ? { opacity: 0, y: prefersReducedMotion ? 0 : 18 }
                  : false
              }
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
            >
              <div className="mb-4 flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-current/10 sm:w-16" />
                <h2
                  className={`text-center font-black ${
                    fullPage ? "text-base sm:text-lg" : "text-xs"
                  }`}
                  dir="auto"
                >
                  نوێترین ستۆرییەکان
                </h2>
                <span className="h-px w-10 bg-current/10 sm:w-16" />
              </div>
              <StoriesStrip
                stories={profile.stories}
                interactive={interactive}
              />
            </motion.section>
          )}
        </header>

        <main
          className={`relative z-10 mx-auto grid grid-cols-1 ${
            fullPage
              ? "max-w-[1380px] gap-5 px-4 pb-20 pt-9 sm:gap-6 sm:px-6 sm:pt-12 xl:grid-cols-2 xl:gap-7 xl:px-8 xl:pb-28"
              : "gap-3 pb-4"
          }`}
        >
          {orderedSections.map((section, index) => (
            <div
              id={`portfolio-${section.key}`}
              key={section.key}
              className={`min-w-0 transition-colors duration-300 [&:empty]:hidden ${
                fullPage
                  ? `${sectionPlacementClass(section.key)} mini-dynamic-section-glass rounded-[1.75rem] p-5 sm:p-7 lg:rounded-[2rem] lg:p-9`
                  : embeddedPreview
                    ? "mini-dynamic-section-glass rounded-2xl p-3"
                    : ""
              }`}
            >
              <LazySectionSkeleton fullPage={fullPage}>
                <DynamicSection
                  section={section.key}
                  profile={profile}
                  fullPage={fullPage}
                  interactive={interactive}
                  whatsappHref={whatsappHref}
                  leadFormEndpoint={leadFormEndpoint}
                  onLeadSubmitted={onLeadSubmitted}
                  dark={section.key === "location" ? dark : undefined}
                  index={index}
                />
              </LazySectionSkeleton>
            </div>
          ))}
        </main>

        {fullPage ? (
          <div className="mini-public-footer-glass relative z-10 mx-auto w-full max-w-[1380px] px-4 pb-4 sm:px-6 sm:pb-6 xl:px-8 xl:pb-8">
            <PublicSiteFooter
              brandName={profile.name}
              logo={profile.avatar}
              description={profile.headline || profile.bio}
              accentColor={accentColor.primary}
              columns={[
                {
                  title: "بەشەکان",
                  links:
                    footerSectionLinks.length > 0
                      ? footerSectionLinks
                      : [{ label: "سەرەتا", href: "#portfolio-home" }],
                },
                {
                  title: footerSocialLinks.length > 0 ? "پەیوەندی" : "زیاتر",
                  links:
                    footerSocialLinks.length > 0
                      ? footerSocialLinks
                      : footerMoreLinks.length > 0
                        ? footerMoreLinks
                        : [{ label: "سەرەتا", href: "#portfolio-home" }],
                },
              ]}
              // UTC, so the server's clock and the reader's cannot disagree
              // about the year for the few hours their calendars overlap.
              copyrightText={`© ${new Date().getUTCFullYear()} ${profile.name}. هەموو مافەکان پارێزراون.`}
              bottomLinks={[
                { label: "گەڕانەوە بۆ سەرەوە", href: "#portfolio-home" },
              ]}
              showVerifiedBadge
              verifiedLabel="پشتڕاستکراوە"
              poweredByLabel="دروستکراوە لەلایەن"
            />
          </div>
        ) : (
          <footer className="relative z-10 border-t border-slate-900/[0.07] px-4 py-8 dark:border-white/[0.07]">
            <div className="mx-auto flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="text-sm font-black" dir="auto">
                  {profile.name}
                </strong>
                <p className="mt-1 text-[10px] font-bold opacity-45" dir="auto">
                  {profile.headline}
                </p>
              </div>
              <a
                href="#portfolio-home"
                className="inline-flex items-center gap-2 text-xs font-black"
                style={{ color: accentColor.primary }}
              >
                گەڕانەوە بۆ سەرەوە
                <ChevronUp className="h-4 w-4" />
              </a>
            </div>
          </footer>
        )}

        {portalReady &&
          shareOpen &&
          createPortal(
            <div
              className={`mini-website-ltr ${dark ? "dark" : ""}`}
              dir="ltr"
              style={
                {
                  "--business-website-color": accentColor.primary,
                  "--theme-primary": accentColor.primary,
                  "--theme-css": accentColor.css,
                } as CSSProperties
              }
            >
              <ShareDialog
                profile={profile}
                onClose={() => setShareOpen(false)}
              />
            </div>,
            document.body,
          )}
        {portalReady &&
          createPortal(
            <AnimatePresence>
              {lightbox && (
                <ImageLightbox
                  images={lightbox.images}
                  index={lightbox.index}
                  accent={accentColor.primary}
                  onIndexChange={(index) =>
                    setLightbox((current) =>
                      current ? { ...current, index } : current,
                    )
                  }
                  onClose={() => setLightbox(null)}
                />
              )}
            </AnimatePresence>,
            document.body,
          )}
    </motion.div>
  );
}

/**
 * The social links a business selected.
 *
 * Deliberately plain: a brand chip, the platform name, and the English name
 * beneath it. Earlier versions layered a tinted wash, a decorative ring, a
 * rotating icon and a heavy shadow onto every card, which fought with the brand
 * colours the chips already carry. Hover is a single quiet lift.
 */
// `section` remains a plain string so legacy renderers can coexist with the
// persisted section registry while older saved pages are upgraded safely.
const DynamicSection = memo(function DynamicSection({
  section,
  profile,
  fullPage,
  interactive,
  whatsappHref,
  leadFormEndpoint,
  onLeadSubmitted,
  dark,
  index = 0,
}: {
  section: string;
  profile: ProfileLike;
  fullPage: boolean;
  interactive: boolean;
  whatsappHref?: string;
  leadFormEndpoint?: string;
  onLeadSubmitted?: (eventId: string) => void;
  dark?: boolean;
  index?: number;
}) {
  const entry = SECTION_REGISTRY[section];
  if (!entry) return null;
  // The business's brand colour when it has one, so the map, pin and controls
  // match the rest of their site rather than the mini website's own default.
  const brand = parseWebsiteColor(profile.accentColor).primary;
  const tone = sectionHeaderTone(section);
  const ctx: SectionRegistryContext = {
    profile,
    fullPage,
    interactive,
    whatsappHref,
    leadFormEndpoint,
    onLeadSubmitted,
    dark,
    index,
    accent: brand,
    common: { fullPage, accent: brand, tone, index },
    header: { title: entry.label, icon: entry.icon },
  };
  return entry.render(ctx);
});