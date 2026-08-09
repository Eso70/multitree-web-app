"use client";

import type { ReactNode } from "react";

/**
 * The layout every row of `StatCard`s uses.
 *
 * Each page used to write its own grid, and twenty-one of them had drifted
 * apart: some started at one column on a phone, some at two, and the gap and
 * the breakpoint they widened at were different again. The result was that the
 * same four numbers stacked differently depending on which tab you were on.
 *
 * The rule this encodes is one line: two columns until the layout is genuinely
 * wide, then as many as the row was designed for. Two rather than one on a
 * phone because a stat card is short and wide — one per row wastes the screen
 * and pushes the content below it off the fold — and two rather than three on
 * a tablet because three cramps the value text at that width.
 *
 * `columns` describes the desktop row only. Below `lg` it is always two, which
 * is what makes every page behave the same on a phone and a tablet.
 */

export type StatCardGridColumns = 2 | 3 | 4 | 5 | 6;

/**
 * Written out rather than interpolated: Tailwind only ships classes it can
 * see as complete strings in the source, so `lg:grid-cols-${n}` would compile
 * to nothing at all.
 */
const desktopColumns: Record<StatCardGridColumns, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export interface StatCardGridProps {
  children: ReactNode;
  /** How many fit across a desktop row. Two everywhere below `lg` regardless. */
  columns?: StatCardGridColumns;
  className?: string;
}

export function StatCardGrid({
  children,
  columns = 4,
  className = "",
}: StatCardGridProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 sm:gap-4 ${desktopColumns[columns]} ${className}`}
    >
      {children}
    </div>
  );
}
