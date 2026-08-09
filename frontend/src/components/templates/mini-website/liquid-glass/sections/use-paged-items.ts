import { useState } from "react";

/**
 * One paging control shared by every section that steps through more items
 * than it shows at once.
 *
 * A section that shows one featured item at a time passes `perPage = 1`; the
 * page is then simply the item index and `visible` holds that single item.
 * Sections that show a board pass their per-page count and page over
 * `Math.ceil(items.length / perPage)` pages. Both step through the list in a
 * ring, so the arrows never dead-end at the ends.
 *
 * Called before a section's early return so the hook order never depends on
 * whether a business has any data for it.
 */
export function usePagedItems<T>(items: readonly T[], perPage: number) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pageCount - 1);
  const start = current * perPage;
  const visible = items.slice(start, start + perPage);
  const next = () => setPage((value) => (value + 1) % pageCount);
  const previous = () =>
    setPage((value) => (value - 1 + pageCount) % pageCount);

  return { page: current, pageCount, start, visible, next, previous };
}
