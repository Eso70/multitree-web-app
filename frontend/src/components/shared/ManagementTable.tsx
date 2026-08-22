"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { TablePagination } from "@/components/shared/TablePagination";

/**
 * The one list treatment every management screen uses.
 *
 * Distinct from `DataTable`, which draws the small read-only aggregate tables
 * inside analytics cards. This one is for the screens a record is *managed*
 * from: rows with actions, a mobile card fallback, and pagination.
 *
 * Four screens had grown their own table: the breakpoint the desktop table
 * gave way to cards differed (`sm` on the business dashboard, `md` in the
 * platform admin), one paginated at ten rows inside itself while the others
 * paginated outside or not at all, and the empty and loading states were a
 * bare table row on one screen and a full `EmptyState` on the next. Switching
 * between two tabs of the same dashboard looked like switching products.
 *
 * This owns the frame — direction, breakpoint, header, skeleton, empty state
 * and pagination — and leaves each screen its own row and card bodies, which
 * are genuinely domain-specific.
 */

/** Where a column stops being rendered on narrow screens. */
export type ManagementTableBreakpoint = "sm" | "md" | "lg" | "xl";

/**
 * Written out rather than interpolated: Tailwind only ships classes it can see
 * as complete strings in the source.
 */
const HIDE_BELOW_CLASSES: Record<ManagementTableBreakpoint, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export interface ManagementTableColumn {
  /** Stable identity for the header cell. */
  key: string;
  /** Header text. Omit for a column that needs no label, such as an avatar. */
  header?: ReactNode;
  /** Tailwind width classes, for example `"w-32 sm:w-40"`. */
  width?: string;
  /** Hide the column below this breakpoint. */
  hideBelow?: ManagementTableBreakpoint;
  className?: string;
}

export type ManagementTablePagination =
  /**
   * The screen already holds every row, so the table pages through them
   * itself. Used by the linktree and mini-website lists, which fetch the whole
   * collection in one request.
   */
  | { mode: "client"; pageSize?: number }
  /**
   * The server pages, and the screen owns the page number. Used by the
   * platform admin's business and creator lists.
   */
  | {
      mode: "server";
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      onPageChange: (page: number) => void;
    };

/** Rows shown per page when a client-paged table does not say otherwise. */
export const MANAGEMENT_TABLE_PAGE_SIZE = 20;

export interface ManagementTableEmptyState {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export interface ManagementTableProps<T> {
  data: T[];
  columns: ManagementTableColumn[];
  getRowKey: (item: T) => string;
  /** The `<tr>` for one row. Receives the column count for any `colSpan`. */
  renderRow: (item: T, columnCount: number) => ReactNode;
  /** The card body shown instead of the row below the `md` breakpoint. */
  renderCard: (item: T) => ReactNode;
  isLoading?: boolean;
  empty?: ManagementTableEmptyState;
  /** Minimum table width before the horizontal scroller takes over. */
  minWidth?: string;
  pagination?: ManagementTablePagination;
  skeletonRows?: number;
  className?: string;
}

/**
 * Turns a list plus a pagination mode into the rows to draw and the footer to
 * draw under them. Shared by `ManagementTable` and the card grids so a screen's
 * table and grid views page the same way — they used to disagree, and switching
 * the view toggle silently changed how many records you were looking at.
 */
export function useManagementPagination<T>(
  data: T[],
  pagination?: ManagementTablePagination,
) {
  const [clientPage, setClientPage] = useState(1);
  const clientPageSize =
    pagination?.mode === "client"
      ? pagination.pageSize || MANAGEMENT_TABLE_PAGE_SIZE
      : MANAGEMENT_TABLE_PAGE_SIZE;

  // Clamped rather than reset: a delete that empties the last page should fall
  // back to the new last page instead of throwing the reader to the top.
  const clientTotalPages = Math.max(1, Math.ceil(data.length / clientPageSize));
  const currentClientPage = Math.min(clientPage, clientTotalPages);

  const visibleData = useMemo(() => {
    if (pagination?.mode !== "client") return data;
    const start = (currentClientPage - 1) * clientPageSize;
    return data.slice(start, start + clientPageSize);
  }, [data, pagination?.mode, currentClientPage, clientPageSize]);

  const footer =
    pagination?.mode === "client" ? (
      <TablePagination
        page={currentClientPage}
        pageSize={clientPageSize}
        totalItems={data.length}
        totalPages={clientTotalPages}
        onPageChange={setClientPage}
      />
    ) : pagination?.mode === "server" ? (
      <TablePagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.onPageChange}
      />
    ) : null;

  return { visibleData, footer };
}

export function ManagementTable<T>({
  data,
  columns,
  getRowKey,
  renderRow,
  renderCard,
  isLoading = false,
  empty,
  minWidth = "min-w-[600px]",
  pagination,
  skeletonRows = 6,
  className = "",
}: ManagementTableProps<T>) {
  const { visibleData, footer } = useManagementPagination(data, pagination);

  const columnCount = columns.length;

  if (isLoading) {
    return (
      <div className={`w-full ${className}`} dir="ltr">
        <SkeletonTable rows={skeletonRows} />
      </div>
    );
  }

  if (data.length === 0 && empty) {
    return (
      <div className={`w-full ${className}`} dir="ltr">
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description || ""}
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} dir="ltr">
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-100 border-t border-b border-slate-200/80 dark:divide-white/5 dark:border-white/10">
        {visibleData.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-400">
            هیچ داتایەک نەدۆزرایەوە
          </div>
        ) : (
          visibleData.map((item) => (
            <div key={getRowKey(item)}>{renderCard(item)}</div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <table className={`w-full table-fixed border-collapse ${minWidth}`}>
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 ${
                    column.hideBelow ? HIDE_BELOW_CLASSES[column.hideBelow] : ""
                  } ${column.width || ""} ${column.className || ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {visibleData.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-8 text-center text-xs text-gray-500 sm:text-sm"
                >
                  هیچ داتایەک نەدۆزرایەوە
                </td>
              </tr>
            ) : (
              visibleData.map((item) => (
                <Fragment key={getRowKey(item)}>
                  {renderRow(item, columnCount)}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}

/** The `<tr>` classes every row body shares. */
export const MANAGEMENT_TABLE_ROW_CLASS =
  "border-b border-slate-100 transition-colors duration-200 transform-gpu hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/5";

/** The card wrapper classes every mobile card body shares. */
export const MANAGEMENT_TABLE_CARD_CLASS =
  "flex gap-4 p-4 transition-colors duration-200 transform-gpu hover:bg-slate-50/50 dark:hover:bg-white/5";

/** Maps a column's breakpoint to the class its matching `<td>` must carry. */
export function hideBelowClass(breakpoint?: ManagementTableBreakpoint) {
  return breakpoint ? HIDE_BELOW_CLASSES[breakpoint] : "";
}
