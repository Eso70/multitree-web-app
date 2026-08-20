"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import { apiRequest } from "@/lib/api/request";

type Creator = {
  id: string;
  email: string;
  display_name: string;
  status: "active" | "suspended" | "expired" | "archived";
  page_type: "linktree" | "mini_website" | null;
  page_slug: string | null;
  phone_last_four: string | null;
  billing_status: string;
  created_at: string;
};

type CreatorList = {
  items: Creator[];
  pagination: { page: number; pages: number; total: number };
  stats: {
    total?: number;
    trialing?: number;
    paid?: number;
    suspended?: number;
  };
};

export function CreatorUsersPage() {
  const [data, setData] = useState<CreatorList | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("search", query.trim());
        setData(
          await apiRequest<CreatorList>(`/api/platform/creators?${params}`),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "بارکردنی بەکارهێنەران سەرکەوتوو نەبوو",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const manage = async (
    creator: Creator,
    action:
      | "suspend"
      | "reactivate"
      | "activate_paid"
      | "cancel_paid"
      | "extend_trial",
  ) => {
    setBusyId(creator.id);
    try {
      await apiRequest(`/api/platform/creators/${creator.id}`, {
        method: "PATCH",
        json: { action, ...(action === "extend_trial" ? { days: 7 } : {}) },
      });
      toast.success("هەژماری Creator نوێ کرایەوە");
      await load(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "کردارەکە سەرکەوتوو نەبوو",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      <StatCardGrid columns={4}>
        <StatCard
          loading={loading}
          icon={Users}
          label="هەموو بەکارهێنەران"
          value={data?.stats.total || 0}
          color="blue"
        />
        <StatCard
          loading={loading}
          icon={RefreshCw}
          label="لە تاقیکردنەوەدان"
          value={data?.stats.trialing || 0}
          color="purple"
        />
        <StatCard
          loading={loading}
          icon={CreditCard}
          label="پارەدراو"
          value={data?.stats.paid || 0}
          color="green"
        />
        <StatCard
          loading={loading}
          icon={ShieldAlert}
          label="ڕاگیراو"
          value={data?.stats.suspended || 0}
          color="orange"
        />
      </StatCardGrid>
      <DashboardSurface className="space-y-6">
        <PageHeader
          title="بەکارهێنەرەکان"
          description="هەژمارە سەربەخۆکان، تاقیکردنەوە و چالاککردنی پارەدان بەڕێوە ببە."
          icon={Users}
          action={
            <div className="flex gap-2">
              <label className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="گەڕان..."
                  className="h-10 w-48 rounded-xl border border-slate-200 bg-white pr-9 text-sm outline-none dark:border-white/10 dark:bg-white/5"
                />
              </label>
              <button
                onClick={() => void load(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10"
                aria-label="نوێکردنەوە"
              >
                <MotionSpinner active={refreshing}>
                  <RefreshCw className="h-4 w-4" />
                </MotionSpinner>
              </button>
            </div>
          }
        />
        {loading ? (
          <SkeletonTable rows={6} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5">
                <tr>
                  <th className="p-4">بەکارهێنەر</th>
                  <th className="p-4">پەڕە</th>
                  <th className="p-4">دۆخی بەشداری</th>
                  <th className="p-4">پشتڕاستکردنەوە</th>
                  <th className="p-4">بەروار</th>
                  <th className="p-4">کردار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {(data?.items || []).map((creator) => (
                  <tr
                    key={creator.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
                  >
                    <td className="p-4">
                      <p className="font-bold text-slate-800 dark:text-white">
                        {creator.display_name}
                      </p>
                      <p className="text-xs text-slate-500" dir="ltr">
                        {creator.email}
                      </p>
                    </td>
                    <td className="p-4">
                      <p>
                        {creator.page_type === "linktree"
                          ? "لینک‌تری"
                          : creator.page_type === "mini_website"
                            ? "مینی وێبسایت"
                            : "دروست نەکراوە"}
                      </p>
                      {creator.page_slug ? (
                        <a
                          target="_blank"
                          href={`/${creator.page_type === "linktree" ? "linktree" : "bio"}/${creator.page_slug}`}
                          className="text-xs text-blue-600 underline"
                        >
                          {creator.page_slug}
                        </a>
                      ) : null}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold dark:bg-white/10">
                        {creator.billing_status}
                      </span>
                    </td>
                    <td className="p-4" dir="ltr">
                      {creator.phone_last_four
                        ? `•••• ${creator.phone_last_four}`
                        : "Google"}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(creator.created_at).toLocaleDateString("ku")}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busyId === creator.id}
                          onClick={() =>
                            void manage(
                              creator,
                              creator.status === "suspended"
                                ? "reactivate"
                                : "suspend",
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold dark:border-white/10"
                        >
                          {creator.status === "suspended"
                            ? "چالاککردنەوە"
                            : "ڕاگرتن"}
                        </button>
                        <button
                          disabled={busyId === creator.id}
                          onClick={() => void manage(creator, "extend_trial")}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold dark:border-white/10"
                        >
                          +٧ ڕۆژ
                        </button>
                        <button
                          disabled={busyId === creator.id}
                          onClick={() =>
                            void manage(
                              creator,
                              creator.billing_status === "active"
                                ? "cancel_paid"
                                : "activate_paid",
                            )
                          }
                          className="rounded-lg bg-lime-300 px-2.5 py-1.5 text-xs font-black text-slate-950"
                        >
                          {creator.billing_status === "active"
                            ? "وەستاندنی پارەدان"
                            : "چالاککردنی پارەدان"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.items.length ? (
              <p className="p-10 text-center text-sm text-slate-500">
                هیچ بەکارهێنەرێک نەدۆزرایەوە.
              </p>
            ) : null}
          </div>
        )}
      </DashboardSurface>
    </div>
  );
}
