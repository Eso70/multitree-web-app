import type { CSSProperties } from "react";

export function PublicHeroAccentBackdrop({
  accentColor = "var(--business-accent, var(--multitree-accent))",
  className = "",
}: {
  accentColor?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 h-[34rem] overflow-hidden opacity-80 dark:opacity-65 ${className}`}
      style={{ "--hero-accent": accentColor } as CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 52% at 50% -8%, color-mix(in srgb, var(--hero-accent) 30%, transparent) 0%, color-mix(in srgb, var(--hero-accent) 13%, transparent) 43%, transparent 76%)",
        }}
      />
      <div
        className="absolute inset-x-[14%] top-0 h-px sm:inset-x-[22%]"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--hero-accent) 58%, transparent), transparent)",
        }}
      />
    </div>
  );
}
