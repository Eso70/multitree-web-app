"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Megaphone, ShieldAlert, X } from "lucide-react";
import { communicationRequest } from "./api";
import type { Announcement } from "./types";

type Banner = Pick<Announcement, "id" | "title" | "message" | "announcementType" | "priority" | "ctaLabel" | "ctaUrl" | "publishedAt" | "expiresAt">;

export function BusinessAnnouncementBanners() {
  const [items, setItems] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void communicationRequest<Banner[]>("/api/auth/communications/banners")
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const visible = items.filter((item) => !dismissed.includes(item.id));
  if (!visible.length) return null;
  return <div className="mb-5 space-y-3">{visible.map((item) => {
    const Icon = item.priority === "critical" ? ShieldAlert : item.priority === "important" ? AlertTriangle : Megaphone;
    return <article key={item.id} className={`relative overflow-hidden rounded-2xl border p-4 pr-12 ${item.priority === "critical" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200" : item.priority === "important" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200" : "border-[color-mix(in_srgb,var(--theme-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--theme-primary)_7%,transparent)] text-slate-700 dark:text-slate-200"}`}><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="text-sm font-black">{item.title}</h3><p className="mt-1 text-xs leading-5 opacity-80">{item.message}</p>{item.ctaLabel && item.ctaUrl && <a href={item.ctaUrl} className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-black text-white dark:bg-white dark:text-slate-900">{item.ctaLabel}</a>}</div></div><button onClick={() => setDismissed((current) => [...current, item.id])} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5" aria-label="داخستن"><X className="h-4 w-4" /></button></article>;
  })}</div>;
}
