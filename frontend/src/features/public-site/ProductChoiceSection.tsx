import Link from "next/link";
import { ArrowLeft, Check, Link2 } from "lucide-react";
import { MARKETING_PRODUCTS } from "./marketing-content";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function ProductChoiceSection() {
  return (
    <PublicSection id="products">
        <MarketingSectionHeading
          eyebrow="یەک بەستەر، هەموو کەناڵەکان"
          title="Linktree ـەکەت بە شێوەی خۆت دروست بکە"
          description="بەستەر و کردارە گرنگەکانت لە پەڕەیەکی خێرا و جوان کۆبکەرەوە"
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-5">
          {MARKETING_PRODUCTS.map((product) => {
            const Icon = Link2;
            return (
              <article
                key={product.id}
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/65 p-6 shadow-[0_24px_65px_-45px_rgba(15,23,42,.45)] backdrop-blur transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.035] sm:p-9"
              >
                <div
                  aria-hidden="true"
                  className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-[var(--sponsor-krd-accent)]/10 blur-2xl"
                />
                <div className="relative">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-7 text-xs font-black text-black/40 dark:text-white/35">
                    {product.eyebrow}
                  </p>
                  <h3 className="mt-2 text-3xl font-black">{product.title}</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-black/50 dark:text-white/45">
                    {product.description}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {product.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-center gap-2 text-sm font-bold text-black/65 dark:text-white/60"
                      >
                        <Check className="h-4 w-4 text-[var(--sponsor-krd-accent)]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={product.href}
                    className="mt-8 inline-flex items-center gap-2 text-sm font-black text-black dark:text-white"
                  >
                    زیاتر بزانە
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
    </PublicSection>
  );
}
