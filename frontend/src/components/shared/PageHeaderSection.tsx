"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";

/**
 * `PageHeader` + a field grid, the shape every tabbed dashboard page
 * re-implements locally to render its active tab's content (see
 * BusinessSettingsPage's `SettingsSection`, BusinessAnalyticsPage's
 * `meta`-driven header). Centralized here so new tabbed pages (e.g. the
 * advertising service tabs) share the exact same header icon/title sizing
 * as the Linktrees, Mini Website, and Analytics pages instead of growing
 * their own header style.
 */
export function PageHeaderSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader icon={icon} title={title} description={description} action={action} />
      <div className="border-t border-slate-100 pt-6 dark:border-white/5">
        <div className="grid gap-5 sm:grid-cols-2">{children}</div>
      </div>
    </>
  );
}
