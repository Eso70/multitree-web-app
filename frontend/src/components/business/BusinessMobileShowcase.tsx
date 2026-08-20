"use client";

import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LinktreePresentation as Linktree } from "@linktree/types";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { DynamicTemplate } from "@/components/templates/DynamicTemplate";
import {
  TEMPLATE_OPTIONS,
  type TemplateKey,
} from "@/lib/templates/config";
import {
  createBusinessContactPreviewLinks,
  createLinktreeTemplatePreview,
  LINKTREE_TEMPLATE_PREVIEW_THEMES,
} from "@/components/templates/preview-fixtures";
import {
  getMiniWebsiteTemplateComponent,
  MINI_WEBSITE_TEMPLATE_OPTIONS,
  type MiniWebsiteTemplateComponent,
} from "@/components/templates/mini-website";
import {
  createMiniWebsiteDraft,
  type MiniWebsiteDraft,
} from "@/features/mini-website/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
  BUSINESS_LANDING_SECTION_IDS,
} from "@/components/business/business-landing-sections";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";


interface MobileWebsitePreview {
  name: string;
  headline?: string | null;
  bio?: string | null;
  avatar?: string | null;
  cover?: string | null;
  accentColor?: string | null;
}

interface BusinessMobileShowcaseProps {
  businessName: string;
  businessLogo?: string | null;
  phoneNumber?: string | null;
  accentColor: string;
  miniWebsite?: MobileWebsitePreview | null;
  title?: string;
  description?: string;
}

type ShowcaseScreen =
  | {
      id: string;
      label: string;
      kind: "linktree";
      templateId: TemplateKey;
      linktree: Linktree;
    }
  | {
      id: string;
      label: string;
      kind: "mini-website";
      templateId: string;
      component: MiniWebsiteTemplateComponent;
    };

const MOBILE_STACK_OFFSETS = [-1, 0, 1] as const;
const WIDE_STACK_OFFSETS = [-2, -1, 0, 1, 2] as const;
const MOBILE_PHONE_LAYOUTS = [
  "left-[1%] w-[49%] max-[380px]:w-[47%]",
  "left-[25.5%] w-[49%] max-[380px]:left-[26.5%] max-[380px]:w-[47%]",
  "right-[1%] w-[49%] max-[380px]:w-[47%]",
] as const;
const WIDE_PHONE_LAYOUTS = [
  "left-[1%] w-[36%] max-[380px]:left-[2%] max-[380px]:w-[34%] sm:left-[2%] sm:w-[29%] lg:left-[4%] lg:w-[23%]",
  "left-[16%] w-[39%] max-[380px]:left-[17%] max-[380px]:w-[37%] sm:left-[19%] sm:w-[31%] lg:left-[21%] lg:w-[25%]",
  "left-[30.5%] w-[39%] max-[380px]:left-[31.5%] max-[380px]:w-[37%] sm:left-[34.5%] sm:w-[31%] lg:left-[37.5%] lg:w-[25%]",
  "right-[16%] w-[39%] max-[380px]:right-[17%] max-[380px]:w-[37%] sm:right-[19%] sm:w-[31%] lg:right-[21%] lg:w-[25%]",
  "right-[1%] w-[36%] max-[380px]:right-[2%] max-[380px]:w-[34%] sm:right-[2%] sm:w-[29%] lg:right-[4%] lg:w-[23%]",
] as const;

const TEMPLATE_PREVIEW_LINKS = createBusinessContactPreviewLinks();

const SHOWCASE_SCREENS: ShowcaseScreen[] = [
  ...TEMPLATE_OPTIONS.map((template) => ({
    id: `linktree-${template.id}`,
    label: `${template.name} Linktree`,
    kind: "linktree" as const,
    templateId: template.id as TemplateKey,
    linktree: createLinktreeTemplatePreview({
      templateId: template.id as TemplateKey,
    }),
  })),
  ...MINI_WEBSITE_TEMPLATE_OPTIONS.map((template) => ({
    id: `mini-website-${template.id}`,
    label: `${template.name} Mini Website`,
    kind: "mini-website" as const,
    templateId: template.id,
    component: getMiniWebsiteTemplateComponent(template.id),
  })),
];

