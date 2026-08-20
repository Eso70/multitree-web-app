import {
  BarChart3,
  Link2,
  Megaphone,
  Palette,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { MARKETING_FEATURES } from "./marketing-content";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

const ICONS = {
  palette: Palette,
  chart: BarChart3,
  mobile: Smartphone,
  shield: ShieldCheck,
  megaphone: Megaphone,
  link: Link2,
} as const;

export function FeatureGridSection({ compact = false }: { compact?: boolean }) {
  return (
    <PublicSection id="features">
        <MarketingSectionHeading
          eyebrow="هەموو پێداویستییەکان"
          title="پەڕەیەکی جوان تەنها دەستپێکە"
          description="ئامرازەکانی MultiTree بۆ بڵاوکردنەوە، پێوانەکردن و گەشەپێدانی ناسنامەی دیجیتاڵیت دروستکراون"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETING_FEATURES.slice(0, compact ? 3 : undefined).map(
            (feature) => {
              const Icon = ICONS[feature.icon];
              return (
                <article
                  key={feature.id}
                  className="rounded-[1.6rem] border border-black/10 bg-white/55 p-6 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--multitree-accent)]/16 text-black dark:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 text-lg font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-black/48 dark:text-white/43">
                    {feature.description}
                  </p>
                </article>
              );
            },
          )}
        </div>
    </PublicSection>
  );
}
