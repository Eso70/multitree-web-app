import { PublicHeroAccentBackdrop } from "@/components/public/PublicHeroAccentBackdrop";

interface BusinessHeroAccentBackdropProps {
  accentColor?: string;
  className?: string;
}

/**
 * Shared tenant-color atmosphere for public business hero sections.
 * The transparent radial washes preserve the continuous page grid underneath.
 */
export function BusinessHeroAccentBackdrop({
  accentColor = "var(--business-accent, var(--multitree-accent))",
  className = "",
}: BusinessHeroAccentBackdropProps) {
  return (
    <PublicHeroAccentBackdrop
      accentColor={accentColor}
      className={className}
    />
  );
}
