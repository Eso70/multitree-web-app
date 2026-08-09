"use client";

import type { LinktreePresentation as Linktree } from "@linktree/types";
import { memo, useMemo } from "react";
import Image from "next/image";
import { motion } from "motion/react";

interface LinktreeHeaderProps {
  linktree: Linktree;
  textColor?: string;
  textSecondaryColor?: string;
}

export const LinktreeHeader = memo(function LinktreeHeader({
  linktree,
  textColor = "#ffffff",
  textSecondaryColor = "rgba(255, 255, 255, 0.8)",
}: LinktreeHeaderProps) {
  const glowStyle = useMemo(() => {
    let primaryColor = linktree.background_color || "#6366f1";

    if (primaryColor && primaryColor.startsWith("{")) {
      try {
        const parsed = JSON.parse(primaryColor);
        if (parsed.type === "gradient" && parsed.primaryColor) {
          primaryColor = parsed.primaryColor;
        }
      } catch {
        primaryColor = "#6366f1";
      }
    }

    return {
      background: `radial-gradient(circle at 50% 40%, ${primaryColor}60, ${primaryColor}30, transparent 55%)`,
    };
  }, [linktree.background_color]);

  // Use default avatar if no image is set
  const imageSrc = linktree.image || "/images/DefaultAvatar.png";

  return (
    <header className="w-full px-3 sm:px-4">
      <div className="relative flex flex-col items-center gap-4 sm:gap-6 text-center">

        {/* Avatar with glow */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 scale-[2]" style={glowStyle} />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-white/10">
            <Image
              src={imageSrc}
              alt={linktree.name || "Profile"}
              fill
              sizes="(min-width: 768px) 112px, (min-width: 640px) 96px, 80px"
              unoptimized
              className="object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== "/images/DefaultAvatar.png") {
                  target.src = "/images/DefaultAvatar.png";
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2 md:space-y-3">
          <h1 
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-balance px-2"
            style={{ 
              color: textColor,
              textShadow: textColor === "#ffffff" 
                ? "0 4px 16px rgba(0,0,0,0.3), 0 5px 20px rgba(0,0,0,0.32), 0 6px 24px rgba(0,0,0,0.35)"
                : "0 2px 8px rgba(255,255,255,0.3), 0 3px 12px rgba(255,255,255,0.2)"
            }}
          >
            {linktree.name}
          </h1>
          {linktree.subtitle ? (
            <p
              className="text-sm sm:text-base md:text-lg font-medium leading-snug max-w-xl text-pretty px-2"
              style={{ color: textColor }}
            >
              {linktree.subtitle}
            </p>
          ) : null}
          <p
            className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed max-w-xl text-pretty px-2 mb-6"
            style={{ color: textSecondaryColor }}
          >
            {linktree.description || "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە"}
          </p>
          <motion.div
            className="pt-1 sm:pt-1.5 md:pt-2 text-base sm:text-lg md:text-xl"
            style={{ color: textSecondaryColor }}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
            aria-hidden
          >
            👇
          </motion.div>
        </div>
      </div>
    </header>
  );
});
