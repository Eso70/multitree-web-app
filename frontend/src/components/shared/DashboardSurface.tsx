import { createElement, type HTMLAttributes, type ReactNode } from "react";

export interface DashboardSurfaceProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  as?: "div" | "section";
  children: ReactNode;
  padded?: boolean;
}

export function DashboardSurface({
  as = "section",
  children,
  padded = true,
  className = "",
  ...props
}: DashboardSurfaceProps) {
  return createElement(
    as,
    {
      ...props,
      className: `w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#1c222b] ${
        padded ? "p-4 sm:p-6" : ""
      } ${className}`,
    },
    children,
  );
}
