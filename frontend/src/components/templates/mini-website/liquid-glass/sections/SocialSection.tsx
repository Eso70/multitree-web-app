import { SectionFrame } from "../LiquidGlassSectionFrame";
import { safeUrl } from "../liquid-glass-utils";
import { records } from "./section-utils";
import { PlatformBadge } from "@/lib/brand/PlatformVisuals";
import { getPlatformBrand } from "@/lib/brand/platform-brands";
import type { MiniWebsiteContent } from "@/features/mini-website/types";
import { ExternalLink } from "lucide-react";

export function SocialSection({
  content,
  interactive,
  showAccounts,
  showPosts,
  ...frame
}: {
  content: MiniWebsiteContent;
  interactive: boolean;
  showAccounts: boolean;
  showPosts: boolean;
  fullPage: boolean;
  accent: string;
  title: string;
  description?: string;
  icon: typeof ExternalLink;
  tone?: string;
  index?: number;
}) {
  const items = showAccounts
    ? [
        { platform: "tiktok", url: content.socialTikTok },
        { platform: "instagram", url: content.socialInstagram },
        { platform: "facebook", url: content.socialFacebook },
        { platform: "youtube", url: content.socialYoutube },
        { platform: "snapchat", url: content.socialSnapchat },
        { platform: "telegram", url: content.socialTelegram },
        { platform: "linkedin", url: content.socialLinkedin },
        { platform: "discord", url: content.socialDiscord },
        { platform: "googleReview", url: content.socialGoogleReview },
      ].filter((item) => item.url)
    : [];
  const posts = showPosts ? records(content.socialPostsText) : [];
  if (!items.length && !posts.length) return null;
  return (
    <SectionFrame {...frame}>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map(({ platform, url }) => (
            <a
              key={platform}
              href={interactive ? url : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!interactive) e.preventDefault();
              }}
              className="group flex min-h-16 items-center gap-3 border-b border-current/10 py-3 text-xs font-black transition hover:-translate-y-0.5"
            >
              <PlatformBadge
                platform={platform}
                className="h-10 w-10 rounded-xl transition group-hover:scale-105"
                iconClassName="h-5 w-5"
              />
              <span className="min-w-0 truncate">
                {getPlatformBrand(platform).name}
              </span>
              <ExternalLink className="ml-auto hidden h-3.5 w-3.5 opacity-25 sm:block" />
            </a>
          ))}
        </div>
      )}
      {posts.length > 0 && (
        <div
          className={`${items.length ? "mt-8 border-t border-current/10 pt-5" : ""} divide-y divide-current/10`}
        >
          <p className="pb-2 text-[10px] font-black tracking-[0.2em] opacity-40">
            نوێترین پۆستەکان
          </p>
          {posts.map((item, index) => {
            const href =
              safeUrl(item.detail) ||
              safeUrl(item.third) ||
              safeUrl(item.title);
            return (
              <a
                key={`${item.raw}-${index}`}
                href={interactive ? href : undefined}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  if (!interactive) event.preventDefault();
                }}
                className="group flex items-center gap-4 py-4"
              >
                <span className="font-mono text-[10px] opacity-30">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-xs font-black sm:text-sm"
                  dir="auto"
                >
                  {href === item.title ? `پۆستی ${index + 1}` : item.title}
                </span>
                <ExternalLink className="h-4 w-4 opacity-30 transition group-hover:opacity-70" />
              </a>
            );
          })}
        </div>
      )}
    </SectionFrame>
  );
}