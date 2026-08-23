"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  MousePointerClick,
  ShieldCheck,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import {
  findClientAccessDemoInvitation,
  type ClientAccessDemoInvitation,
} from "../mock-store";
import { ClientAccessDemoPreview } from "./ClientAccessDemoPreview";

export default function ClientResultsDemoPage({ token }: { token: string }) {
  const [invitation, setInvitation] =
    useState<ClientAccessDemoInvitation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setInvitation(findClientAccessDemoInvitation(token));
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [token]);

  const resultsExpiry = useMemo(() => {
    if (!invitation?.publishedAt) return null;
    return new Date(
      new Date(invitation.publishedAt).getTime() +
        invitation.resultAccessDays * 86_400_000,
    );
  }, [invitation]);

  const expired = resultsExpiry ? resultsExpiry <= new Date() : false;

  return (
    <main
      dir="ltr"
      className="min-h-screen bg-slate-50 px-4 py-6 text-left text-slate-900 dark:bg-[#0d1117] dark:text-slate-100 sm:px-6 sm:py-10"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--multitree-accent)] font-black text-[var(--multitree-accent-ink)]">
              M
            </div>
            <div>
              <p className="text-sm font-black">MultiTree</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ئەنجامەکانی کەمپین بە بینینی تەنها
              </p>
            </div>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            داتای نموونەیی
          </span>
        </header>

        {!loaded ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#161b22]">
            ئەنجامەکانی ناو وێبگەڕ بار دەکرێن…
          </div>
        ) : !invitation || invitation.resultsToken !== token ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-500/20 dark:bg-[#161b22]">
            <ShieldCheck className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-4 text-xl font-black">
              بەستەری ئەنجامەکان نەدۆزرایەوە
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              بەستەری ئەنجامەکان لەو وێبگەڕە بکەرەوە کە بانگهێشتنامەی
              تاقیکردنەوەی تێدا دروست کراوە.
            </p>
          </div>
        ) : invitation.status !== "published" || !invitation.publishedAt ? (
          <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center dark:border-amber-500/20 dark:bg-[#161b22]">
            <Clock3 className="mx-auto h-10 w-10 text-amber-500" />
            <h1 className="mt-4 text-xl font-black">
              ئەنجامەکان هێشتا بەردەست نین
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              بازرگانی دەبێت سەرەتا پەڕەی تاقیکردنەوە بڵاوبکاتەوە.
            </p>
          </div>
        ) : expired ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-500/20 dark:bg-[#161b22]">
            <Clock3 className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-4 text-xl font-black">
              دەستگەیشتن بە ئەنجامەکان بەسەرچووە
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              لە جێبەجێکردنی داهاتووی بەکێنددا، بازرگانی دەتوانێت دەستگەیشتنێکی
              نوێی ئەنجامەکان دروست بکات.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#161b22] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black">
                    {invitation.draft.pageName}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> بڵاوکراوە
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  دەستگەیشتن بە ئەنجامەکان لە{" "}
                  {resultsExpiry?.toLocaleString("ckb-IQ")} بەسەردەچێت
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                تەنها ئەنجامە کۆکراوەکانی ئەم پەڕەیە
              </div>
            </div>

            <StatCardGrid columns={4} className="mb-6">
              <StatCard
                icon={Eye}
                label="بینینەکان"
                value="4,820"
                color="purple"
              />
              <StatCard
                icon={Users}
                label="سەردانکەری تاک"
                value="3,910"
                color="slate"
              />
              <StatCard
                icon={MousePointerClick}
                label="کارلێکەکان"
                value="1,104"
                color="green"
              />
              <StatCard
                icon={BarChart3}
                label="ڕێژەی کارلێک"
                value="22.9%"
                color="orange"
              />
            </StatCardGrid>

            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <ClientAccessDemoPreview invitation={invitation} interactive />
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#161b22] sm:p-6">
                <h2 className="text-base font-black">کلیک بە پێی لینک</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  بەهای نموونەیی تەنها بۆ هەڵسەنگاندنی ڕووکار.
                </p>
                <div className="mt-5 divide-y divide-slate-100 dark:divide-white/5">
                  {invitation.draft.links.map((link, index) => {
                    const clicks = Math.max(38, 824 - index * 271);
                    return (
                      <div
                        key={link.id}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {link.label}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {link.url}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-black">
                          {clicks} کلیک
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  ناسنامەی سەردانکەر، ناونیشانی IP، تۆمارەکانی CRM، ڕووداوە
                  خاوەکان، ڕێکخستنەکانی بازرگانی و پەڕەکانی تر بە مەبەست پیشان
                  نادرێن.
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
