import {
  MINI_WEBSITE_DAY_INDEX,
  MINI_WEBSITE_DAY_KEYS,
  createMiniWebsiteWeekHours,
  type MiniWebsiteDayHours,
  type MiniWebsiteDayKey,
  type MiniWebsiteWeekHours,
} from "@linktree/types";

/**
 * Opening-hours logic, kept free of React so both the editor and the public page
 * answer "is it open?" the same way, and so the awkward cases — a day that runs
 * past midnight, a week with nothing open — are testable on their own.
 *
 * Times are wall-clock in the business's own timezone and are compared against
 * the reader's device clock. For a local business read by local customers those
 * are the same clock; a timezone field is only worth adding once pages are read
 * from another one.
 */

export const DAY_LABELS: Record<MiniWebsiteDayKey, string> = {
  sat: "شەممە",
  sun: "یەکشەممە",
  mon: "دووشەممە",
  tue: "سێشەممە",
  wed: "چوارشەممە",
  thu: "پێنجشەممە",
  fri: "هەینی",
};

const MINUTES_PER_DAY = 24 * 60;

/** `HH:MM` to minutes past midnight, or null when the value is unusable. */
export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Pads a minute count back into `HH:MM`, wrapping past midnight. */
export function formatTime(minutes: number): string {
  const wrapped =
    ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  return `${String(hours).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/**
 * `HH:MM`, zero-padded, or the fallback when the value is unusable.
 *
 * The padding is not cosmetic. The server pads too, so returning `9:00`
 * unchanged here means the editor shows one string and the next read shows
 * another for a time nobody edited.
 */
function normalizeTime(value: string, fallback: string): string {
  const minutes = parseTime(value);
  return minutes === null ? fallback : formatTime(minutes);
}

/**
 * Fills in whatever a record is missing, so a location saved before this section
 * existed — or one that lost a day somehow — still renders a full week.
 *
 * Matches the server: no week at all falls back to the usual one, a week that
 * omits a day marks that day closed rather than inventing hours for it, a time
 * is padded to `HH:MM`, and where a day is listed twice the first entry wins.
 * The server is what actually stores the week, so where the two could disagree
 * this follows it rather than the other way round.
 */
export function normalizeWeek(value: unknown): MiniWebsiteWeekHours {
  const entries = Array.isArray(value) ? value : [];
  const byDay = new Map<string, MiniWebsiteDayHours>();
  for (const entry of entries) {
    const day = String((entry as MiniWebsiteDayHours)?.day || "");
    if (
      MINI_WEBSITE_DAY_KEYS.includes(day as MiniWebsiteDayKey) &&
      !byDay.has(day)
    )
      byDay.set(day, entry as MiniWebsiteDayHours);
  }
  const fallback = createMiniWebsiteWeekHours();
  return MINI_WEBSITE_DAY_KEYS.map((day, index) => {
    const source = byDay.get(day);
    if (!source)
      return byDay.size
        ? { ...fallback[index], closed: true }
        : fallback[index];
    return {
      day,
      closed: source.closed === true,
      open: normalizeTime(source.open, fallback[index].open),
      close: normalizeTime(source.close, fallback[index].close),
    };
  });
}

/** True once at least one day is open — an all-closed week is not worth showing. */
export function hasOpenDay(week: MiniWebsiteWeekHours): boolean {
  return week.some((entry) => !entry.closed && parseTime(entry.open) !== null);
}

function dayEntry(
  week: MiniWebsiteWeekHours,
  dayIndex: number,
): MiniWebsiteDayHours | undefined {
  return week.find((entry) => MINI_WEBSITE_DAY_INDEX[entry.day] === dayIndex);
}

/**
 * Minutes a day is open for, as a half-open span from its opening time.
 *
 * A close at or before the open means the day runs into the next one, so the
 * span is extended past midnight instead of collapsing to nothing. Equal times
 * are read as around the clock, which is how a 24-hour shop enters itself.
 */
function daySpan(
  entry: MiniWebsiteDayHours,
): { start: number; end: number } | null {
  if (entry.closed) return null;
  const start = parseTime(entry.open);
  const close = parseTime(entry.close);
  if (start === null || close === null) return null;
  const end = close > start ? close : close + MINUTES_PER_DAY;
  return { start, end };
}

export interface OpenState {
  open: boolean;
  /** `HH:MM` the current span ends, when open. */
  closesAt?: string;
  /** `HH:MM` the next span starts, when closed and one is scheduled this week. */
  opensAt?: string;
  /** Day the next opening falls on, when it is not today. */
  opensDay?: MiniWebsiteDayKey;
}

/**
 * Whether the week is open at `now`.
 *
 * Yesterday is checked as well as today, so a span that started at 18:00 and
 * runs to 02:00 still reads as open at one in the morning.
 */
export function openState(
  week: MiniWebsiteWeekHours,
  now = new Date(),
): OpenState {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  for (const offset of [1, 0]) {
    const entry = dayEntry(week, (today - offset + 7) % 7);
    if (!entry) continue;
    const span = daySpan(entry);
    if (!span) continue;
    const elapsed = minutes + offset * MINUTES_PER_DAY;
    if (elapsed >= span.start && elapsed < span.end)
      return { open: true, closesAt: formatTime(span.end) };
  }

  // Closed: look ahead a full week for the next opening, including later today.
  for (let ahead = 0; ahead < 7; ahead += 1) {
    const entry = dayEntry(week, (today + ahead) % 7);
    if (!entry) continue;
    const span = daySpan(entry);
    if (!span) continue;
    if (ahead === 0 && span.start <= minutes) continue;
    return {
      open: false,
      opensAt: formatTime(span.start),
      ...(ahead === 0 ? {} : { opensDay: entry.day }),
    };
  }

  return { open: false };
}

/**
 * A day that never closes. Equal opening and closing times are how a round-the-
 * clock day is written, and midnight to midnight is the canonical pair.
 */
export const ALL_DAY_OPEN = "00:00";

export function isAllDay(entry: MiniWebsiteDayHours): boolean {
  if (entry.closed) return false;
  const open = parseTime(entry.open);
  const close = parseTime(entry.close);
  return open !== null && close !== null && open === close;
}

/** Open around the clock, every day — what a 24/7 business publishes. */
export function isOpenAllWeek(week: MiniWebsiteWeekHours): boolean {
  return week.length > 0 && week.every(isAllDay);
}

export function createAllWeekHours(): MiniWebsiteWeekHours {
  return MINI_WEBSITE_DAY_KEYS.map((day) => ({
    day,
    closed: false,
    open: ALL_DAY_OPEN,
    close: ALL_DAY_OPEN,
  }));
}

/** True when every open day keeps the same times, so one pair describes the week. */
export function sharesOneSchedule(week: MiniWebsiteWeekHours): boolean {
  const open = week.filter((entry) => !entry.closed);
  if (!open.length) return false;
  return open.every(
    (entry) => entry.open === open[0].open && entry.close === open[0].close,
  );
}

/** Puts one pair of times on every day that is open, leaving closed days alone. */
export function applyToOpenDays(
  week: MiniWebsiteWeekHours,
  open: string,
  close: string,
): MiniWebsiteWeekHours {
  return week.map((entry) =>
    entry.closed ? entry : { ...entry, open, close },
  );
}

/** Normalize Arabic-Indic and Eastern Arabic digits to Latin display digits. */
export function latinDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

/** `09:00 - 18:00`, or the closed label. */
export function formatDayRange(
  entry: MiniWebsiteDayHours,
  closedLabel = "داخراوە",
): string {
  const span = daySpan(entry);
  if (!span) return closedLabel;
  if (span.end - span.start >= MINUTES_PER_DAY) return "24 کاتژمێر";
  return `${entry.open} - ${entry.close}`;
}
