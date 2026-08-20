import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function PricingSection() {
  return (
    <PublicSection id="pricing">
        <MarketingSectionHeading
          eyebrow="بێ نرخێکی ساختە"
          title="سەرەتا تاقی بکەرەوە، پاشان بەشداری هەڵبژێرە"
          description="پارەدان هێشتا بە شێوەی ئۆتۆماتیکی بڵاونەکراوەتەوە؛ بۆیە نرخێکی ساختە پیشان نادەین؛ نرخە ڕاستەقینەکان لە کەتەلۆگی billing ـەوە دەخرێنە ڕوو"
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
          <article className="rounded-[2rem] border border-black/10 bg-white/60 p-8 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-black text-black/40 dark:text-white/35">
              دەستپێکردن
            </p>
            <h3 className="mt-3 text-3xl font-black">تاقیکردنەوە</h3>
            <p className="mt-3 text-sm leading-7 text-black/48 dark:text-white/43">
              ماوەکە لە ڕێکخستنەکانی پلاتفۆرمەوە ٧ یان ٣٠ ڕۆژە و لە کاتی
              دروستکردنی پەڕە دەست پێدەکات
            </p>
            <ul className="mt-6 space-y-3 text-sm font-bold">
              {[
                "یەک Linktree یان مینی وێبسایت",
                "هەموو ئامرازە سەرەتاییەکان",
                "ئاماری پەڕە",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[var(--multitree-accent)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 flex h-12 items-center justify-center rounded-xl bg-[#b6f20d] text-sm font-black text-[#111827] transition-colors hover:bg-[#a8df0c]"
            >
              بەخۆڕایی دەست پێ بکە
            </Link>
          </article>
          <article className="relative overflow-hidden rounded-[2rem] border border-[var(--multitree-accent)] bg-[var(--multitree-accent)]/10 p-8">
            <span className="absolute left-5 top-5 rounded-full bg-[var(--multitree-accent)] px-3 py-1 text-[0.65rem] font-black text-[var(--multitree-accent-ink)]">
              بەم زووانە
            </span>
            <p className="text-xs font-black text-black/40 dark:text-white/35">
              بەردەوامبوون
            </p>
            <h3 className="mt-3 text-3xl font-black">پلانی Creator</h3>
            <p className="mt-3 text-sm leading-7 text-black/48 dark:text-white/43">
              کاتێک billing چالاک دەبێت، نرخ و ماوە ڕاستەوخۆ لە پلانی
              ڕاستەقینەوە پیشان دەدرێن؛ هیچ نرخێک لێرە دووبارە نانووسرێتەوە
            </p>
            <ul className="mt-6 space-y-3 text-sm font-bold">
              {[
                "بەردەوامبوونی پەڕەی گشتی",
                "دەستکاریکردن و بڵاوکردنەوە",
                "پارەدانی پارێزراو بە webhook",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[var(--multitree-accent)]" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-8 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-black/10 text-sm font-black text-black/40 dark:border-white/10 dark:text-white/35"
            >
              هێشتا بڵاونەکراوەتەوە
            </button>
          </article>
        </div>
    </PublicSection>
  );
}
