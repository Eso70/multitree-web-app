import { ArrowUpLeft } from "lucide-react";
import { MARKETING_USE_CASES } from "./marketing-content";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function UseCasesSection() {
  return (
    <PublicSection>
        <MarketingSectionHeading
          eyebrow="بۆ هەموو جۆرێک"
          title="لە پۆستێکەوە تا بزنسێکی تەواو"
        />
        <div className="mt-12 divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10">
          {MARKETING_USE_CASES.map((useCase, index) => (
            <div
              key={useCase}
              className="group flex items-center justify-between gap-5 py-5 sm:py-7"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-black/30 dark:text-white/25">
                  0{index + 1}
                </span>
                <h3 className="text-lg font-black sm:text-2xl">{useCase}</h3>
              </div>
              <ArrowUpLeft className="h-5 w-5 text-black/30 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1 dark:text-white/25" />
            </div>
          ))}
        </div>
    </PublicSection>
  );
}
