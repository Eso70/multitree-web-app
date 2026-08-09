"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  items: T[];
  columns: DataTableColumn<T>[];
  rowKey: (item: T) => string;
  emptyTitle: string;
  minWidthClassName?: string;
}

export function DataTable<T>({
  items,
  columns,
  rowKey,
  emptyTitle,
  minWidthClassName = "min-w-[760px]",
}: DataTableProps<T>) {
  if (!items.length) {
    return (
      <EmptyState compact icon={Inbox} title={emptyTitle} description="هیچ داتایەک بۆ پیشاندان نییە." />
    );
  }

  return (
    <div className="custom-scrollbar lime-custom-scrollbar theme-custom-scrollbar overflow-x-auto overscroll-contain">
      <table className={`w-full ${minWidthClassName} text-left text-xs`}>
        <thead>
          <tr className="border-b border-slate-100 text-slate-400 dark:border-white/5">
            {columns.map((column) => (
              <th
                key={column.id}
                className={`px-3 py-3 font-semibold ${column.headerClassName || ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={rowKey(item)}
              className="border-b border-slate-100 text-slate-600 transition last:border-b-0 hover:bg-slate-50/60 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.03]"
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-3 py-3.5 ${column.className || ""}`}
                >
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
