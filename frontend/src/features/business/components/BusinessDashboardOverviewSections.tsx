import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  ContactRound,
  FileText,
  IdCard,
  LayoutTemplate,
  Settings,
} from "lucide-react";
import { TbBrandTiktok } from "react-icons/tb";
import type {
  BusinessDashboardCrmSummary,
  BusinessDashboardPageAsset,
  BusinessDashboardTikTokHealth,
  EffectiveAccessManifest,
} from "@linktree/types";
import type { DashboardAttentionItem } from "@/features/business/dashboard-overview-utils";
import { publishedCount } from "@/features/business/dashboard-overview-utils";

const actionClass =
  "group flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-[#1c222b] dark:hover:border-white/20";

export function DashboardQuickActions({
  canUseMiniWebsites,
  canUseCrm,
}: {
  canUseMiniWebsites: boolean;
  canUseCrm: boolean;
}) {
  const actions = [
    {
      href: "/business/pages?create=default",
      label: "پەیجی نوێ دروست بکە",
      detail: "Linktree",
      icon: FileText,
    },
    {
      href: "/business/mini-website",
      label: canUseMiniWebsites
        ? "مینی وێبسایت بەڕێوەببە"
        : "مینی وێبسایت ببینە",
      detail: canUseMiniWebsites ? "Website" : "پێویستی بە پلانی بەرزترە",
      icon: IdCard,
    },
    {
      href: "/business/analytics",
      label: "شیکاری ورد ببینە",
      detail: "Analytics",
      icon: BarChart3,
    },
    {
      href: "/business/crm",
      label: canUseCrm ? "داواکارییەکان بەدواداچوون بکە" : "CRM ببینە",
      detail: canUseCrm ? "CRM" : "پێویستی بە پلانی Ultraیە",
      icon: ContactRound,
    },
  ];

  return (
    <section aria-labelledby="dashboard-quick-actions">
      <h3
        id="dashboard-quick-actions"
        className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200"
      >
        کردارە خێراکان
      </h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className={actionClass}>
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--theme-primary, #64748b) 13%, transparent)",
                    color: "var(--theme-primary, #64748b)",
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
              </div>
              <div className="mt-4 min-w-0">
                <p className="text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">
                  {action.label}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {action.detail}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardContentStatus({
  pages,
}: {
  pages: BusinessDashboardPageAsset[];
}) {
  const groups = [
    {
      type: "linktree" as const,
      label: "پەیجەکانی Linktree",
      href: "/business/pages",
      icon: FileText,
    },
    {
      type: "mini_website" as const,
      label: "مینی وێبسایتەکان",
      href: "/business/mini-website",
      icon: IdCard,
    },
  ];

  return (
    <section
      aria-labelledby="dashboard-content-status"
      className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3
            id="dashboard-content-status"
            className="text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            دۆخی ناوەڕۆک
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            دۆخی ڕاستەقینەی پەیجە گشتییەکانت
          </p>
        </div>
        <LayoutTemplate className="h-5 w-5 text-slate-300 dark:text-slate-600" />
      </div>
      <div className="space-y-2">
        {groups.map((group) => {
          const total = pages.filter((page) => page.type === group.type).length;
          const published = publishedCount(pages, group.type);
          const unpublished = total - published;
          const Icon = group.icon;
          return (
            <Link
              key={group.type}
              href={group.href}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.035]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                  {group.label}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {published.toLocaleString()} بڵاوکراوە · {unpublished.toLocaleString()} بڵاونەکراوە
                </p>
              </div>
              <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                {total.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardTopPages({
  pages,
}: {
  pages: BusinessDashboardPageAsset[];
}) {
  const topPages = [...pages]
    .filter((page) => page.status === "published")
    .sort((left, right) => right.views - left.views || right.clicks - left.clicks)
    .slice(0, 4);

  return (
    <section
      aria-labelledby="dashboard-top-pages"
      className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3
            id="dashboard-top-pages"
            className="text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            پەیجە کاراترەکان
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            بە پێی کۆی بینین لە هەموو کاتەکاندا
          </p>
        </div>
        <Link
          href="/business/analytics"
          className="text-[11px] font-bold hover:underline"
          style={{ color: "var(--theme-primary, #64748b)" }}
        >
          هەموو شیکارییەکان
        </Link>
      </div>
      {topPages.length ? (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {topPages.map((page, index) => (
            <div key={page.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 dark:bg-white/5 dark:text-slate-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                  {page.name}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {page.type === "linktree" ? "Linktree" : "Mini Website"}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {page.views.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-400">بینین</p>
              </div>
              <div className="hidden shrink-0 text-end sm:block">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {page.clicks.toLocaleString()}
                </p>
                <p className="text-[9px] text-slate-400">کارلێک</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-white/10">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            هێشتا پەیجێکی بڵاوکراوە نییە
          </p>
          <Link
            href="/business/pages?create=default"
            className="mt-2 inline-block text-[11px] font-bold hover:underline"
            style={{ color: "var(--theme-primary, #64748b)" }}
          >
            یەکەم پەیج دروست بکە
          </Link>
        </div>
      )}
    </section>
  );
}

const attentionTone = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.07] dark:text-amber-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/[0.07] dark:text-rose-300",
  blue: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/[0.07] dark:text-sky-300",
};

export function DashboardAttentionList({
  items,
}: {
  items: DashboardAttentionItem[];
}) {
  return (
    <section
      aria-labelledby="dashboard-attention"
      className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <CircleAlert className="h-4 w-4 text-amber-500" aria-hidden="true" />
        <h3
          id="dashboard-attention"
          className="text-sm font-bold text-slate-700 dark:text-slate-200"
        >
          پێویستی بە سەرنجدان
        </h3>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition hover:brightness-95 dark:hover:brightness-110 ${attentionTone[item.tone]}`}
            >
              <span>{item.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07] dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-[11px] font-bold">
            هیچ کێشەیەک نەدۆرزرایەوە
          </p>
        </div>
      )}
    </section>
  );
}

export function DashboardOperations({
  crm,
  tikTok,
  canReadCrm,
  canReadTikTok,
}: {
  crm: BusinessDashboardCrmSummary | null;
  tikTok: BusinessDashboardTikTokHealth | null;
  canReadCrm: boolean;
  canReadTikTok: boolean;
}) {
  return (
    <section
      aria-labelledby="dashboard-operations"
      dir="ltr"
      className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 sm:p-5"
    >
      <h3
        id="dashboard-operations"
        className="mb-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200"
      >
        کار و پەیوەندییەکان
      </h3>
      <div className="grid divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/5 dark:border-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <Link
          href="/business/crm"
          className="group p-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-white/[0.025] sm:pe-5"
        >
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <ContactRound className="h-4 w-4 shrink-0 transition-colors group-hover:text-[var(--theme-primary,#64748b)]" />
            <span className="text-[11px] font-bold">
              بەڕێوەبردنی پەیوەندییەکانی کڕیار
            </span>
          </div>
          {canReadCrm && crm ? (
            <>
              <p className="mt-3 text-2xl font-black text-slate-700 dark:text-slate-100">
                {crm.statuses.new.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                داواکاری نوێ · {crm.total.toLocaleString()} کۆی گشتی
              </p>
            </>
          ) : (
            <p className="mt-3 text-[11px] font-medium leading-5 text-slate-400">
              {canReadCrm
                ? "داتای CRM بەردەست نییە"
                : "لە پلانی Ultraدا بەردەستە"}
            </p>
          )}
        </Link>

        <Link
          href="/business/tiktok-config"
          className="group p-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-white/[0.025] sm:ps-5"
        >
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <TbBrandTiktok className="h-4 w-4 shrink-0 transition-colors group-hover:text-[var(--theme-primary,#64748b)]" />
            <span className="text-[11px] font-bold">
              ڕێکخستنەکانی تیکتۆک
            </span>
          </div>
          {canReadTikTok && tikTok ? (
            <>
              <p className="mt-3 text-2xl font-black text-slate-700 dark:text-slate-100">
                {tikTok.connections.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                پەیوەندی چالاک · {tikTok.failed.toLocaleString()} ناردنی شکستخواردوو
              </p>
            </>
          ) : (
            <p className="mt-3 text-[11px] font-medium leading-5 text-slate-400">
              {canReadTikTok
                ? "دۆخی TikTok بەردەست نییە"
                : "ڕاپۆرتی ناردن لە پلانی ئێستادا نییە"}
            </p>
          )}
        </Link>
      </div>
    </section>
  );
}

const planUsageDefinitions = [
  {
    key: "limit.linktrees",
    label: "لینکتری و مینی وێبسایت",
    href: "/business/pages",
  },
  {
    key: "limit.tiktok_pixels",
    label: "گرووپەکانی TikTok Pixel",
    href: "/business/tiktok-config",
  },
] as const;

export function DashboardPlanUsage({
  access,
}: {
  access: EffectiveAccessManifest;
}) {
  const usage = planUsageDefinitions.flatMap((definition) => {
    const item = access.usage[definition.key];
    return item ? [{ ...definition, item }] : [];
  });
  const periodEnd = access.subscription.currentPeriodEnd
    ? new Date(access.subscription.currentPeriodEnd).toLocaleDateString("ckb-IQ", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <section
      aria-labelledby="dashboard-plan-usage"
      className="rounded-2xl border border-slate-100 p-4 dark:border-white/5 sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3
            id="dashboard-plan-usage"
            className="text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            پلان و بەکارهێنان
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            {access.subscription.planName}
            {periodEnd ? ` · تا ${periodEnd}` : ""}
          </p>
        </div>
        <Link
          href="/business/settings"
          aria-label="ڕێکخستنەکان"
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
      {usage.length ? (
        <div className="space-y-4">
          {usage.map(({ key, label, href, item }) => {
            const unlimited = item.limit === -1;
            const percent = unlimited || item.limit <= 0
              ? 0
              : Math.min(100, Math.max(0, (item.used / item.limit) * 100));
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
                  <Link
                    href={href}
                    className="font-bold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    {label}
                  </Link>
                  <span className="text-slate-400">
                    {unlimited
                      ? `${item.used.toLocaleString()} · بێ سنوور`
                      : `${item.used.toLocaleString()} / ${item.limit.toLocaleString()}`}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${percent}%`,
                      background: "var(--theme-primary, #64748b)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          هیچ سنوورێکی بەکارهێنان دیاری نەکراوە
        </p>
      )}
    </section>
  );
}
