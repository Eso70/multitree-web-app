import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";
import {
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";

export function SponsorKrdHero() {
  return (
    <PublicMarketingHero
      accentColor={SPONSOR_KRD_ACCENT_COLOR}
      eyebrow="پلاتفۆرمی SaaS بۆ هەژمارە ڕیکلامییەکان"
      title={
        <>
          پەیوەندییەکی ڕێکخراو بۆ{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: SPONSOR_KRD_ACCENT_GRADIENT }}
          >
            بەڕێوەبردنی ڕیکلام
          </span>
        </>
      }
      description="Sponsor.krd ژێرخانی پارێزراو و یەکگرتوو بۆ پەیوەستکردن بە هەژمارە ڕیکلامییەکانی TikTok دابین دەکات. پەیوەندیی بەڕێوەبەری پلاتفۆرم بە جیا بەڕێوەدەبرێت، و پەیوەستکردنی هەژماری تایبەتی بزنسەکان لە قۆناغی داهاتوودا بەردەست دەبێت"
      fillViewport
    />
  );
}
