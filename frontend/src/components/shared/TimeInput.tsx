"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3 } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { TimeColumn } from "./TimeColumn";

/**
 * A time-only field with the same popover as `DateTimeInput`, minus the calendar.
 *
 * The browser's own `<input type="time">` was doing this job, which meant every
 * device drew a different control, none of them in the product's style. This one
 * types like the date field — masked, keyboard first — and opens the same three
 * wheels for hour, minute and period.
 *
 * `value` is always 24-hour `HH:MM`, which is what the API stores; the field
 * itself reads in 12-hour form because that is how the popover presents it.
 */

const MINUTE_STEP = 5;

/**
 * The business's own website colour, falling back to the dashboard theme and
 * then to a neutral slate. Mirrors what the mini website's own surfaces use, so
 * the picker belongs to the page it is editing rather than to the admin chrome.
 */
const BUSINESS_ACCENT =
  "var(--business-website-color, var(--theme-primary, #64748b))";

export function parseTimeValue(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function toValue(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** `13:05` reads as `01:05 PM`. */
function toDisplay(value: string): string {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";
  const hour12 = parsed.hours % 12 || 12;
  const period = parsed.hours >= 12 ? "PM" : "AM";
  return `${String(hour12).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")} ${period}`;
}

/**
 * Reads what was typed, in either notation.
 *
 * `21:30`, `9:30 pm` and `0930pm` all land on the same time; a bare `9:30` is
 * taken at face value, so a 24-hour typist is never second-guessed.
 */
export function parseTypedTime(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  const match = /^(\d{1,2})[:.\s]?(\d{2})?\s*(am|pm)?$/.exec(text);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3];
  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (period === "pm" ? 12 : 0);
  } else if (hours > 23) return null;
  return toValue(hours, minutes);
}

