import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  compact = false,
  label = "پشتڕاستکراوە",
}: {
  compact?: boolean;
  label?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      role="img"
      aria-label={label}
      title={label}
    >
      <BadgeCheck
        className={`${compact ? "h-5 w-5" : "h-6 w-6 sm:h-7 sm:w-7"} fill-[#168de2] text-white drop-shadow-[0_2px_5px_rgba(22,141,226,0.28)]`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
    </span>
  );
}