const PHONE_SPRING = {
  type: "spring",
  stiffness: 165,
  damping: 28,
  mass: 0.82,
} as const;

const CONTROL_SPRING = {
  type: "spring",
  stiffness: 340,
  damping: 24,
} as const;

const getPhoneScale = (distanceFromCenter: number) => {
  if (distanceFromCenter === 0) return 1.065;
  if (distanceFromCenter === 1) return 0.98;
  return 0.91;
};

const ShowcasePhoneContent = memo(function ShowcasePhoneContent({
  screen,
  miniWebsiteDraft,
}: {
  screen: ShowcaseScreen;
  miniWebsiteDraft: MiniWebsiteDraft;
}) {
  const MiniWebsiteTemplate =
    screen.kind === "mini-website" ? screen.component : null;

  return (
    <PhoneMockup
      className="absolute inset-x-0 top-0"
      ariaLabel={`${screen.label} mobile preview`}
      name={screen.label}
      statusBarClassName="!text-white mix-blend-difference"
    >
      <div className="pointer-events-none h-full overflow-hidden">
        {screen.kind === "linktree" ? (
          <DynamicTemplate
            linktree={screen.linktree}
            links={TEMPLATE_PREVIEW_LINKS}
            theme={LINKTREE_TEMPLATE_PREVIEW_THEMES[screen.templateId]}
            onLinkClick={() => undefined}
          />
        ) : MiniWebsiteTemplate ? (
          <MiniWebsiteTemplate
            profile={miniWebsiteDraft}
            compact
            viewport="mobile"
            interactive={false}
            fullPage={false}
            embeddedPreview
          />
        ) : null}
      </div>
    </PhoneMockup>
  );
});

