"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import Image from "next/image";
import { Check, Clock3, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type RequestItem = { business_id: string; current_name: string; username: string; requested_at: string; changes: { name?: string; phone?: string; logo?: string; favicon?: string; default_avatar?: string; website_color?: string } };

export function ProfileChangeRequests() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/platform/businesses/profile-change-requests/pending", { credentials: "include", cache: "no-store" }).then(r => r.json()).then(r => setItems(r.data || [])).catch(() => undefined), []);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, action: "approve" | "reject") => {
    setReviewing(id + action);
    try {
      const response = await fetch(`/api/platform/businesses/profile-change-requests/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error();
      setItems(current => current.filter(item => item.business_id !== id));
      toast[action === "approve" ? "success" : "info"](action === "approve" ? "داواکارییەکە پەسەندکرا" : "داواکارییەکە ڕەتکرایەوە");
    } catch { toast.error("پێداچوونەوەی داواکاری سەرکەوتوو نەبوو"); }
    finally { setReviewing(null); }
  };
  if (!items.length) return null;
  return <section className="mb-6 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5 sm:p-5">
    <div className="mb-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">داواکارییەکانی گۆڕینی پڕۆفایل</h2><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{items.length}</span></div>
    <div className="grid gap-3 lg:grid-cols-2">{items.map(item => <article key={item.business_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1c222b]">
      <div className="flex items-center gap-3"><div className="flex -space-x-3">{[item.changes.default_avatar, item.changes.logo, item.changes.favicon].map((src, i) => <div key={i} className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-white bg-slate-100 dark:border-[#1c222b]"><Image src={src || "/images/Logo.jpg"} alt="" fill className="object-cover" /></div>)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{item.changes.name || item.current_name}</p><p className="text-xs text-slate-400">@{item.username}</p></div><span className="h-7 w-7 rounded-full border border-slate-200" style={{ background: item.changes.website_color || "var(--multitree-accent)" }} /></div>
      <div className="mt-4 flex justify-end gap-2"><button onClick={() => review(item.business_id, "reject")} disabled={!!reviewing} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><X className="h-3.5 w-3.5" />ڕەتکردنەوە</button><button onClick={() => review(item.business_id, "approve")} disabled={!!reviewing} className="sa-gradient sa-gradient-hover sa-ink flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold">{reviewing === item.business_id + "approve" ? <MotionSpinner><Loader2 className="h-3.5 w-3.5 "  /></MotionSpinner> : <Check className="h-3.5 w-3.5" />}پەسەندکردن</button></div>
    </article>)}</div>
  </section>;
}
