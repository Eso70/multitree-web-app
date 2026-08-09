"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

const THUMB_COLOR =
  "var(--business-website-color, var(--theme-primary, var(--multitree-accent)))";
const THUMB_MIN_HEIGHT = 24;
const THUMB_WIDTH = 5;
const THUMB_RADIUS = 999;
const GLOW_SIZE = 6;
const TRACK_PADDING = 80;

export function CustomScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollRef = useRef(0);
  const [maxTravel, setMaxTravel] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const thumbY = useTransform(scrollYProgress, [0, 1], [0, maxTravel]);
  const smoothThumbY = useSpring(thumbY, {
    stiffness: 280,
    damping: 36,
    mass: 0.35,
  });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const thumbHeight = Math.min(THUMB_MIN_HEIGHT, track.clientHeight);
    setMaxTravel(Math.max(0, track.clientHeight - thumbHeight));
    setIsScrollable(scrollableHeight > 0);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("custom-scrollbar-active");
    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.documentElement);
    window.addEventListener("resize", measure);

    return () => {
      document.documentElement.classList.remove("custom-scrollbar-active");
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      document.body.style.userSelect = "";
    };
  }, [measure]);

  useEffect(() => {
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!thumb || !track) return;

    const scrollFromPointer = (clientY: number) => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const availableTravel = track.clientHeight - thumb.offsetHeight;
      if (availableTravel <= 0 || scrollableHeight <= 0) return;
      const deltaY = clientY - startYRef.current;
      window.scrollTo(
        0,
        startScrollRef.current + (deltaY / availableTravel) * scrollableHeight,
      );
    };

    const onMouseDown = (event: MouseEvent) => {
      event.preventDefault();
      draggingRef.current = true;
      startYRef.current = event.clientY;
      startScrollRef.current = window.scrollY;
      document.body.style.userSelect = "none";
    };
    const onMouseMove = (event: MouseEvent) => {
      if (draggingRef.current) scrollFromPointer(event.clientY);
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
    };
    const onTrackClick = (event: MouseEvent) => {
      if (event.target === thumb) return;
      const trackRect = track.getBoundingClientRect();
      const clickRatio = (event.clientY - trackRect.top) / trackRect.height;
      const target =
        clickRatio * (document.documentElement.scrollHeight - window.innerHeight);
      animate(window.scrollY, target, {
        duration: reduceMotion ? 0 : 0.45,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (value) => window.scrollTo(0, value),
      });
    };
    const onTouchStart = (event: TouchEvent) => {
      draggingRef.current = true;
      startYRef.current = event.touches[0].clientY;
      startScrollRef.current = window.scrollY;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (draggingRef.current) scrollFromPointer(event.touches[0].clientY);
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
    };

    thumb.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    track.addEventListener("click", onTrackClick);
    thumb.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      thumb.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      track.removeEventListener("click", onTrackClick);
      thumb.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={trackRef}
      className="custom-scroll-track"
      style={{
        position: "fixed",
        top: TRACK_PADDING,
        bottom: TRACK_PADDING,
        right: 6,
        width: THUMB_WIDTH,
        zIndex: 9999,
        background: "transparent",
        borderRadius: THUMB_RADIUS,
      }}
    >
      <motion.div
        ref={thumbRef}
        style={{
          y: reduceMotion ? thumbY : smoothThumbY,
          position: "absolute",
          left: 0,
          width: "100%",
          height: THUMB_MIN_HEIGHT,
          borderRadius: THUMB_RADIUS,
          cursor: "grab",
          opacity: isScrollable ? 1 : 0,
          background: THUMB_COLOR,
          boxShadow: `0 0 ${GLOW_SIZE}px color-mix(in srgb, var(--business-website-color, var(--multitree-accent)) 35%, transparent)`,
        }}
      />
    </div>
  );
}
