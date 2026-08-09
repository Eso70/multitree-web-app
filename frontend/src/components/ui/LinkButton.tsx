"use client";

import { memo, ReactNode } from "react";
import { motion } from "motion/react";
import { MotionShine } from "@/components/motion/MotionPrimitives";

interface LinkButtonProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
}

export const LinkButton = memo(function LinkButton({
  children,
  onClick,
  className = "",
  gradientFrom = "rgba(59, 130, 246, 0.5)",
  gradientVia = "rgba(59, 130, 246, 0.4)",
  gradientTo = "rgba(59, 130, 246, 0.3)",
}: LinkButtonProps) {
  return (
    <motion.button
      type="button"
      dir="ltr"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onTouchStart={() => {
        // iOS Safari: Ensure touch events work properly
        // Don't prevent default - let the click handler work
        // This ensures buttons respond to taps on iPhone
        // The touch event helps iOS recognize the element as interactive
      }}
      className={`group btn-spotlight relative mt-2 w-full touch-manipulation overflow-hidden rounded-2xl px-4 py-3.5 text-left text-sm font-medium text-white shadow-[0_4px_16px_rgba(59,130,246,0.12)] backdrop-blur-sm sm:rounded-3xl sm:px-5 sm:py-4 sm:text-base sm:shadow-[0_4px_20px_rgba(59,130,246,0.15)] sm:backdrop-blur-md md:px-6 md:py-4.5 md:text-lg lg:px-7 lg:py-5 ${className}`}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      variants={{
        rest: { scale: 1 },
        hover: {
          scale: 1.02,
          boxShadow: "0 8px 30px rgba(59,130,246,0.25)",
        },
      }}
      style={{
        background: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
        contain: "layout style paint",
        willChange: "transform",
      }}
    >
      {/* Spotlight effect - moves from left to right - reduced on mobile */}
      <div className="absolute inset-0 overflow-hidden">
        <MotionShine
          className="absolute inset-0 hidden w-1/3 sm:block"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
            filter: 'blur(8px)',
            willChange: "transform",
          }}
        />
      </div>
      
      {/* Additional spotlight on hover - desktop only */}
      <motion.div
        className="absolute inset-0 hidden bg-linear-to-r from-transparent via-white/15 to-transparent sm:block"
        variants={{ rest: { x: "-100%" }, hover: { x: "100%" } }}
        transition={{ duration: 0.7 }}
      />
      
      {/* Top gradient overlay - desktop only */}
      <motion.div
        className="absolute inset-0 hidden bg-linear-to-t from-black/8 via-transparent to-transparent sm:block"
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
      />
      
      <div className="relative z-10 flex w-full items-center justify-between">
        {children}
      </div>
    </motion.button>
  );
});