export function BusinessMobileShowcase({
  businessName,
  businessLogo,
  phoneNumber,
  accentColor,
  miniWebsite,
  title = "هەموو دیزاینەکان، لەسەر مۆبایل.",
  description =
    "قالبەکانی لینکتری و ماڵپەڕی بچووک بە شێوازی ڕاستەقینە و گونجاو بۆ شاشەی مۆبایل ببینە.",
}: BusinessMobileShowcaseProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const useWideLayout = useMediaQuery("(min-width: 640px)");
  const [activeIndex, setActiveIndex] = useState(0);
  const miniWebsiteDraft = useMemo<MiniWebsiteDraft>(() => {
    const draft = createMiniWebsiteDraft({
      businessLogo,
      businessDefaultAvatar: miniWebsite?.avatar || businessLogo,
      accentColor,
    });
    return {
      ...draft,
      name: miniWebsite?.name || businessName,
      slug: "business-template-preview",
      headline: miniWebsite?.headline || businessName,
      bio:
        miniWebsite?.bio ||
        "زانیاری و خزمەتگوزارییەکانی کاروبار لە یەک شوێندا.",
      avatar: miniWebsite?.avatar || businessLogo || draft.avatar,
      cover: miniWebsite?.cover || null,
      accentColor: miniWebsite?.accentColor || accentColor,
      status: "published",
      primaryAction: phoneNumber ? "whatsapp" : "none",
      whatsappNumber: phoneNumber?.replace(/\D/g, "") || "",
    };
  }, [accentColor, businessLogo, businessName, miniWebsite, phoneNumber]);

  const screens = SHOWCASE_SCREENS;
  const stackOffsets = useWideLayout
    ? WIDE_STACK_OFFSETS
    : MOBILE_STACK_OFFSETS;
  const phoneLayouts = useWideLayout
    ? WIDE_PHONE_LAYOUTS
    : MOBILE_PHONE_LAYOUTS;
  const centerLayoutIndex = Math.floor(stackOffsets.length / 2);
  const visibleScreens = useMemo(
    () =>
      stackOffsets.map((offset, layoutIndex) => ({
        layoutIndex,
        screenIndex:
          (activeIndex + offset + screens.length) % screens.length,
      })),
    [activeIndex, screens.length, stackOffsets],
  );
  const showPrevious = useCallback(() => {
    setActiveIndex(
      (current) => (current - 1 + screens.length) % screens.length,
    );
  }, [screens.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % screens.length);
  }, [screens.length]);

  return (
    <PublicSection
      id={BUSINESS_LANDING_SECTION_IDS.mobileShowcase}
      labelledBy="business-mobile-showcase-title"
      className="pb-0 sm:pb-0 lg:pb-0"
      decorations={
        <BusinessSectionDecorations
          colors={BUSINESS_LANDING_DECORATION_COLORS.mobileShowcase}
          labels={BUSINESS_LANDING_DECORATION_LABELS.mobileShowcase}
          variant={5}
        />
      }
    >
        <PublicSectionHeading
          id="business-mobile-showcase-title"
          title={title}
          description={description}
        />

        <div
          role="group"
          aria-label="Mobile template carousel"
          className="relative isolate mx-auto mt-20 h-[calc(100vw+1rem)] max-w-6xl overflow-hidden sm:mt-24 sm:h-[33rem] lg:h-[38rem]"
        >
          {visibleScreens.map(({ screenIndex, layoutIndex }) => {
            const screen = screens[screenIndex];
            if (!screen) return null;
            const distanceFromCenter = Math.abs(
              layoutIndex - centerLayoutIndex,
            );
            const selected = distanceFromCenter === 0;

            return (
              <motion.div
                key={screen.id}
                layout="position"
                layoutDependency={activeIndex}
                aria-hidden={!selected}
                className={`pointer-events-none absolute bottom-0 ${phoneLayouts[layoutIndex]}`}
                style={
                  {
                    zIndex: 30 - distanceFromCenter * 10,
                  } as CSSProperties
                }
                initial={false}
                transition={reduceMotion ? { duration: 0 } : PHONE_SPRING}
              >
                <motion.div
                  className="origin-bottom"
                  initial={false}
                  animate={{ scale: getPhoneScale(distanceFromCenter) }}
                  transition={reduceMotion ? { duration: 0 } : PHONE_SPRING}
                >
                  <div className="relative aspect-[8/15.3] overflow-hidden">
                    <ShowcasePhoneContent
                      screen={screen}
                      miniWebsiteDraft={miniWebsiteDraft}
                    />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
          <div className="absolute left-1 top-1/2 z-30 -translate-y-1/2 sm:left-3">
            <motion.button
              type="button"
              aria-label="Previous template"
              className="grid size-10 place-items-center rounded-full bg-white/80 text-slate-900 shadow-lg shadow-black/10 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 dark:bg-slate-900/75 dark:text-white dark:shadow-black/35 min-[381px]:size-11 sm:size-12"
              style={{ "--tw-ring-color": accentColor } as CSSProperties}
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={reduceMotion ? { duration: 0 } : CONTROL_SPRING}
              onClick={showPrevious}
            >
              <ChevronLeft aria-hidden="true" className="size-5 sm:size-6" />
            </motion.button>
          </div>
          <div className="absolute right-1 top-1/2 z-30 -translate-y-1/2 sm:right-3">
            <motion.button
              type="button"
              aria-label="Next template"
              className="grid size-10 place-items-center rounded-full bg-white/80 text-slate-900 shadow-lg shadow-black/10 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 dark:bg-slate-900/75 dark:text-white dark:shadow-black/35 min-[381px]:size-11 sm:size-12"
              style={{ "--tw-ring-color": accentColor } as CSSProperties}
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={reduceMotion ? { duration: 0 } : CONTROL_SPRING}
              onClick={showNext}
            >
              <ChevronRight aria-hidden="true" className="size-5 sm:size-6" />
            </motion.button>
          </div>

          <p className="sr-only" aria-live="polite">
            {screens[activeIndex]?.label}
          </p>
        </div>
    </PublicSection>
  );
}
