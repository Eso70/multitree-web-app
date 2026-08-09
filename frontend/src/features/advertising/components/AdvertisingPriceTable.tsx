"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { NumberInput } from "@/components/shared/NumberInput";
import { cn } from "@/lib/utils";
import type { AdvertisingPriceRow, SponsorCategory } from "../pricing-data";

export interface AdvertisingPriceTableTheme {
  ring: string;
  soft: string;
  text: string;
  rowBorder: string;
  solid: string;
  /** Solid (no-opacity) border color for the selected radio ring. */
  radioBorder: string;
  /** Solid dot fill for the selected radio indicator. */
  dot: string;
  shadow?: string;
}

/** Canonical lime (personal) / violet (business) theme, shared by every sponsorship-pricing surface. */
export const SPONSOR_CATEGORY_THEME: Record<SponsorCategory, AdvertisingPriceTableTheme> = {
  personal: {
    ring: "border-lime-600/30 dark:border-lime-400/40",
    soft: "bg-lime-500/10 dark:bg-lime-400/10",
    text: "text-lime-700 dark:text-lime-300",
    rowBorder: "border-lime-600/15 dark:border-lime-400/15",
    solid: "border-lime-500 bg-lime-500 text-white",
    radioBorder: "border-lime-600 dark:border-lime-400",
    dot: "bg-lime-600 dark:bg-lime-400",
    shadow:
      "shadow-[0_20px_60px_-42px_rgba(101,163,13,.35)] dark:shadow-[0_0_50px_-16px_rgba(163,230,53,.45)]",
  },
  business: {
    ring: "border-violet-600/30 dark:border-violet-400/40",
    soft: "bg-violet-500/10 dark:bg-violet-400/10",
    text: "text-violet-700 dark:text-violet-300",
    rowBorder: "border-violet-600/15 dark:border-violet-400/15",
    solid: "border-violet-500 bg-violet-500 text-white",
    radioBorder: "border-violet-600 dark:border-violet-400",
    dot: "bg-violet-600 dark:bg-violet-400",
    shadow:
      "shadow-[0_20px_60px_-42px_rgba(124,58,237,.3)] dark:shadow-[0_0_50px_-16px_rgba(167,139,250,.45)]",
  },
};

interface AdvertisingPriceTableProps {
  rows: readonly AdvertisingPriceRow[];
  theme: AdvertisingPriceTableTheme;
  /** Tighter padding/type scale, and rows become a flat list instead of a padded card grid. Only affects the interactive picker below. */
  compact?: boolean;
  /** Selecting a row requires both of these; omit both for a static, read-only table — this is the sponsorship-guide picker and is unchanged by editing. */
  selectedPrice?: number;
  onSelectPrice?: (price: number) => void;
  formatPrice?: (price: number) => string;
  className?: string;
  /**
   * Turns the static table's price/views cells into inputs and appends a
   * delete action — used by the business-dashboard packages tab. Ignored
   * when `onSelectPrice` is set (the interactive picker never edits).
   */
  onEditPrice?: (id: string, price: number) => void;
  onEditViews?: (id: string, views: string) => void;
  onRemove?: (id: string) => void;
}

const defaultFormatPrice = (price: number) => `${price.toLocaleString("en-US")} IQD`;

export function AdvertisingPriceTable({
  rows,
  theme,
  compact = false,
  selectedPrice,
  onSelectPrice,
  formatPrice = defaultFormatPrice,
  className,
  onEditPrice,
  onEditViews,
  onRemove,
}: AdvertisingPriceTableProps) {
  const interactive = Boolean(onSelectPrice);
  const editable = !interactive && Boolean(onEditPrice && onEditViews && onRemove);

  if (interactive) {
    return (
      <div
        role="radiogroup"
        aria-label="نرخ و بینەر"
        className={cn("mx-auto grid w-full max-w-lg grid-cols-2 gap-1.5 sm:gap-2", className)}
      >
        {rows.map((row) => {
          const selected = selectedPrice === row.price;

          return (
            <div
              key={row.id}
              role="radio"
              tabIndex={0}
              aria-checked={selected}
              onClick={() => onSelectPrice?.(row.price)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPrice?.(row.price);
                }
              }}
              className={cn(
                "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl border p-2 outline-none transition-all sm:p-2.5",
                selected
                  ? cn(theme.ring, theme.soft, "shadow-sm")
                  : "border-black/8 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  selected ? theme.radioBorder : "border-black/20 dark:border-white/25",
                )}
              >
                {selected && <span className={cn("h-2 w-2 rounded-full", theme.dot)} />}
              </span>

              <span className="min-w-0 flex-1 truncate text-xs font-black tabular-nums" dir="ltr">
                {row.views}
              </span>

              <span className={cn("shrink-0 text-xs font-black tabular-nums", theme.text)} dir="ltr">
                {formatPrice(row.price)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white dark:bg-black",
        theme.ring,
        theme.shadow,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          theme.soft,
          compact ? "px-3 py-2" : "px-4 py-2.5",
        )}
      >
        <span className={cn("font-black", theme.text, compact ? "text-[10px]" : "text-xs")}>نرخ</span>
        <span className={cn("font-black", theme.text, compact ? "text-[10px]" : "text-xs")}>بینەر</span>
      </div>

      <div className={compact ? "divide-y divide-black/6 dark:divide-white/8" : "space-y-1.5 p-2 sm:p-3"}>
        {rows.map((row) => (
          <div
            key={row.id}
            className={cn(
              "flex items-stretch rounded-xl border bg-slate-50 dark:bg-white/[0.03]",
              theme.rowBorder,
            )}
          >
            <PriceCell theme={theme} compact={compact}>
              {editable ? (
                <NumberInput
                  value={row.price}
                  step={1000}
                  clearOnFocus
                  aria-label="نرخ"
                  onValueChange={(price) => onEditPrice?.(row.id, price)}
                  className="w-full min-w-0 bg-transparent text-center text-sm font-bold text-slate-700 outline-none dark:text-white/85"
                />
              ) : (
                <span className="text-sm font-bold text-slate-700 dark:text-white/85" dir="ltr">
                  {formatPrice(row.price)}
                </span>
              )}
            </PriceCell>
            <ViewsCell compact={compact}>
              {editable ? (
                <input
                  value={row.views}
                  aria-label="ڕەزی بینەر"
                  onChange={(event) => onEditViews?.(row.id, event.target.value)}
                  placeholder="25K – 35K"
                  className={cn(
                    "w-full min-w-0 bg-transparent text-center text-sm font-black tabular-nums outline-none",
                    theme.text,
                  )}
                  dir="ltr"
                />
              ) : (
                <span className={cn("text-sm font-black tabular-nums", theme.text)} dir="ltr">
                  {row.views}
                </span>
              )}
            </ViewsCell>
            {editable && (
              <div className="flex shrink-0 items-center pe-2">
                <IconActionButton label="سڕینەوەی پاکێج" tone="danger" onClick={() => onRemove?.(row.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconActionButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Leading (price) cell — the divider sits on its trailing edge, correct in both LTR and RTL. */
function PriceCell({ theme, compact, children }: { theme: AdvertisingPriceTableTheme; compact: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex flex-1 items-center justify-center border-e", theme.rowBorder, compact ? "px-3 py-2" : "px-3 py-2.5")}>
      {children}
    </div>
  );
}

function ViewsCell({ compact, children }: { compact: boolean; children: ReactNode }) {
  return <div className={cn("flex flex-1 items-center justify-center", compact ? "px-3 py-2" : "px-3 py-2.5")}>{children}</div>;
}
