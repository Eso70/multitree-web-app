import { PublicMarketingHero } from "@/components/public/PublicMarketingHero";
import {
  SPONSOR_KRD_ACCENT_COLOR,
  SPONSOR_KRD_ACCENT_GRADIENT,
} from "@/lib/sponsor-krd-theme";

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
      accentColor={SPONSOR_KRD_ACCENT_COLOR}
      eyebrow={eyebrow}
      title={title}
      description={description}
      primaryAction={
        action
          ? {
              ...action,
              color: SPONSOR_KRD_ACCENT_COLOR,
              background: SPONSOR_KRD_ACCENT_GRADIENT,
              ink: "#111827",
            }
          : undefined
      }
    />
  );
}
