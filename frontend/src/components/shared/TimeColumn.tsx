"use client";

import { useMemo } from "react";

/**
 * One scrolling wheel of a time picker: the selected value pinned at the top,
 * the rest listed below starting from the one after it.
 *
 * Shared by `DateTimeInput` and `TimeInput` so the two pickers cannot drift
 * apart — they had begun as one component and the wheel is the part users
 * recognise.
 */
export function TimeColumn({
  selected,
  values,
  onSelect,
  label,
  accent = "var(--business-website-color, var(--theme-primary, #64748b))",
  accentInk = "var(--theme-ink, #ffffff)",
  scrollbarClassName = "theme-custom-scrollbar",
}: {
  selected: string;
  values: string[];
  onSelect: (value: string) => void;
  /** Accessible name for the wheel, e.g. "کاتژمێر". */
  label?: string;
  /** Colour of the selected value. Defaults to the business website colour. */
  accent?: string;
  accentInk?: string;
  /** Scrollbar styling for the wheel. */
  scrollbarClassName?: string;
}) {
  const orderedValues = useMemo(() => {
    const selectedIndex = values.indexOf(selected);
    if (selectedIndex < 0) return values;
    return [
      ...values.slice(selectedIndex + 1),
      ...values.slice(0, selectedIndex + 1),
    ];
  }, [selected, values]);

  return (
    <div className="min-w-0" role="group" aria-label={label}>
      <div
        className="flex h-10 items-center justify-center rounded-lg text-xs font-black shadow-sm"
        style={{ background: accent, color: accentInk }}
      >
        {selected}
      </div>
      <div className={`${scrollbarClassName} mt-2 max-h-[250px] overflow-y-auto overscroll-contain`}>
        {orderedValues.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`flex h-9 w-full items-center justify-center rounded-lg text-[11px] font-bold tabular-nums transition ${value === selected ? "" : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/5"}`}
            style={
              value === selected
                ? {
                    background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                    color: accent,
                  }
                : undefined
            }
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
