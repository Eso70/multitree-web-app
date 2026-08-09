"use client";

import * as React from "react";
import { useAnimate, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  pauseOnHover?: boolean;
  direction?: "left" | "right";
  /** Approximate seconds for content to cross the visible rail. */
  speed?: number;
  /** Optional crossing time at widths up to 640px. Higher values move slower. */
  mobileSpeed?: number;
  minBlockMultiplier?: number;
}

export function Marquee({
  children,
  pauseOnHover = false,
  direction = "left",
  speed = 30,
  mobileSpeed,
  minBlockMultiplier = 1.4,
  className,
  ...props
}: MarqueeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const unitRef = React.useRef<HTMLDivElement>(null);
  const [trackRef, animate] = useAnimate<HTMLDivElement>();
  const prefersReducedMotion = useReducedMotion();
  const playbackRef = React.useRef<{
    pause: () => void;
    play: () => void;
    stop: () => void;
  } | null>(null);
  const items = React.useMemo(
    () => React.Children.toArray(children),
    [children],
  );
  const [size, setSize] = React.useState({
    containerWidth: 0,
    unitWidth: 0,
  });

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const unit = unitRef.current;
    if (!container || !unit || items.length === 0) return;

    const measure = () => {
      const next = {
        containerWidth: container.offsetWidth,
        unitWidth: unit.scrollWidth,
      };
      setSize((current) =>
        current.containerWidth === next.containerWidth &&
        current.unitWidth === next.unitWidth
          ? current
          : next,
      );
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(unit);
    return () => observer.disconnect();
  }, [items]);

  const containerWidth = size.containerWidth || 390;
  const unitWidth = size.unitWidth || items.length * 150;
  const repeatCount = Math.max(
    1,
    Math.ceil(
      (containerWidth * Math.max(1, minBlockMultiplier)) / unitWidth,
    ),
  );
  const blockWidth = unitWidth * repeatCount;
  const crossingSeconds = Math.max(
    1,
    containerWidth <= 640 && mobileSpeed !== undefined ? mobileSpeed : speed,
  );
  const pixelsPerSecond = Math.max(1, containerWidth / crossingSeconds);
  const duration = Math.max(1, blockWidth / pixelsPerSecond);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    if (prefersReducedMotion) {
      track.style.transform = "translateX(0)";
      return;
    }

    const playback = animate(
      track,
      {
        x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
      },
      {
        duration,
        ease: "linear",
        repeat: Infinity,
      },
    );
    playbackRef.current = playback;

    return () => {
      playback.stop();
      playbackRef.current = null;
    };
  }, [animate, direction, duration, prefersReducedMotion, trackRef]);

  if (items.length === 0) return null;

  const pause = () => {
    if (pauseOnHover) playbackRef.current?.pause();
  };

  const play = () => {
    if (pauseOnHover) playbackRef.current?.play();
  };

  const renderUnit = (key: string, decorative: boolean) => (
    <div
      key={key}
      className="ui-marquee-unit"
      aria-hidden={decorative || undefined}
      inert={decorative || undefined}
    >
      {items}
    </div>
  );

  const renderBlock = (key: string, decorative: boolean) => (
    <div
      key={key}
      className="ui-marquee-block"
      aria-hidden={decorative || undefined}
      inert={decorative || undefined}
    >
      {Array.from({ length: repeatCount }, (_, index) =>
        renderUnit(`${key}-${index}`, decorative || index > 0),
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn("ui-marquee w-full overflow-hidden", className)}
      {...props}
    >
      <div ref={unitRef} className="ui-marquee-measure" aria-hidden="true" inert>
        {items}
      </div>
      <div
        ref={trackRef}
        className="ui-marquee-track"
        onMouseEnter={pause}
        onMouseLeave={play}
        onFocusCapture={pause}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) play();
        }}
      >
        {renderBlock("primary", false)}
        {renderBlock("duplicate", true)}
      </div>
    </div>
  );
}
