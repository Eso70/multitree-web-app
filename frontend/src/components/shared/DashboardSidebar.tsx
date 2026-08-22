"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface DashboardSidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

interface DashboardSidebarProps {
  brandName: string;
  brandSubtitle: string;
  brandImage: string;
  brandImageAlt?: string;
  items: DashboardSidebarItem[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  footer?: ReactNode;
  accent?: string;
}

export function DashboardSidebar({
  brandName,
  brandSubtitle,
  brandImage,
  brandImageAlt = "Logo",
  items,
  collapsed,
  mobileOpen,
  onCloseMobile,
  footer,
  accent = "var(--theme-css, var(--multitree-accent, #64748b))",
}: DashboardSidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-all duration-300 md:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex flex-col overflow-hidden border-r border-slate-200 bg-white transition-[transform,width] duration-300 ease-out will-change-transform dark:border-white/10 dark:bg-[#161B22] md:sticky md:top-0 md:h-screen md:translate-x-0 md:will-change-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-64 md:w-20" : "w-64 md:w-72"}`}
      >
        <div
          className={`flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/5 ${collapsed ? "md:justify-center" : ""}`}
        >
          <div
            className={`flex items-center ${collapsed ? "md:justify-center md:gap-0" : "gap-3"}`}
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/10">
              <Image
                src={brandImage}
                alt={brandImageAlt}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
                priority
              />
            </div>
            <div
              className={`transition-all duration-300 ${collapsed ? "overflow-hidden md:pointer-events-none md:w-0 md:opacity-0" : "opacity-100"}`}
            >
              <h2 className="whitespace-nowrap text-base font-bold leading-tight">
                {brandName}
              </h2>
              <span className="block whitespace-nowrap text-xs text-slate-400 dark:text-gray-500">
                {brandSubtitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-[background-color,color,transform] duration-200 hover:bg-slate-50 hover:text-slate-600 active:scale-95 dark:hover:bg-white/5 dark:hover:text-gray-300 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="custom-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {items.map((item) =>
            item.hidden ? null : (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  onCloseMobile();
                }}
                className={`flex cursor-pointer items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                  collapsed ? "md:justify-center md:gap-0 md:px-0" : "gap-3"
                } ${
                  item.active
                    ? "text-slate-700 dark:text-gray-200"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                }`}
                style={
                  item.active
                    ? {
                        background: `color-mix(in srgb, ${accent} 20%, transparent)`,
                        color: accent,
                      }
                    : undefined
                }
                title={
                  item.disabled ? item.disabledReason || item.label : item.label
                }
                aria-disabled={item.disabled || undefined}
                aria-current={item.active ? "page" : undefined}
              >
                <span className="shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                <span
                  className={`whitespace-nowrap transition-all duration-300 ${collapsed ? "overflow-hidden md:pointer-events-none md:w-0 md:opacity-0" : "opacity-100"}`}
                >
                  {item.label}
                </span>
              </button>
            ),
          )}
        </nav>

        {footer}
      </aside>
    </>
  );
}
