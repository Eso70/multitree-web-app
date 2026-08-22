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

/** Which screens flank the active one: one either side, on every device. */
const STACK_OFFSETS = [-1, 0, 1] as const;

/**
 * How wide each phone is, as a share of the stage.
 *
 * The three sit in a plain flex row, so they are beside each other by
 * construction at every size — no absolute anchors to retune per breakpoint,
 * and no JavaScript media query deciding the arrangement. Phones take a little
 * more of the row on a phone screen, where there is less of it to go round, and
 * overlap slightly there so the stack still reads as depth.
 */
const PHONE_SLOT_WIDTH =
  "w-[38%] -mx-[3%] sm:w-[34%] sm:mx-0 lg:w-[30%]";

/**
 * The stage's own proportions, derived from the slot above: a phone is
 * `8 / 17` of its width tall, and the centre one is scaled up by
 * `getPhoneScale`. Expressing it as an aspect ratio rather than a fixed height
 * means the stage is exactly as tall as the phones it holds, so none is ever
 * cropped and no dead space is left under them.
 */
const STAGE_ASPECT = "aspect-[1/0.86] sm:aspect-[1/0.77] lg:aspect-[1/0.68]";

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

/**
 * Depth, as scale alone. Kept shallow: the phones sit shoulder to shoulder in
 * the row, and shrinking the outer two hard would open gaps between them.
 */
const getPhoneScale = (distanceFromCenter: number) => {
  if (distanceFromCenter === 0) return 1.06;
  if (distanceFromCenter === 1) return 0.92;
  return 0.86;
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
      ariaLabel={`${screen.label} mobile preview`}
      name={screen.label}
      statusBarClassName="!text-white mix-blend-difference"
    >
      {/* The frame's own viewport clips and scrolls now, so this wrapper must
          not crop the page a second time. */}
      <div className="pointer-events-none min-h-full">
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
  const stackOffsets = STACK_OFFSETS;
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
      className="pb-16 sm:pb-20 lg:pb-24"
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
          className={`relative isolate mx-auto mt-20 flex max-w-6xl items-end justify-center sm:mt-24 ${STAGE_ASPECT}`}
        >
          {visibleScreens.map(({ screenIndex, layoutIndex }) => {
            const screen = screens[screenIndex];
            if (!screen) return null;
            const distanceFromCenter = Math.abs(
              layoutIndex - centerLayoutIndex,
            );
            const selected = distanceFromCenter === 0;

            return (
              // Keyed by screen, so advancing the carousel re-orders these
              // elements in the row and `layout="position"` animates each one
              // across to its new slot. Scale sits on a child of its own: both
              // are written as `transform`, and on one element the layout
              // projection would overwrite it.
              <motion.div
                key={screen.id}
                layout="position"
                layoutDependency={activeIndex}
                aria-hidden={!selected}
                className={`pointer-events-none shrink-0 ${PHONE_SLOT_WIDTH}`}
                style={
                  {
                    zIndex: 30 - distanceFromCenter * 10,
                  } as CSSProperties
                }
                initial={false}
                transition={reduceMotion ? { duration: 0 } : PHONE_SPRING}
              >
                  <motion.div
                    className="w-full origin-bottom"
                    initial={false}
                    animate={{ scale: getPhoneScale(distanceFromCenter) }}
                    transition={reduceMotion ? { duration: 0 } : PHONE_SPRING}
                  >
                    <ShowcasePhoneContent
                      screen={screen}
                      miniWebsiteDraft={miniWebsiteDraft}
                    />
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
