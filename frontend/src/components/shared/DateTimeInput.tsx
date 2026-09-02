"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { TimeColumn } from "./TimeColumn";
import { Tooltip } from "@/components/shared/Tooltip";

interface DateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Earliest selectable date/datetime (ISO format matching the mode). */
  min?: string;
  /** Latest selectable date/datetime (ISO format matching the mode). */
  max?: string;
  disabled?: boolean;
  dateOnly?: boolean;
  required?: boolean;
  accent?: string;
  /**
   * Drops the built-in label, for surfaces that already caption the control.
   * The label is still required and still reaches assistive technology through
   * `aria-label`, so hiding it changes the look and nothing else.
   */
  hideLabel?: boolean;
}

const BUSINESS_ACCENT =
  "var(--business-website-color, var(--theme-primary, #64748b))";

// Full Kurdish month names for the calendar header / month selector.
const MONTH_NAMES = [
  "کانوونی دووەم",
  "شوبات",
  "ئازار",
  "نیسان",
  "ئایار",
  "حوزەیران",
  "تەممووز",
  "ئاب",
  "ئەیلوول",
  "تشرینی یەکەم",
  "تشرینی دووەم",
  "کانوونی یەکەم",
];

// 3-letter English abbreviations shown in the compact month picker grid.
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAY_NAMES = ["ی", "د", "س", "چ", "پ", "ه", "ش"];

function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDateTime(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return date;
}

