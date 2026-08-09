"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

export const APP_MOTION_EASE = [0.16, 1, 0.3, 1] as const;

export function AppMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.3, ease: APP_MOTION_EASE }}
    >
      {children}
    </MotionConfig>
  );
}
