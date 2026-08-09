"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Megaphone, Sparkles, X } from "lucide-react";
import { communicationRequest } from "./api";
import type { HomepageCommunication } from "./types";

const STORAGE_KEY = "multitree:dismissed-homepage-communications";

export function HomepageCommunications() {
  const [items, setItems] = useState<HomepageCommunication[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    void communicationRequest<HomepageCommunication[]>("/api/public/communications/homepage")
      .then((data) => {
        if (cancelled) return;
        setItems(
          Array.isArray(data)
            ? data.filter(
                (item): item is HomepageCommunication =>
                  Boolean(item) &&
                  typeof item === "object" &&
                  typeof item.id === "string",
              )
            : [],
        );
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const dismiss = (id: string) => {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-100)));
    } catch {
      // Dismissal still works for this session when storage is unavailable.
    }
  };
  const visible = items.filter((item) => !dismissed.includes(item.id));
  const banners = visible.filter((item) => item.placement === "top_banner");
  const features = visible.filter((item) => item.placement === "feature_card");
  if (!visible.length) return null;

  return <div className="relative z-20 pt-20">
    {banners.length > 0 && <div className="mx-auto max-w-7xl space-y-2 px-4 sm:px-6">{banners.map((item) => <article key={item.id} className={`relative overflow-hidden rounded-2xl border px-5 py-4 shadow-sm ${item.priority === "critical" ? "border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100" : item.priority === "important" ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100" : "border-[color-mix(in_srgb,var(--multitree-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--multitree-accent)_8%,white)] text-gray-800 dark:bg-[color-mix(in_srgb,var(--multitree-accent)_8%,#0f172a)] dark:text-white"}`}><div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Megaphone className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="text-sm font-black">{item.title}</h2><p className="mt-1 text-xs leading-5 opacity-80">{item.message}</p></div></div>{item.ctaLabel && item.ctaUrl && <a href={item.ctaUrl} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-black text-white dark:bg-white dark:text-gray-950">{item.ctaLabel}<ArrowRight className="h-3.5 w-3.5" /></a>}</div>{item.isDismissible && <button onClick={() => dismiss(item.id)} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg opacity-50 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss announcement"><X className="h-4 w-4" /></button>}</article>)}</div>}
    {features.length > 0 && <section className="mx-auto mt-6 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">{features.map((item) => <article key={item.id} className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1e293b]"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--multitree-accent)_14%,transparent)] text-[var(--multitree-accent)]"><Sparkles className="h-5 w-5" /></div><h2 className="mt-4 text-base font-black text-gray-900 dark:text-white">{item.title}</h2><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-400">{item.message}</p>{item.ctaLabel && item.ctaUrl && <a href={item.ctaUrl} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-brand-700 dark:text-brand-300">{item.ctaLabel}<ArrowRight className="h-3.5 w-3.5" /></a>}{item.isDismissible && <button onClick={() => dismiss(item.id)} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Dismiss feature"><X className="h-4 w-4" /></button>}</article>)}</section>}
  </div>;
}