function formatLocalDate(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTypedDateTime(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${String(date.getFullYear()).slice(-2)}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function parseTypedDateTime(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = 2000 + Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1) return null;
  const now = new Date();
  const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
  const date = new Date(year, month - 1, day, isToday ? now.getHours() : 0, isToday ? now.getMinutes() : 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function defaultDateTime() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatMaskedDate(rawValue: string, previousValue: string) {
  const deleting = rawValue.length < previousValue.length;
  const sanitized = rawValue.replace(/[^\d/]/g, "");
  let parts = sanitized.split("/");
  if (parts.length === 1 && parts[0].length > 2) {
    const digits = parts[0].slice(0, 6);
    parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)];
  }
  let year = (parts[0] || "").slice(0, 2);
  const currentShortYear = new Date().getFullYear() % 100;
  if (year.length === 2 && Number(year) < currentShortYear) year = year[0];
  if (year.length < 2) return year;
  if (parts.length === 1) return deleting ? year : `${year}/`;
  let month = (parts[1] || "").slice(0, 2);
  if (month.length === 1 && /^[2-9]$/.test(month) && !deleting) month = `0${month}`;
  if (month.length === 2) {
    const n = Number(month);
    if (n < 1 || n > 12) month = month[0];
  }
  if (month.length < 2) return `${year}/${month}`;
  if (parts.length === 2) return deleting ? `${year}/${month}` : `${year}/${month}/`;
  let day = (parts[2] || "").slice(0, 2);
  if (day.length === 1 && /^[4-9]$/.test(day) && !deleting) day = `0${day}`;
  if (day.length === 2) {
    const maxDay = daysInMonth(2000 + Number(year), Number(month) - 1);
    const n = Number(day);
    if (n < 1 || n > maxDay) day = day[0];
  }
  return `${year}/${month}/${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Year range: 10 years back so analytics/historical dates are reachable.
const THIS_YEAR = new Date().getFullYear();
const YEAR_START = THIS_YEAR - 10;
const YEAR_END = THIS_YEAR + 30;
const ALL_YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

export function DateTimeInput({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  disabled = false,
  dateOnly = false,
  required = false,
  accent = BUSINESS_ACCENT,
  hideLabel = false,
}: DateTimeInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const errorId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);

  const parseValue = (candidate: string) =>
    dateOnly ? parseLocalDate(candidate) : parseLocalDateTime(candidate);

  const initialValue = parseValue(value);
  const [inputValue, setInputValue] = useState(() =>
    initialValue ? formatTypedDateTime(initialValue) : "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [headerSelector, setHeaderSelector] = useState<"month" | "year" | null>(null);
  const [pickerPosition, setPickerPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const [draft, setDraft] = useState<Date>(() => parseValue(value) || defaultDateTime());
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const initial = parseValue(value) || defaultDateTime();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const minimum = min ? parseValue(min) : null;
  const maximum = max ? parseValue(max) : null;

  useModalKeyboard({ isOpen, onEscape: () => setIsOpen(false), escapeEnabled: true });

  // Auto-scroll year grid to the selected year when panel opens.
  useEffect(() => {
    if (headerSelector === "year" && yearScrollRef.current) {
      const selected = yearScrollRef.current.querySelector<HTMLElement>("[data-selected='true']");
      selected?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [headerSelector]);

  const updatePickerPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const viewportPadding = 8;
    const width = Math.min(
      dateOnly ? 308 : 500,
      window.innerWidth - viewportPadding * 2,
      Math.max(dateOnly ? 280 : 460, rect.width),
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );
    const estimatedHeight = 380;
    const openAbove =
      window.innerHeight - rect.bottom < estimatedHeight + gap &&
      rect.top > estimatedHeight + gap;
    setPickerPosition({
      left,
      width,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, [dateOnly]);

  useEffect(() => {
    if (!isOpen) return;
    updatePickerPosition();
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !pickerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [isOpen, updatePickerPosition]);

  const openPicker = () => {
    const next = parseTypedDateTime(inputValue) || parseValue(value) || defaultDateTime();
    setDraft(next);
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setHeaderSelector(null);
    updatePickerPosition();
    setIsOpen(true);
  };

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    return Array.from({ length: 42 }, (_, i) => new Date(year, month, i - firstWeekday + 1));
  }, [visibleMonth]);

  const hour12 = draft.getHours() % 12 || 12;
  const period = draft.getHours() >= 12 ? "PM" : "AM";

  const atFirstAllowedMonth = visibleMonth.getFullYear() <= YEAR_START && visibleMonth.getMonth() === 0;
  const atLastAllowedMonth = visibleMonth.getFullYear() >= YEAR_END && visibleMonth.getMonth() === 11;

  /** True when every day in the given month falls outside [min, max]. */
  const isMonthDisabled = (year: number, monthIdx: number): boolean => {
    if (minimum) {
      const lastDay = new Date(year, monthIdx + 1, 0);
      if (startOfDay(lastDay) < startOfDay(minimum)) return true;
    }
    if (maximum) {
      const firstDay = new Date(year, monthIdx, 1);
      if (startOfDay(firstDay) > startOfDay(maximum)) return true;
    }
    return false;
  };

  /** True when the entire year falls outside [min, max]. */
  const isYearDisabled = (year: number): boolean => {
    if (minimum && year < minimum.getFullYear()) return true;
    if (maximum && year > maximum.getFullYear()) return true;
    return false;
  };

  const commit = (candidate: Date) => {
    let next = candidate;
    if (minimum && next < minimum) next = new Date(minimum);
    if (maximum && next > maximum) next = new Date(maximum);
    setDraft(next);
    setInputValue(formatTypedDateTime(next));
    setValidationError(null);
    onChange(dateOnly ? formatLocalDate(next) : formatLocalDateTime(next));
  };

  const validateTypedValue = () => {
    if (!inputValue.trim()) {
      setValidationError(null);
      onChange("");
      return true;
    }
    const parsed = parseTypedDateTime(inputValue);
    if (!parsed) {
      setValidationError("بەروارەکە بە شێوەی ساڵ/مانگ/ڕۆژ بنووسە؛ بۆ نموونە 26/03/09.");
      return false;
    }
    if (minimum && parsed < minimum) {
      setValidationError(`بەروارەکە نابێت پێش ${formatTypedDateTime(minimum)} بێت.`);
      return false;
    }
    if (maximum && parsed > maximum) {
      setValidationError(`بەروارەکە نابێت لە ${formatTypedDateTime(maximum)} دواتر بێت.`);
      return false;
    }
    commit(parsed);
    return true;
  };

  const setHour = (hour: number) => {
    const next = new Date(draft);
    next.setHours((hour % 12) + (period === "PM" ? 12 : 0));
    commit(next);
  };
  const setMinute = (minute: number) => {
    const next = new Date(draft);
    next.setMinutes(minute);
    commit(next);
  };
  const setPeriod = (nextPeriod: "AM" | "PM") => {
    const next = new Date(draft);
    const baseHour = next.getHours() % 12;
    next.setHours(baseHour + (nextPeriod === "PM" ? 12 : 0));
    commit(next);
  };

  const chooseDay = (day: Date) => {
    commit(new Date(
      day.getFullYear(), day.getMonth(), day.getDate(),
      dateOnly ? 0 : draft.getHours(),
      dateOnly ? 0 : draft.getMinutes(),
    ));
  };

  const todayDate = new Date();
  const isTodayDisabled =
    (!!minimum && startOfDay(todayDate) < startOfDay(minimum)) ||
    (!!maximum && startOfDay(todayDate) > startOfDay(maximum));

  // Highlight the committed value, not the draft.
  const selectedDate = parseValue(value);

  return (
    <div className="block">
      {!hideLabel && (
        <span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">
          {label}
          <span className="ms-1" style={{ color: accent }}>
            {required ? "*" : "(ئارەزوومەندانە)"}
          </span>
        </span>
      )}
      <div
        ref={triggerRef}
        className={`flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-2 dark:bg-[#161B22] ${
          validationError
            ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-500/15"
            : "border-slate-200 hover:border-slate-300 focus-within:border-[var(--date-accent)] focus-within:ring-[color-mix(in_srgb,var(--date-accent)_20%,transparent)] dark:border-white/10"
        }`}
        style={{ "--date-accent": accent } as React.CSSProperties}
      >
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(event) => {
            setInputValue((current) => formatMaskedDate(event.target.value, current));
            setValidationError(null);
          }}
          onBlur={validateTypedValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); validateTypedValue(); }
          }}
          aria-label={label}
          aria-invalid={!!validationError}
          aria-describedby={validationError ? errorId : undefined}
          placeholder="YY/MM/DD"
          maxLength={8}
          inputMode="numeric"
          dir="ltr"
          className="h-full min-w-0 flex-1 rounded-l-xl bg-transparent px-3.5 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          aria-label={`کردنەوەی ${label}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="flex h-full w-11 shrink-0 items-center justify-center rounded-r-xl border-l border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-[var(--date-accent)] disabled:cursor-not-allowed dark:border-white/10 dark:hover:bg-white/5"
        >
          <CalendarClock className="h-4 w-4" />
        </button>
      </div>
      {validationError && (
        <span id={errorId} role="alert" className="mt-1.5 block text-[10px] font-semibold leading-4 text-red-500">
          {validationError}
        </span>
      )}
      {hint && (
        <span className="mt-1.5 block text-[10px] leading-4 text-slate-400 dark:text-slate-500">
          {hint}
        </span>
      )}

      {isOpen && pickerPosition &&
        createPortal(
          <section
            ref={pickerRef}
            role="dialog"
            aria-label={label}
            className="theme-custom-scrollbar fixed z-[170] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl border bg-white shadow-2xl dark:bg-[#1c222b]"
            style={{
              ...pickerPosition,
              "--date-accent": accent,
              borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)",
            } as React.CSSProperties}
            dir="ltr"
          >
            <div className={dateOnly ? "block" : "grid grid-cols-[minmax(0,1fr)_minmax(130px,0.58fr)]"}>

              {/* ── Calendar panel ── */}
              <div className="relative min-w-0">

                {/* Header */}
                <div className="flex items-center gap-1 border-b border-slate-100 px-2.5 py-2 dark:border-white/[0.07]">
                  <div className="flex min-w-0 flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => setHeaderSelector((c) => c === "month" ? null : "month")}
                      className="flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
                    >
                      <span className="truncate">{MONTH_NAMES[visibleMonth.getMonth()]}</span>
                      <ChevronDown className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${headerSelector === "month" ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeaderSelector((c) => c === "year" ? null : "year")}
                      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
                    >
                      {/* Full 4-digit year */}
                      {visibleMonth.getFullYear()}
                      <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${headerSelector === "year" ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={atFirstAllowedMonth}
                      onClick={() => setVisibleMonth((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                      aria-label="مانگی پێشوو"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/[0.07]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={atLastAllowedMonth}
                      onClick={() => setVisibleMonth((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                      aria-label="مانگی داهاتوو"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/[0.07]"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      aria-label="داخستن"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.07] dark:hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Month / Year overlay */}
                {headerSelector && (
                  <div
                    className="absolute left-0 right-0 top-[45px] z-20 border-b bg-white/98 shadow-lg backdrop-blur-sm dark:bg-[#1c222b]/98"
                    style={{ borderColor: `color-mix(in srgb, ${accent} 18%, transparent)` }}
                  >
                    {headerSelector === "month" ? (
                      <div className="grid grid-cols-4 gap-1 p-2.5">
                        {MONTH_NAMES.map((name, i) => {
                          const dis = isMonthDisabled(visibleMonth.getFullYear(), i);
                          const sel = visibleMonth.getMonth() === i;
                          return (
                            <Tooltip key={name} content={name} side="top">
                              <button
                                type="button"
                                disabled={dis}
                                aria-label={name}
                                onClick={() => {
                                  setVisibleMonth((c) => new Date(c.getFullYear(), i, 1));
                                  setHeaderSelector(null);
                                }}
                                className={`rounded-lg px-1 py-2 text-center text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer ${
                                  sel
                                    ? "text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.07]"
                                }`}
                                style={sel ? { background: "var(--date-accent)" } : undefined}
                              >
                                {MONTH_SHORT[i]}
                              </button>
                            </Tooltip>
                          );
                        })}
                      </div>
                    ) : (
                      <div ref={yearScrollRef} className="theme-custom-scrollbar max-h-44 overflow-y-auto p-2.5">
                        <div className="grid grid-cols-4 gap-1">
                          {ALL_YEARS.map((year) => {
                            const dis = isYearDisabled(year);
                            const sel = visibleMonth.getFullYear() === year;
                            const isCurrent = year === THIS_YEAR;
                            return (
                              <button
                                key={year}
                                type="button"
                                data-selected={sel}
                                disabled={dis}
                                onClick={() => {
                                  setVisibleMonth((c) => new Date(year, c.getMonth(), 1));
                                  setHeaderSelector(null);
                                }}
                                className={`rounded-lg px-1 py-2 text-center text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                  sel
                                    ? "text-white shadow-sm"
                                    : isCurrent
                                    ? ""
                                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.07]"
                                }`}
                                style={
                                  sel
                                    ? { background: "var(--date-accent)" }
                                    : isCurrent
                                    ? {
                                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 40%, transparent)`,
                                        color: "var(--date-accent)",
                                      }
                                    : undefined
                                }
                              >
                                {year}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Weekday headers */}
                <div className="grid grid-cols-7 px-2.5 pt-3 pb-1">
                  {WEEKDAY_NAMES.map((day, i) => (
                    <span key={`${day}-${i}`} className="flex h-7 items-center justify-center text-[9px] font-bold text-slate-400 dark:text-slate-500">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-y-0.5 px-2.5 pb-2">
                  {calendarDays.map((day) => {
                    const isSelected = !!selectedDate && sameDay(day, selectedDate);
                    const isToday = sameDay(day, todayDate);
                    const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                    const isDisabled =
                      (!!minimum && startOfDay(day) < startOfDay(minimum)) ||
                      (!!maximum && startOfDay(day) > startOfDay(maximum));
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => chooseDay(day)}
                        className={`flex h-8 items-center justify-center rounded-lg text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-20 ${
                          isSelected
                            ? "font-bold text-white shadow-sm"
                            : isToday && isCurrentMonth
                            ? "font-bold"
                            : isCurrentMonth
                            ? "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.07]"
                            : "text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-white/[0.03]"
                        }`}
                        style={
                          isSelected
                            ? { background: "var(--date-accent)" }
                            : isToday && isCurrentMonth
                            ? { color: "var(--date-accent)" }
                            : undefined
                        }
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 px-2.5 py-2 dark:border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setInputValue("");
                      setValidationError(null);
                      setIsOpen(false);
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.07] dark:hover:text-slate-300"
                  >
                    پاککردنەوە
                  </button>
                  <button
                    type="button"
                    disabled={isTodayDisabled}
                    onClick={() => {
                      const now = new Date();
                      commit(now);
                      setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[color-mix(in_srgb,var(--date-accent)_10%,transparent)]"
                    style={{ color: "var(--date-accent)" }}
                  >
                    ئەمڕۆ
                  </button>
                </div>
              </div>

              {/* ── Time panel (datetime mode only) ── */}
              {!dateOnly && (
                <div className="grid min-w-0 grid-cols-3 gap-2 border-l border-slate-100 bg-slate-50/60 p-3 dark:border-white/[0.07] dark:bg-black/10">
                  <TimeColumn
                    accent={accent}
                    accentInk="var(--theme-ink, #ffffff)"
                    selected={String(hour12).padStart(2, "0")}
                    values={Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))}
                    onSelect={(next) => setHour(Number(next))}
                  />
                  <TimeColumn
                    accent={accent}
                    accentInk="var(--theme-ink, #ffffff)"
                    selected={String(draft.getMinutes()).padStart(2, "0")}
                    values={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))}
                    onSelect={(next) => setMinute(Number(next))}
                  />
                  <TimeColumn
                    accent={accent}
                    accentInk="var(--theme-ink, #ffffff)"
                    selected={period}
                    values={["AM", "PM"]}
                    onSelect={(next) => setPeriod(next as "AM" | "PM")}
                  />
                </div>
              )}
            </div>
          </section>,
          document.body,
        )}
    </div>
  );
}

export function DateInput(props: Omit<DateTimeInputProps, "dateOnly">) {
  return <DateTimeInput {...props} dateOnly />;
}