/** Keeps typing inside `hh:mm PP` without fighting the caret. */
function maskTyped(raw: string): string {
  const cleaned = raw.replace(/[^\dapmAPM: ]/g, "").slice(0, 8);
  const digits = cleaned.replace(/\D/g, "").slice(0, 4);
  const suffix = /[ap]/i.exec(cleaned)?.[0]?.toUpperCase();
  const period = suffix ? `${suffix}M` : "";
  if (digits.length <= 2) return period ? `${digits} ${period}` : digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}${period ? ` ${period}` : ""}`;
}

export function TimeInput({
  value,
  onChange,
  label,
  hideLabel = false,
  disabled = false,
  className = "",
  required = false,
  accent = BUSINESS_ACCENT,
}: {
  /** 24-hour `HH:MM`. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  /** Highlight colour for the field and the wheels. */
  accent?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Only held while the field is being typed in. The rest of the time the text
  // is derived from `value`, so an outside change — the "same hours every day"
  // button, a wheel in the popover — shows up without an effect to sync it.
  const [typing, setTyping] = useState<string | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const errorId = useId();
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  useModalKeyboard({
    isOpen,
    onEscape: () => setIsOpen(false),
    escapeEnabled: true,
  });

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 6;
    const padding = 8;
    const width = Math.min(300, window.innerWidth - padding * 2);
    const left = Math.min(
      Math.max(padding, rect.left),
      window.innerWidth - width - padding,
    );
    // Below the field by default, above it when that is where the room is, and
    // never taller than the space it lands in — a row near the bottom of a long
    // modal would otherwise open a panel running off the screen.
    const preferredHeight = 330;
    const roomBelow = window.innerHeight - rect.bottom - gap - padding;
    const roomAbove = rect.top - gap - padding;
    const openAbove = roomBelow < Math.min(preferredHeight, roomAbove);
    setPosition({
      left,
      width,
      maxHeight: Math.max(200, openAbove ? roomAbove : roomBelow),
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !pickerRef.current?.contains(target)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const current = parseTimeValue(value) ?? { hours: 9, minutes: 0 };
  const hour12 = current.hours % 12 || 12;
  const period: "AM" | "PM" = current.hours >= 12 ? "PM" : "AM";

  // Five-minute steps: opening hours land on the quarter hour, and sixty rows
  // to scroll only gets in the way. A minute typed by hand joins the list so it
  // stays selectable even when it is off the step.
  const steppedMinutes = Array.from({ length: 60 / MINUTE_STEP }, (_, index) =>
    String(index * MINUTE_STEP).padStart(2, "0"),
  );
  const currentMinute = String(current.minutes).padStart(2, "0");
  const minuteValues = steppedMinutes.includes(currentMinute)
    ? steppedMinutes
    : [...steppedMinutes, currentMinute].sort();

  const displayed = typing ?? toDisplay(value);

  const commit = (hours: number, minutes: number) => {
    setInvalid(false);
    setTyping(null);
    onChange(toValue(hours, minutes));
  };

  const commitTyped = () => {
    if (typing === null) return;
    const parsed = parseTypedTime(typing);
    if (!parsed) {
      // An unreadable entry snaps back rather than clearing: a schedule always
      // has a time, so there is nothing sensible to fall back to but the last
      // good one.
      setInvalid(true);
      setTyping(null);
      return;
    }
    const { hours, minutes } = parseTimeValue(parsed)!;
    commit(hours, minutes);
  };

  return (
    <div className={`block ${className}`}>
      {!hideLabel && (
        <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
          {label}
          <span className="ms-1" style={{ color: accent }}>
            {required ? "*" : "(ئارەزوومەندانە)"}
          </span>
        </span>
      )}
      <div
        ref={triggerRef}
        className={`flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-2 dark:bg-[#161B22] ${invalid ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-500/15" : "border-slate-200 hover:border-slate-300 focus-within:border-[var(--time-accent)] focus-within:ring-[color-mix(in_srgb,var(--time-accent)_20%,transparent)] dark:border-white/10"}`}
        style={{ "--time-accent": accent } as React.CSSProperties}
      >
        <input
          type="text"
          value={displayed}
          disabled={disabled}
          onChange={(event) => {
            setTyping(maskTyped(event.target.value));
            setInvalid(false);
          }}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitTyped();
          }}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          placeholder="09:00 AM"
          inputMode="numeric"
          dir="ltr"
          className="h-full min-w-0 flex-1 rounded-l-xl bg-transparent px-3 text-sm font-medium tabular-nums text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            updatePosition();
            setIsOpen((open) => !open);
          }}
          aria-label={`کردنەوەی ${label}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="flex h-full w-10 shrink-0 items-center justify-center rounded-r-xl border-l border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-[var(--time-accent)] disabled:cursor-not-allowed dark:border-white/10 dark:hover:bg-white/5"
        >
          <Clock3 className="h-4 w-4" />
        </button>
      </div>
      {invalid && (
        <span
          id={errorId}
          role="alert"
          className="mt-1.5 block text-[10px] font-semibold leading-4 text-red-500"
        >
          کاتەکە بە شێوەی 09:30 AM بنووسە.
        </span>
      )}

      {isOpen &&
        position &&
        createPortal(
          <section
            ref={pickerRef}
            role="dialog"
            aria-label={label}
            className="theme-custom-scrollbar fixed z-[170] overflow-y-auto rounded-2xl border bg-white shadow-2xl    duration-150 dark:bg-[#1c222b]"
            style={
              {
                ...position,
                "--time-accent": accent,
                // The panel carries the business's colour rather than the
                // dashboard's: this picker edits their page, not our chrome.
                borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
              } as React.CSSProperties
            }
            dir="ltr"
          >
            <div
              className="grid grid-cols-3 gap-2 p-3"
              style={{
                background: `color-mix(in srgb, ${accent} 7%, transparent)`,
              }}
            >
              <TimeColumn
                accent={accent}
                accentInk="#FFFFFF"
                scrollbarClassName="theme-custom-scrollbar"
                label="کاتژمێر"
                selected={String(hour12).padStart(2, "0")}
                values={Array.from({ length: 12 }, (_, index) =>
                  String(index + 1).padStart(2, "0"),
                )}
                onSelect={(next) =>
                  commit(
                    (Number(next) % 12) + (period === "PM" ? 12 : 0),
                    current.minutes,
                  )
                }
              />
              <TimeColumn
                accent={accent}
                accentInk="#FFFFFF"
                scrollbarClassName="theme-custom-scrollbar"
                label="خولەک"
                selected={String(current.minutes).padStart(2, "0")}
                values={minuteValues}
                onSelect={(next) => commit(current.hours, Number(next))}
              />
              <TimeColumn
                accent={accent}
                accentInk="#FFFFFF"
                scrollbarClassName="theme-custom-scrollbar"
                label="AM/PM"
                selected={period}
                values={["AM", "PM"]}
                onSelect={(next) =>
                  commit(
                    (current.hours % 12) + (next === "PM" ? 12 : 0),
                    current.minutes,
                  )
                }
              />
            </div>
            <div
              className="flex items-center justify-between border-t px-3 py-2"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  commit(now.getHours(), now.getMinutes());
                }}
                style={{ color: accent }}
                className="rounded-lg px-2 py-1.5 text-[10px] font-bold transition hover:bg-[color-mix(in_srgb,var(--time-accent)_10%,transparent)]"
              >
                ئێستا
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
              >
                تەواو
              </button>
            </div>
          </section>,
          document.body,
        )}
    </div>
  );
}
