"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { PartyPopper } from "lucide-react";

const FIREWORK_COLORS = ["#84cc16", "#8b5cf6", "#f43f5e", "#06b6d4", "#f59e0b", "#d946ef"];
const MOBILE_BREAKPOINT_PX = 640;
const SHOW_DURATION_MS = 1600;

/**
 * Fireworks show (canvas-confetti) covering the whole viewport — the mockup
 * sits inside it, so the burst reads as happening around the whole card.
 * Two side cannons only (no center burst, keeps the card readable), tuned
 * down further on small screens for both performance and visual balance.
 * Skips entirely under prefers-reduced-motion.
 */
function useFireworksOnMount() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    const particleCount = isMobile ? 2 : 3;

    let frameId: number;
    const end = Date.now() + SHOW_DURATION_MS;

    const tick = () => {
      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        startVelocity: 42,
        origin: { x: 0, y: 0.7 },
        colors: FIREWORK_COLORS,
        zIndex: 9999,
      });
      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        startVelocity: 42,
        origin: { x: 1, y: 0.7 },
        colors: FIREWORK_COLORS,
        zIndex: 9999,
      });
      if (Date.now() < end) frameId = requestAnimationFrame(tick);
    };
    tick();

    return () => cancelAnimationFrame(frameId);
  }, []);
}

export function AdvertisingActivationStep() {
  useFireworksOnMount();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 text-center">
      <motion.span
        aria-hidden
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{ scale: [0.4, 1.15, 1], opacity: 1, rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30"
      >
        <PartyPopper className="h-7 w-7" />
      </motion.span>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="text-lg font-black text-slate-900 dark:text-white"
        dir="auto"
      >
        داواکارییەکەت بنێرە بۆ واتساپ
      </motion.p>
    </div>
  );
}
