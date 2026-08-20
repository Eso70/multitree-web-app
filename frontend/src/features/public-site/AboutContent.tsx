import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function AboutContent() {
  return (
    <PublicSection>
        <MarketingSectionHeading
          eyebrow="ئامانجی ئێمە"
          title="دروستکردنی ناسنامەی دیجیتاڵی نابێت ئاڵۆز بێت"
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="rounded-[2rem] border border-black/10 bg-white/55 p-8 dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="text-xl font-black">MultiTree چییە؟</h3>
            <p className="mt-4 text-sm leading-8 text-black/50 dark:text-white/45">
              پلاتفۆرمێکە بۆ دروستکردن و بەڕێوەبردنی پەڕە گشتییە جوانەکان؛ تاک،
              بزنس و ئاژانس دەتوانن ناوەڕۆک و بەستەرەکانیان بە ڕێکخراوی بڵاو
              بکەنەوە
            </p>
          </article>
          <article className="rounded-[2rem] border border-black/10 bg-white/55 p-8 dark:border-white/10 dark:bg-white/[0.03]">
            <h3 className="text-xl font-black">چی بۆ ئێمە گرنگە؟</h3>
            <p className="mt-4 text-sm leading-8 text-black/50 dark:text-white/45">
              پاراستن، خێرایی، دیزاینی بۆ مۆبایل، داتای ڕوون و ئەوەی بەکارهێنەر
              بەبێ شارەزایی تەکنیکی بتوانێت پەڕەکەی خۆی دروست بکات
            </p>
          </article>
        </div>
    </PublicSection>
  );
}
