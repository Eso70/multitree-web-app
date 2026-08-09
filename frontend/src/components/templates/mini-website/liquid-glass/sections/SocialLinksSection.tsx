import Image from "next/image";
import { createElement } from "react";
import { motion } from "motion/react";
import { type Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import type { ProfileLike } from "../../types";
import { CUSTOM_ICONS_MAP } from "@/lib/config/icons";
import { SOCIAL_PLATFORMS } from "@/features/link-editor/modal-constants";
import { parseUploadedIconValue } from "@/features/link-editor/custom-icon-value";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import { PlatformIcon } from "@/lib/brand/PlatformVisuals";

export function SocialLinksSection({
  profile,
  interactive,
  ...frame
}: {
  profile: ProfileLike;
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  title: string;
  description?: string;
  icon: typeof Star;
  tone?: string;
  index?: number;
}) {
  const platformMap = new Map(
    SOCIAL_PLATFORMS.map((platform) => [platform.id, platform]),
  );
  const links = [...(profile.socialLinks || [])]
    .filter((link) => link.enabled !== false && link.url)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (!links.length) return null;

  return (
    <SectionFrame {...frame}>
      {/* Denser as the screen grows: two up on a phone, four on a tablet, six
          across on desktop. These are compact link chips, so a wide screen fits
          many more than the three the grid used to stop at. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:gap-3.5 xl:grid-cols-5">
        {links.map((link) => {
          const platform = platformMap.get(link.platform);
          if (!platform) return null;
          const CustomIcon =
            link.customIcon && CUSTOM_ICONS_MAP[link.customIcon]
              ? CUSTOM_ICONS_MAP[link.customIcon]
              : null;
          const uploadedIcon = parseUploadedIconValue(link.customIcon);
          const label = link.displayName?.trim() || platform.name;
          // Only shown when it adds something — a card already labelled in
          // English should not repeat itself.
          const englishName = getPlatformBrand(platform.id).name;
          const showEnglish = englishName && englishName !== label;

          return (
            <motion.a
              key={link.id}
              href={interactive ? link.url : undefined}
              onClick={(event) => {
                if (!interactive) event.preventDefault();
              }}
              target={
                interactive && /^https?:/i.test(link.url) ? "_blank" : undefined
              }
              rel="noreferrer"
              className="mini-glass-action group flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-900/10 bg-white/55 px-3 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.03)] transition duration-200 hover:border-[var(--business-website-color)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-website-color)]/30 dark:border-white/10 dark:bg-white/[0.04] lg:gap-3 lg:px-3.5"
              whileHover={interactive ? { y: -3, scale: 1.012 } : undefined}
              whileTap={interactive ? { scale: 0.975 } : undefined}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                style={
                  uploadedIcon?.hasBackground
                    ? undefined
                    : { background: link.customColor || platform.background }
                }
              >
                {uploadedIcon ? (
                  <Image
                    src={uploadedIcon.url}
                    alt=""
                    width={48}
                    height={48}
                    className={
                      uploadedIcon.hasBackground
                        ? "h-full w-full object-cover"
                        : "h-4 w-4 object-contain"
                    }
                    unoptimized
                  />
                ) : CustomIcon ? (
                  createElement(CustomIcon, { className: "h-4 w-4" })
                ) : (
                  <PlatformIcon
                    platform={platform.id}
                    customColor={link.customColor}
                    className="h-4 w-4"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <strong
                  className="block truncate text-[13px] font-black tracking-tight sm:text-sm"
                  dir="auto"
                >
                  {label}
                </strong>
                {showEnglish && (
                  <span
                    className="mt-0.5 block truncate text-[10px] font-bold opacity-45"
                    dir="ltr"
                  >
                    {englishName}
                  </span>
                )}
              </span>
            </motion.a>
          );
        })}
      </div>
    </SectionFrame>
  );
}
