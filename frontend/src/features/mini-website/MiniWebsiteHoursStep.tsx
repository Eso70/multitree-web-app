"use client";

import { useState } from "react";
import { createMiniWebsiteWeekHours, type MiniWebsiteWeekHours } from "@linktree/types";
import { TimeInput } from "@/components/shared/TimeInput";
import {
  ALL_DAY_OPEN,
  DAY_LABELS,
  applyToOpenDays,
  createAllWeekHours,
  isOpenAllWeek,
  normalizeWeek,
  sharesOneSchedule,
} from "./hours";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

/**
 * Opening times for the business: one week, seven rows.
 *
 * Independent of the location section — a page can publish its hours without
 * ever giving an address, and a business with several branches still keeps one
 * schedule rather than one per place.
 */
export function MiniWebsiteHoursFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const hours = normalizeWeek(draft.hours);
  const allDay = isOpenAllWeek(hours);

  /**
   * Whether every day is open on the same times.
   *
   * Held here rather than read from the data so the switch keeps its own state
   * while the week is edited underneath it.
   */
  const [linked, setLinked] = useState(
    () => hours.every((entry) => !entry.closed) && sharesOneSchedule(hours),
  );

  const setHours = (next: MiniWebsiteWeekHours) =>
    onChange({ ...draft, hours: next });

  const patchDay = (
    index: number,
    patch: Partial<MiniWebsiteWeekHours[number]>,
  ) => {
    const next = hours.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    // Closing a day breaks "every day, same times", so the switch stops
    // claiming otherwise.
    if (patch.closed === true) setLinked(false);
    // While the days are linked, a time typed into one is the week's time.
    const changedTime = patch.open !== undefined || patch.close !== undefined;
    setHours(
      linked && changedTime && !next[index].closed
        ? applyToOpenDays(next, next[index].open, next[index].close)
        : next,
    );
  };

  /**
   * One switch for the whole week: on opens every day — Friday included — on
   * the same times; off closes every day, so a business that only works a few
   * days can start from nothing rather than turning six of them off by hand.
   */
  const toggleLinked = () => {
    if (linked) {
      setLinked(false);
      setHours(hours.map((entry) => ({ ...entry, closed: true })));
      return;
    }
    setLinked(true);
    const source = hours.find((entry) => !entry.closed) ?? hours[0];
    setHours(
      hours.map((entry) => ({
        ...entry,
        closed: false,
        open: source.open,
        close: source.close,
      })),
    );
  };

  const toggleAllDay = () => {
    // Leaving 24/7 returns to the ordinary week rather than to seven rows all
    // reading midnight to midnight, which is not a schedule anyone means.
    setHours(allDay ? createMiniWebsiteWeekHours() : createAllWeekHours());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleChip
            label="٢٤/٧ کراوەیە"
            active={allDay}
            onToggle={toggleAllDay}
          />
          <ToggleChip
            label="هەموو ڕۆژەکان بە یەک کات"
            active={linked}
            disabled={allDay}
            onToggle={toggleLinked}
          />
        </div>
      </div>

      {allDay ? (
        <p
          className="rounded-xl border p-4 text-xs font-black"
          style={{
            borderColor:
              "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
            background:
              "color-mix(in srgb, var(--theme-primary, #64748b) 8%, transparent)",
            color: "var(--theme-primary, #64748b)",
          }}
        >
          هەموو ڕۆژێک، ٢٤ کاتژمێر کراوەیە
        </p>
      ) : (
        <div className="space-y-4">
          {hours.map((entry, index) => (
            <div
              key={entry.day}
              className="mini-website-editor-item flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3"
            >
              <span className="w-20 shrink-0 text-[11px] font-black text-slate-600 dark:text-slate-300">
                {DAY_LABELS[entry.day]}
              </span>

              {/* Open or closed first: the times mean nothing until this is
                  answered, so they are replaced rather than shown greyed out. */}
              <button
                type="button"
                role="switch"
                aria-checked={!entry.closed}
                aria-label={`${DAY_LABELS[entry.day]} — کراوەیە`}
                onClick={() => patchDay(index, { closed: !entry.closed })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${entry.closed ? "bg-slate-200 dark:bg-white/10" : ""}`}
                style={
                  entry.closed
                    ? undefined
                    : { background: "var(--theme-primary, #64748b)" }
                }
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${entry.closed ? "left-0.5" : "left-[22px]"}`}
                />
              </button>

              {entry.closed ? (
                <span className="text-[11px] font-bold text-slate-400">داخراوە</span>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-2" dir="ltr">
                  <TimeInput
                    required
                    label={`${DAY_LABELS[entry.day]} — کاتی کردنەوە`}
                    hideLabel
                    value={entry.open}
                    onChange={(open) => patchDay(index, { open })}
                    className="min-w-0 flex-1"
                  />
                  <span className="shrink-0 text-slate-400">—</span>
                  <TimeInput
                    required
                    label={`${DAY_LABELS[entry.day]} — کاتی داخستن`}
                    hideLabel
                    value={entry.close}
                    onChange={(close) => patchDay(index, { close })}
                    className="min-w-0 flex-1"
                  />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* A closing time before the opening one is not a mistake — it is how a
          night shift is entered — so it is explained rather than blocked. */}
      {!allDay &&
        hours.some(
          (entry) =>
            !entry.closed &&
            entry.close <= entry.open &&
            entry.open !== ALL_DAY_OPEN,
        ) && (
          <p className="text-[10px] font-bold leading-4 text-slate-400">
            کاتی داخستن پێش کاتی کردنەوە واتە تا بەیانی دەمێنێتەوە.
          </p>
        )}

      {errors.hours && (
        <p className="text-[11px] font-bold text-red-500">{errors.hours}</p>
      )}
    </div>
  );
}

/** A small on/off chip, styled from the business's theme colour when active. */
function ToggleChip({
  label,
  active,
  onToggle,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition disabled:opacity-40 ${active ? "text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"}`}
      style={
        active
          ? {
              background: "var(--theme-primary, #64748b)",
              borderColor: "var(--theme-primary, #64748b)",
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}
