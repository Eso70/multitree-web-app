"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type ReactNode,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  delay?: number;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

interface Coords {
  top: number;
  left: number;
  actualSide: TooltipSide;
}

export function Tooltip({
  content,
  side = "top",
  delay = 150,
  disabled = false,
  className = "",
  children,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const gap = 8;
    const padding = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let targetSide = side;

    // Flip side if not enough space
    if (targetSide === "top" && triggerRect.top - tooltipRect.height - gap < padding) {
      targetSide = "bottom";
    } else if (
      targetSide === "bottom" &&
      triggerRect.bottom + tooltipRect.height + gap > viewportHeight - padding
    ) {
      targetSide = "top";
    } else if (targetSide === "left" && triggerRect.left - tooltipRect.width - gap < padding) {
      targetSide = "right";
    } else if (
      targetSide === "right" &&
      triggerRect.right + tooltipRect.width + gap > viewportWidth - padding
    ) {
      targetSide = "left";
    }

    let top = 0;
    let left = 0;

    if (targetSide === "top") {
      top = triggerRect.top - tooltipRect.height - gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    } else if (targetSide === "bottom") {
      top = triggerRect.bottom + gap;
      left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    } else if (targetSide === "left") {
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.left - tooltipRect.width - gap;
    } else if (targetSide === "right") {
      top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
      left = triggerRect.right + gap;
    }

    // Clamp horizontally to viewport
    const minLeft = padding;
    const maxLeft = viewportWidth - tooltipRect.width - padding;
    const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));

    // Clamp vertically to viewport
    const minTop = padding;
    const maxTop = viewportHeight - tooltipRect.height - padding;
    const clampedTop = Math.max(minTop, Math.min(top, maxTop));

    setCoords({
      top: clampedTop,
      left: clampedLeft,
      actualSide: targetSide,
    });
  }, [side]);

  const show = useCallback(() => {
    if (disabled || !content) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  }, [disabled, content, delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsOpen(false);
    setCoords(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updatePosition]);

  if (!content || disabled) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    show();
  };

  const handleMouseLeave = () => {
    hide();
  };

  const handleFocus = () => {
    show();
  };

  const handleBlur = () => {
    hide();
  };

  let triggerElement: ReactNode;

  if (React.isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const originalRef = (child as unknown as { ref?: React.Ref<HTMLElement> }).ref;

    triggerElement = React.cloneElement(child, {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
        if (typeof originalRef === "function") {
          originalRef(node);
        } else if (originalRef && "current" in originalRef) {
          (originalRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      onMouseEnter: (e: React.MouseEvent) => {
        if (typeof child.props.onMouseEnter === "function") {
          (child.props.onMouseEnter as (e: React.MouseEvent) => void)(e);
        }
        handleMouseEnter();
      },
      onMouseLeave: (e: React.MouseEvent) => {
        if (typeof child.props.onMouseLeave === "function") {
          (child.props.onMouseLeave as (e: React.MouseEvent) => void)(e);
        }
        handleMouseLeave();
      },
      onFocus: (e: React.FocusEvent) => {
        if (typeof child.props.onFocus === "function") {
          (child.props.onFocus as (e: React.FocusEvent) => void)(e);
        }
        handleFocus();
      },
      onBlur: (e: React.FocusEvent) => {
        if (typeof child.props.onBlur === "function") {
          (child.props.onBlur as (e: React.FocusEvent) => void)(e);
        }
        handleBlur();
      },
      "aria-describedby": isOpen ? tooltipId : undefined,
    });
  } else {
    triggerElement = (
      <span
        ref={(node) => {
          triggerRef.current = node;
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={isOpen ? tooltipId : undefined}
        className="inline-flex"
      >
        {children}
      </span>
    );
  }

  const tooltipPortal =
    mounted && isOpen
      ? createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords ? `${coords.top}px` : "-9999px",
              left: coords ? `${coords.left}px` : "-9999px",
              opacity: coords ? 1 : 0,
              pointerEvents: "none",
            }}
            className={`z-[9999] px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-lg shadow-md border backdrop-blur-xs transition-opacity duration-150 ease-out select-none whitespace-nowrap bg-white/95 text-slate-800 border-slate-200/90 dark:bg-[#161B22]/95 dark:text-slate-100 dark:border-white/10 dark:shadow-xl font-kurdish ${className}`}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {triggerElement}
      {tooltipPortal}
    </>
  );
}
