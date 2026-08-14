"use client";

import { Languages, Menu, Moon, RefreshCw, Sun } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import {
  AvatarMenu,
  type AvatarMenuItem,
} from "@/components/shared/AvatarMenu";

export function DashboardHeaderActionButton({
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`group relative flex items-center justify-center rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-gray-50 p-2 text-slate-500 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:text-slate-700 hover:shadow disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:from-white/5 dark:to-white/5 dark:text-gray-300 dark:hover:from-white/10 dark:hover:to-white/10 sm:p-2.5 md:p-3 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface DashboardHeaderProps {
  title: string;
  theme: "light" | "dark";
  mounted: boolean;
  refreshing: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onRefresh: () => void | Promise<void>;
  notifications: ReactNode;
  profile: {
    name?: string;
    email?: string;
    badge?: string;
    avatarSrc?: string | null;
    items: AvatarMenuItem[];
  };
  onProfileItemClick?: () => void;
}

const iconClassName =
  "h-4 w-4 transition-transform group-hover:scale-110 sm:h-4 sm:w-4 md:h-5 md:w-5";

export function DashboardHeader({
  title,
  theme,
  mounted,
  refreshing,
  onToggleSidebar,
  onToggleTheme,
  onRefresh,
  notifications,
  profile,
  onProfileItemClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#161B22]/80">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <DashboardHeaderActionButton
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className={iconClassName} aria-hidden="true" />
          </DashboardHeaderActionButton>
          <h1 className="truncate text-base font-bold sm:text-lg">{title}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <DashboardHeaderActionButton
            onClick={() => void onRefresh()}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Refresh dashboard data"
            title="Refresh dashboard data"
          >
            <MotionSpinner active={refreshing}>
              <RefreshCw className={iconClassName} aria-hidden="true" />
            </MotionSpinner>
          </DashboardHeaderActionButton>

          {notifications}

          <DashboardHeaderActionButton
            aria-label="Toggle language"
            title="Toggle language"
            className="hidden sm:flex"
          >
            <Languages className={iconClassName} aria-hidden="true" />
          </DashboardHeaderActionButton>

          <DashboardHeaderActionButton
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {!mounted ? (
              <span className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            ) : theme === "light" ? (
              <Moon className={iconClassName} aria-hidden="true" />
            ) : (
              <Sun className={iconClassName} aria-hidden="true" />
            )}
          </DashboardHeaderActionButton>

          <AvatarMenu
            name={profile.name}
            email={profile.email}
            badge={profile.badge}
            avatarSrc={profile.avatarSrc}
            ariaLabel="Account menu"
            items={profile.items}
            onItemClick={onProfileItemClick}
          />
        </div>
      </div>
    </header>
  );
}
