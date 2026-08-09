import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BusinessCardPreviewProps {
  businessName: string;
  title: string;
  label?: string;
  description?: string;
  accentColor?: string;
  secondaryAccent?: string;
  surfaceColor?: string;
  textColor?: string;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function BusinessCardPreview({
  businessName,
  title,
  label = "DIGITAL BUSINESS CARD",
  description,
  accentColor = "#7c3aed",
  secondaryAccent = "#0ea5e9",
  surfaceColor = "#17191b",
  textColor = "#ffffff",
  icon: Icon,
  iconColor = textColor,
  className,
}: BusinessCardPreviewProps) {
  return (
    <div
      role="img"
      aria-label={`${businessName} — ${title}`}
      className={cn(
        "@container/card relative mx-auto aspect-[1.586/1] w-full max-w-[34rem] overflow-hidden rounded-[clamp(1rem,6cqw,1.75rem)] shadow-[0_28px_65px_-32px_rgba(15,23,42,.7)]",
        className,
      )}
      style={
        {
          background: `linear-gradient(145deg, ${surfaceColor}, color-mix(in srgb, ${surfaceColor} 78%, #000))`,
          color: textColor,
          "--business-card-accent": accentColor,
          "--business-card-secondary": secondaryAccent,
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="absolute -left-[16%] -top-[36%] h-[92%] w-[58%] rounded-full border-[clamp(.75rem,6cqw,2rem)] opacity-38 blur-[2px]"
        style={{ borderColor: accentColor }}
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-[52%] -right-[16%] h-[110%] w-[68%] rounded-full border-[clamp(.75rem,6cqw,2rem)] opacity-32 blur-[2px]"
        style={{ borderColor: secondaryAccent }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(120deg,transparent_15%,rgba(255,255,255,.09)_48%,transparent_70%)]"
      />

      <div className="relative flex h-full min-w-0 flex-col justify-between p-[clamp(.7rem,5cqw,2.6rem)]">
        <div className="flex min-w-0 items-start justify-between gap-[clamp(.5rem,3cqw,1.25rem)]">
          <span className="max-w-[68%] break-words text-[clamp(.45rem,3cqw,.8rem)] font-semibold uppercase tracking-[clamp(.08em,.7cqw,.16em)] text-white/62 [overflow-wrap:anywhere]">
            {label}
          </span>
          <span
            aria-hidden="true"
            className="flex h-[clamp(1.75rem,12cqw,3.25rem)] w-[clamp(1.75rem,12cqw,3.25rem)] shrink-0 items-center justify-center rounded-full text-[clamp(.65rem,4cqw,1.2rem)] font-bold"
            style={{
              backgroundColor: accentColor,
              color: iconColor,
              boxShadow: `0 0 28px color-mix(in srgb, ${accentColor} 48%, transparent)`,
            }}
          >
            {Icon ? (
              <Icon className="h-[48%] w-[48%]" strokeWidth={2.4} />
            ) : (
              businessName.trim().slice(0, 1).toUpperCase() || "B"
            )}
          </span>
        </div>

        <div className="min-w-0">
          <p className="break-words text-[clamp(1rem,8cqw,2.8rem)] font-semibold leading-[1.02] tracking-[-0.045em] [overflow-wrap:anywhere]">
            {businessName}
          </p>
          <p className="mt-[clamp(.25rem,1.8cqw,.8rem)] break-words text-[clamp(.55rem,3.4cqw,1rem)] font-medium leading-[1.35] text-white/72 [overflow-wrap:anywhere]">
            {title}
          </p>
          {description ? (
            <p className="mt-[clamp(.2rem,1.4cqw,.65rem)] line-clamp-2 max-w-[90%] break-words text-[clamp(.42rem,2.6cqw,.72rem)] leading-[1.35] text-white/46 [overflow-wrap:anywhere]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
