import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

export function MarketingPageHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <PublicMarketingHero
      accentColor={MULTITREE_ACCENT_COLOR}
      eyebrow={eyebrow}
      title={title}
      description={description}
      primaryAction={
        action
          ? {
              ...action,
              color: MULTITREE_ACCENT_COLOR,
              ink: "#111827",
            }
          : undefined
      }
    />
  );
}
