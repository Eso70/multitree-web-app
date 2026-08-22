"use client";

import type { ReactNode } from "react";
import { BatteryFull, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceViewport } from "@/components/shared/DeviceViewport";

/**
 * How wide the hardware is drawn.
 *
 * `fill` takes the width of whatever lays it out — what the showcase and the
 * advertising steps do. `responsive` steps the frame up with the screen: a
 * phone shows it near full width, a tablet a little larger, a desktop larger
 * still. The page inside is unaffected either way; it is always a real
 * `DEVICE_VIEWPORT_WIDTH` viewport, only the hardware around it changes size.
 */
const SIZE_CLASSES = {
  fill: "w-full",
  responsive: "w-[min(100%,17rem)] sm:w-[19rem] lg:w-[21rem] xl:w-[22.5rem]",
} as const;

export type PhoneMockupSize = keyof typeof SIZE_CLASSES;

interface PhoneMockupProps {
  children?: ReactNode;
  ariaLabel: string;
  name?: string;
  darkTheme?: boolean;
  className?: string;
  screenClassName?: string;
  statusBarClassName?: string;
  overlay?: ReactNode;
  /**
   * Lets a page taller than the screen scroll rather than being cut off. On by
   * default, so a preview always shows the whole page.
   */
  scrollable?: boolean;
  /** Build the nested viewport only when the frame is on screen. */
  active?: boolean;
  /** How the hardware is sized. The page inside is a real phone either way. */
  size?: PhoneMockupSize;
}

/**
 * Shared mobile-device preview.
 *
 * The hardware follows the Templates catalog design. Content renders inside a
 * real nested viewport — see `DeviceViewport` — so a template sees a genuine
 * 390 x 858 phone: its own media queries, its own viewport units, its own
 * scrolling, at the size the device would show them, however large or small
 * the frame around it is drawn.
 */
export function PhoneMockup({
  children,
  ariaLabel,
  name,
  darkTheme = false,
  className,
  screenClassName,
  statusBarClassName,
  overlay,
  scrollable = true,
  active = true,
  size = "fill",
}: PhoneMockupProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "@container/phone relative aspect-[8/17] overflow-visible",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-10 select-none">
        <span className="absolute -left-[1.15%] top-[17.65%] h-[4.1%] w-[1.15%] rounded-l-sm bg-gradient-to-r from-slate-700 to-slate-800" />
        <span className="absolute -left-[1.15%] top-[26.47%] h-[6.47%] w-[1.15%] rounded-l-sm bg-gradient-to-r from-slate-700 to-slate-800" />
        <span className="absolute -left-[1.15%] top-[37.5%] h-[6.47%] w-[1.15%] rounded-l-sm bg-gradient-to-r from-slate-700 to-slate-800" />
        <span className="absolute -right-[1.15%] top-[29.41%] h-[9.41%] w-[1.15%] rounded-r-sm bg-gradient-to-l from-slate-700 to-slate-800" />
      </div>

      <div className="relative h-full w-full overflow-hidden rounded-[12.5%/5.88%] border-[3.125cqw] border-slate-800 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
        <div
          className={cn(
            "phone-mockup-screen absolute inset-px isolate overflow-hidden rounded-[10.6%/5.05%] bg-white",
            screenClassName,
          )}
          style={{ colorScheme: darkTheme ? "dark" : "light" }}
        >
          <DeviceViewport
            title={ariaLabel}
            active={active}
            scrollable={scrollable}
            bodyClassName={cn(scrollable && "phone-mockup-canvas-scrollable")}
          >
            {children}
          </DeviceViewport>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/3 rounded-t-[12.5%] bg-gradient-to-b from-white/[0.04] to-transparent" />

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-[1.55%] z-30 flex select-none items-center justify-between px-[7.7%] text-[2.8cqw] font-bold leading-none",
            darkTheme ? "text-white" : "text-black",
            statusBarClassName,
          )}
        >
          <span>9:41</span>
          <span className="flex items-center gap-[1.1cqw]">
            <Wifi className="h-[3.2cqw] w-[3.2cqw] stroke-[2.5]" />
            <BatteryFull className="h-[3.2cqw] w-[3.2cqw] stroke-[2.5]" />
          </span>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[1.15%] z-40 flex h-[3.55%] w-[40%] -translate-x-1/2 items-center justify-center rounded-full border border-slate-800 bg-black px-[4%] shadow-[inset_0_1px_3px_rgba(255,255,255,.08),0_4px_8px_rgba(0,0,0,.6)]">
          {name ? (
            <span className="max-w-full truncate text-[2.75cqw] font-bold text-white">
              {name}
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "pointer-events-none absolute bottom-[1.15%] left-1/2 z-30 h-[.58%] w-[45%] -translate-x-1/2 rounded-full",
            darkTheme
              ? "bg-white/30 shadow-[0_0_6px_rgba(255,255,255,.1)]"
              : "bg-black/20 shadow-[0_0_4px_rgba(0,0,0,.05)]",
          )}
        />

        {overlay}
      </div>
    </div>
  );
}
