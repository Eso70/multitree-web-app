"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type MotionDivProps = Omit<
  HTMLMotionProps<"div">,
  "animate" | "initial" | "transition"
>;

export function MotionPulse({ className, ...props }: MotionDivProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: reduced ? 1 : 0.55 }}
      animate={{ opacity: reduced ? 1 : [0.55, 1, 0.55] }}
      transition={{ duration: 2, ease: "easeInOut", repeat: reduced ? 0 : Infinity }}
      {...props}
    />
  );
}

export function MotionSpinner({
  children,
  className,
  active = true,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={cn("inline-flex shrink-0", className)}
      animate={{ rotate: active && !reduced ? 360 : 0 }}
      transition={{
        duration: 1,
        ease: "linear",
        repeat: active && !reduced ? Infinity : 0,
      }}
      aria-hidden="true"
    >
      {children}
    </motion.span>
  );
}

export function MotionPulseIcon({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className="inline-flex shrink-0"
      initial={{ opacity: 1 }}
      animate={{
        opacity: active && !reduced ? [0.45, 1, 0.45] : 1,
      }}
      transition={{
        duration: 2,
        ease: "easeInOut",
        repeat: active && !reduced ? Infinity : 0,
      }}
      aria-hidden="true"
    >
      {children}
    </motion.span>
  );
}

export function MotionShine({ className, ...props }: MotionDivProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ x: "-100%" }}
      animate={{ x: reduced ? "-100%" : ["-100%", "200%", "200%"] }}
      transition={{ duration: 6, ease: "easeInOut", repeat: reduced ? 0 : Infinity }}
      {...props}
    />
  );
}

export function MotionPing({
  className,
  ...props
}: Omit<HTMLMotionProps<"span">, "animate" | "initial" | "transition">) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={className}
      initial={{ scale: 1, opacity: 0.75 }}
      animate={
        reduced
          ? { scale: 1, opacity: 0.75 }
          : { scale: [1, 2], opacity: [0.75, 0] }
      }
      transition={{ duration: 1, ease: "easeOut", repeat: reduced ? 0 : Infinity }}
      {...props}
    />
  );
}

export const MotionReveal = forwardRef<HTMLDivElement, MotionDivProps>(
  function MotionReveal({ className, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        {...props}
      />
    );
  },
);

export const MotionFade = forwardRef<HTMLDivElement, MotionDivProps>(
  function MotionFade({ className, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        {...props}
      />
    );
  },
);
