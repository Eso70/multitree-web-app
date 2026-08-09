const KURDISH_MONTHS = [
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
] as const;

const ENGLISH_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const PUBLIC_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/**
 * Formats saved local dates without Intl or the host timezone.
 *
 * Node and browsers can ship different ICU data for Kurdish, which makes an
 * SSR date render differently during hydration. Saved offers and events are
 * already local calendar values, so keeping their numeric parts is also more
 * correct than converting them through Date.
 */
export function formatPublicMiniWebsiteDate(
  value: string,
  includeTime = false,
) {
  const match = PUBLIC_DATE_PATTERN.exec(value.trim());
  if (!match) return value;

  const [, year, monthText, dayText, hour, minute] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return value;

  const date = `${day}ی ${KURDISH_MONTHS[month - 1]} ${year}`;
  return includeTime && hour && minute ? `${date} · ${hour}:${minute}` : date;
}

/**
 * English badge formatter for event artwork, built from the same saved local
 * calendar values as the Kurdish formatter so it stays timezone-stable.
 *
 * It is metadata read at a glance, so it renders in English ("Aug 6, 2026 ·
 * 5:00 PM") while the event copy itself stays in the business's own language.
 */
export function formatPublicEventDate(value: string): string {
  const match = PUBLIC_DATE_PATTERN.exec(value.trim());
  if (!match) return value;

  const [, year, monthText, dayText, hour, minute] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return value;

  const date = `${ENGLISH_MONTHS[month - 1]} ${day}, ${year}`;
  if (!hour || !minute) return date;

  const hours = Number(hour);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${date} · ${hour12}:${minute} ${period}`;
}

export function subscribeToClientDate(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
}

export function readClientIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function readServerIsoDate() {
  return "";
}
