/**
 * How long a record has existed, as three tiers.
 *
 * A list marks each row by age so the reader can tell a freshly created record
 * from one that has been around a while without parsing a timestamp. Used by
 * the business dashboard for Linktree pages and by the platform admin for
 * businesses. Derived from the creation date only; says nothing about traffic
 * or activity.
 */

export type RecordAgeTier = "new" | "growing" | "old";

/** Upper bound, in days, for each tier. Anything past `growing` is `old`. */
export const RECORD_AGE_TIER_DAYS = {
  new: 7,
  growing: 30,
} as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RecordAgeBadge {
  tier: RecordAgeTier;
  /** Short pill label. */
  label: string;
  /** Tooltip explaining the tier. */
  title: string;
  /** Tailwind classes for the pill body. */
  className: string;
}

export const RECORD_AGE_BADGES: Record<RecordAgeTier, RecordAgeBadge> = {
  new: {
    tier: "new",
    label: "نوێ",
    title: `کەمتر لە ${RECORD_AGE_TIER_DAYS.new} ڕۆژ لەمەوبەر دروستکراوە`,
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  growing: {
    tier: "growing",
    label: "لە گەشەدا",
    title: `لە نێوان ${RECORD_AGE_TIER_DAYS.new} و ${RECORD_AGE_TIER_DAYS.growing} ڕۆژ دروستکراوە`,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  old: {
    tier: "old",
    label: "کۆن",
    title: `زیاتر لە ${RECORD_AGE_TIER_DAYS.growing} ڕۆژە دروستکراوە`,
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/15",
  },
};

/**
 * Resolve the age tier of a record. Returns `null` when the date is missing or
 * unparseable so callers can skip the badge instead of showing a wrong one.
 */
export function getRecordAgeTier(
  createdAt: string | Date | null | undefined,
  now: Date | number = Date.now(),
): RecordAgeTier | null {
  if (!createdAt) return null;

  const created =
    createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (Number.isNaN(created)) return null;

  const reference = now instanceof Date ? now.getTime() : now;
  const ageDays = (reference - created) / MS_PER_DAY;

  if (ageDays < RECORD_AGE_TIER_DAYS.new) return "new";
  if (ageDays < RECORD_AGE_TIER_DAYS.growing) return "growing";
  return "old";
}

/** Convenience wrapper returning the badge descriptor for a creation date. */
export function getRecordAgeBadge(
  createdAt: string | Date | null | undefined,
  now?: Date | number,
): RecordAgeBadge | null {
  const tier = getRecordAgeTier(createdAt, now);
  return tier ? RECORD_AGE_BADGES[tier] : null;
}
