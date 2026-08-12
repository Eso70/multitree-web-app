"use client";

import { memo, type CSSProperties, type MouseEventHandler, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

const EMPTY_STATE_DEFAULT = "هێشتا هیچ لینکێک نییە";

/** Standard action-button sizing shared by all Linktree templates. */
export const STANDARD_BUTTON_CLASS =
  "group relative flex h-16 w-full items-center justify-center gap-3 rounded-full px-5 shadow-lg transition-shadow hover:shadow-xl";

export const STANDARD_TEMPLATE_BUTTON_SIZE_CLASS = "h-16 w-full px-5";
export const STANDARD_TEMPLATE_ACTION_LIST_CLASS =
  "flex w-full flex-col gap-3";

export interface TemplateActionButtonProps
  extends Omit<HTMLMotionProps<"button">, "onClick" | "style" | "className" | "children"> {
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Defaults to the standard pill size/shape. Pass a different className to match another template's button shape entirely. */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** `ltr` matches every existing template's button direction; kept overridable for future layouts. */
  dir?: "ltr" | "rtl";
}

/**
 * Reusable action button for template link lists. Ships the standard pill
 * size/shape and motion defaults (fade/slide-in, hover/tap feedback) used by
 * the simplest templates, but every visual (className, style, and any
 * `motion` prop such as `initial`/`whileHover`/`transition`) can be
 * overridden so richer templates (glass cards, aurora rows, gradient tiles)
 * can reuse the same interactive primitive with their own markup as
 * `children`.
 */
export const TemplateActionButton = memo(function TemplateActionButton({
  onClick,
  className = STANDARD_BUTTON_CLASS,
  style,
  children,
  dir = "ltr",
  type = "button",
  initial = { opacity: 0, x: -30 },
  animate = { opacity: 1, x: 0 },
  whileHover = { scale: 1.05 },
  whileTap = { scale: 1 },
  transition = { duration: 0.5 },
  ...motionProps
}: TemplateActionButtonProps) {
  return (
    <motion.button
      type={type}
      dir={dir}
      onClick={onClick}
      className={className}
      style={style}
      initial={initial}
      animate={animate}
      whileHover={whileHover}
      whileTap={whileTap}
      transition={transition}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
});

export interface TemplateActionButtonListProps {
  isEmpty: boolean;
  /** Wrapper around the rendered buttons. Standard spacing by default. */
  className?: string;
  style?: CSSProperties;
  emptyStateText?: string;
  /** Outer wrapper for the empty-state message. */
  emptyStateClassName?: string;
  emptyStateStyle?: CSSProperties;
  /** Applied to the empty-state `<p>` itself, for templates that size/color the message differently from their default text. */
  emptyStateTextClassName?: string;
  emptyStateTextStyle?: CSSProperties;
  children: ReactNode;
}

/**
 * Reusable container for a template's list of action buttons: standard
 * spacing/direction plus a consistent empty state, both fully overridable so
 * each template keeps its own gaps and margins.
 */
export const TemplateActionButtonList = memo(function TemplateActionButtonList({
  isEmpty,
  className = STANDARD_TEMPLATE_ACTION_LIST_CLASS,
  style = { direction: "ltr" },
  emptyStateText = EMPTY_STATE_DEFAULT,
  emptyStateClassName = "text-center py-8",
  emptyStateStyle,
  emptyStateTextClassName,
  emptyStateTextStyle,
  children,
}: TemplateActionButtonListProps) {
  if (isEmpty) {
    return (
      <div className={className} style={style}>
        <div className={emptyStateClassName} style={emptyStateStyle}>
          <p className={emptyStateTextClassName} style={emptyStateTextStyle}>
            {emptyStateText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
});
