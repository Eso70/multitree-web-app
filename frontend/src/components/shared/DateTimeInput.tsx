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
} from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { TimeColumn } from "./TimeColumn";

interface DateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  min?: string;
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

const monthNames = [
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
const weekdayNames = ["ی", "د", "س", "چ", "پ", "ه", "ش"];

function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  )
    return null;
  return date;
}

function formatLocalDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTypedDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getFullYear() % 100)}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
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
  const isToday =
    year === now.getFullYear() &&
    month === now.getMonth() + 1 &&
    day === now.getDate();
  const date = new Date(
    year,
    month - 1,
    day,
    isToday ? now.getHours() : 0,
    isToday ? now.getMinutes() : 0,
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  return date;
}

function defaultDateTime() {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  );
}

function daysInMonth(shortYear: string, month: number) {
  if (shortYear.length !== 2 || month < 1 || month > 12) return 31;
  return new Date(2000 + Number(shortYear), month, 0).getDate();
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
  if (month.length === 1 && /^[2-9]$/.test(month) && !deleting)
    month = `0${month}`;
  if (month.length === 2) {
    const numericMonth = Number(month);
    if (numericMonth < 1 || numericMonth > 12) month = month[0];
  }
  if (month.length < 2) return `${year}/${month}`;
  if (parts.length === 2)
    return deleting ? `${year}/${month}` : `${year}/${month}/`;

  let day = (parts[2] || "").slice(0, 2);
  if (day.length === 1 && /^[4-9]$/.test(day) && !deleting) day = `0${day}`;
  if (day.length === 2) {
    const maxDay = daysInMonth(year, Number(month));
    const numericDay = Number(day);
    if (numericDay < 1 || numericDay > maxDay) day = day[0];
  }
  return `${year}/${month}/${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function DateTimeInput({
  label,
  value,
  onChange,
  hint,
  min,
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
  const parseValue = (candidate: string) =>
    dateOnly ? parseLocalDate(candidate) : parseLocalDateTime(candidate);
  const initialValue = parseValue(value);
  const [inputValue, setInputValue] = useState(() =>
    initialValue ? formatTypedDateTime(initialValue) : "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [headerSelector, setHeaderSelector] = useState<"month" | "year" | null>(
    null,
  );
  const [pickerPosition, setPickerPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const [draft, setDraft] = useState<Date>(
    () => parseValue(value) || defaultDateTime(),
  );
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const initial = parseValue(value) || defaultDateTime();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const minimum = min ? parseValue(min) : null;

  useModalKeyboard({
    isOpen,
    onEscape: () => setIsOpen(false),
    escapeEnabled: true,
  });

  const updatePickerPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 6;
    const viewportPadding = 8;
    const width = Math.min(
      dateOnly ? 360 : 540,
      window.innerWidth - viewportPadding * 2,
      Math.max(dateOnly ? 320 : 500, rect.width),
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );
    const estimatedHeight = 390;
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
      if (
        !triggerRef.current?.contains(target) &&
        !pickerRef.current?.contains(target)
      ) {
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
    const next =
      parseTypedDateTime(inputValue) ||
      parseValue(value) ||
      defaultDateTime();
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
    return Array.from(
      { length: 42 },
      (_, index) => new Date(year, month, index - firstWeekday + 1),
    );
  }, [visibleMonth]);

  const hour12 = draft.getHours() % 12 || 12;
  const period = draft.getHours() >= 12 ? "PM" : "AM";
  const currentYear = new Date().getFullYear();
  const atFirstAllowedMonth =
    visibleMonth.getFullYear() === currentYear && visibleMonth.getMonth() === 0;
  const atLastAllowedMonth =
    visibleMonth.getFullYear() === 2099 && visibleMonth.getMonth() === 11;
  const commit = (candidate: Date) => {
    const next = minimum && candidate < minimum ? new Date(minimum) : candidate;
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
      setValidationError(
        "بەروارەکە بە شێوەی ساڵ/مانگ/ڕۆژ بنووسە؛ بۆ نموونە 26/03/09.",
      );
      return false;
    }
    if (minimum && parsed < minimum) {
      setValidationError(
        `بەروارەکە نابێت پێش ${formatTypedDateTime(minimum)} بێت.`,
      );
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
    commit(
      new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        dateOnly ? 0 : draft.getHours(),
        dateOnly ? 0 : draft.getMinutes(),
      ),
    );
  };

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
        className={`flex h-11 w-full items-center rounded-xl border bg-white transition focus-within:ring-2 disabled:opacity-50 dark:bg-[#161B22] ${validationError ? "border-red-400 focus-within:border-red-400 focus-within:ring-red-500/15" : "border-slate-200 hover:border-slate-300 focus-within:border-[var(--date-accent)] focus-within:ring-[color-mix(in_srgb,var(--date-accent)_20%,transparent)] dark:border-white/10"}`}
        style={{ "--date-accent": accent } as React.CSSProperties}
      >
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(event) => {
            setInputValue((current) =>
              formatMaskedDate(event.target.value, current),
            );
            setValidationError(null);
          }}
          onBlur={validateTypedValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              validateTypedValue();
            }
          }}
          aria-label={label}
          aria-invalid={!!validationError}
          aria-describedby={validationError ? errorId : undefined}
          placeholder="YY/MM/DD — بۆ نموونە 26/03/09"
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
        <span
          id={errorId}
          role="alert"
          className="mt-1.5 block text-[10px] font-semibold leading-4 text-red-500"
        >
          {validationError}
        </span>
      )}
      {hint && (
        <span className="mt-1.5 block text-[10px] leading-4 text-slate-400 dark:text-slate-500">
          {hint}
        </span>
      )}

      {isOpen &&
        pickerPosition &&
        createPortal(
          <section
            ref={pickerRef}
            role="dialog"
            aria-label={label}
            className="theme-custom-scrollbar fixed z-[170] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl border bg-white shadow-2xl    duration-150 dark:bg-[#1c222b]"
            style={
              {
                ...pickerPosition,
                "--date-accent": accent,
                borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
              } as React.CSSProperties
            }
            dir="ltr"
          >
            <div className={dateOnly ? "block" : "grid grid-cols-[minmax(0,1fr)_minmax(125px,0.62fr)]"}>
              <div className={`relative min-w-0 p-4 ${dateOnly ? "" : "border-r border-slate-100 dark:border-white/5"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderSelector((current) =>
                          current === "month" ? null : "month",
                        )
                      }
                      className="flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      <span className="truncate">
                        {monthNames[visibleMonth.getMonth()]}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderSelector((current) =>
                          current === "year" ? null : "year",
                        )
                      }
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      {String(visibleMonth.getFullYear() % 100).padStart(
                        2,
                        "0",
                      )}
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={atFirstAllowedMonth}
                      onClick={() =>
                        setVisibleMonth(
                          (current) =>
                            new Date(
                              current.getFullYear(),
                              current.getMonth() - 1,
                              1,
                            ),
                        )
                      }
                      aria-label="مانگی پێشوو"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={atLastAllowedMonth}
                      onClick={() =>
                        setVisibleMonth(
                          (current) =>
                            new Date(
                              current.getFullYear(),
                              current.getMonth() + 1,
                              1,
                            ),
                        )
                      }
                      aria-label="مانگی داهاتوو"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {headerSelector && (
                  <div
                    className="theme-custom-scrollbar absolute left-4 right-4 top-14 z-20 max-h-52 overflow-y-auto rounded-xl border bg-white p-2 shadow-xl dark:bg-[#1c222b]"
                    style={{
                      borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
                    }}
                  >
                    {headerSelector === "month" ? (
                      <div className="grid grid-cols-2 gap-1">
                        {monthNames.map((month, index) => (
                          <button
                            key={month}
                            type="button"
                            disabled={
                              visibleMonth.getFullYear() === currentYear &&
                              index < new Date().getMonth()
                            }
                            onClick={() => {
                              setVisibleMonth(
                                (current) =>
                                  new Date(current.getFullYear(), index, 1),
                              );
                              setHeaderSelector(null);
                            }}
                            className={`rounded-lg px-2 py-2 text-left text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${visibleMonth.getMonth() === index ? "bg-[var(--date-accent)] text-[var(--theme-ink,#ffffff)]" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}
                          >
                            {month}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {Array.from(
                          { length: 2100 - currentYear },
                          (_, index) => currentYear + index,
                        ).map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              setVisibleMonth(
                                (current) =>
                                  new Date(
                                    year,
                                    year === currentYear
                                      ? Math.max(
                                          current.getMonth(),
                                          new Date().getMonth(),
                                        )
                                      : current.getMonth(),
                                    1,
                                  ),
                              );
                              setHeaderSelector(null);
                            }}
                            className={`rounded-lg px-2 py-2 text-center text-[10px] font-bold transition ${visibleMonth.getFullYear() === year ? "bg-[var(--date-accent)] text-[var(--theme-ink,#ffffff)]" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}
                          >
                            {String(year % 100).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                  {weekdayNames.map((day, index) => (
                    <span
                      key={`${day}-${index}`}
                      className="py-1 text-[9px] font-bold text-slate-400"
                    >
                      {day}
                    </span>
                  ))}
                  {calendarDays.map((day) => {
                    const isSelected = sameDay(day, draft);
                    const isToday = sameDay(day, new Date());
                    const isCurrentMonth =
                      day.getMonth() === visibleMonth.getMonth();
                    const isDisabled =
                      !!minimum && startOfDay(day) < startOfDay(minimum);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => chooseDay(day)}
                        className={`flex h-8 items-center justify-center rounded-lg text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-25 ${isSelected ? "bg-[var(--date-accent)] text-[var(--theme-ink,#ffffff)] shadow-sm" : isToday ? "ring-1 ring-inset ring-[var(--date-accent)] text-[var(--date-accent)]" : isCurrentMonth ? "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5" : "text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-white/[0.03]"}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setInputValue("");
                      setValidationError(null);
                      setIsOpen(false);
                    }}
                    className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--date-accent)] transition hover:bg-[color-mix(in_srgb,var(--date-accent)_10%,transparent)]"
                  >
                    پاککردنەوە
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      commit(now);
                      setVisibleMonth(
                        new Date(now.getFullYear(), now.getMonth(), 1),
                      );
                    }}
                    className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--date-accent)] transition hover:bg-[color-mix(in_srgb,var(--date-accent)_10%,transparent)]"
                  >
                    ئەمڕۆ
                  </button>
                </div>
              </div>

              {!dateOnly && <div className="grid min-w-0 grid-cols-3 gap-2 bg-slate-50/60 p-3 dark:bg-black/10">
                <TimeColumn
                  accent={accent}
                  accentInk="var(--theme-ink, #ffffff)"
                  selected={String(hour12).padStart(2, "0")}
                  values={Array.from({ length: 12 }, (_, index) =>
                    String(index + 1).padStart(2, "0"),
                  )}
                  onSelect={(next) => setHour(Number(next))}
                />
                <TimeColumn
                  accent={accent}
                  accentInk="var(--theme-ink, #ffffff)"
                  selected={String(draft.getMinutes()).padStart(2, "0")}
                  values={Array.from({ length: 60 }, (_, index) =>
                    String(index).padStart(2, "0"),
                  )}
                  onSelect={(next) => setMinute(Number(next))}
                />
                <TimeColumn
                  accent={accent}
                  accentInk="var(--theme-ink, #ffffff)"
                  selected={period}
                  values={["AM", "PM"]}
                  onSelect={(next) => setPeriod(next as "AM" | "PM")}
                />
              </div>}
            </div>
          </section>,
          document.body,
        )}
    </div>
  );
}

export function DateInput(
  props: Omit<DateTimeInputProps, "dateOnly">,
) {
  return <DateTimeInput {...props} dateOnly />;
}
