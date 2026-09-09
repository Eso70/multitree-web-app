"use client";

import { Globe2, LayoutGrid, Link2, MapPin, MessageCircle } from "lucide-react";
import { ProductPreviewAction } from "./ProductPreviewBits";

export function ProductPreviewWorkspace() {
  return (
    <div
      aria-label="پێشبینینی بەرهەمەکانی Sponsor.krd"
      className="relative mx-auto flex h-[31rem] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-black/10 bg-[#f4f5f6] shadow-[0_34px_100px_-55px_rgba(15,23,42,.52)] dark:border-white/10 dark:bg-[#151719] dark:shadow-[0_38px_110px_-58px_rgba(0,0,0,.9)]"
    >
      <div
        className="flex h-14 shrink-0 border-b border-black/10 dark:border-white/10"
        role="tablist"
        aria-label="جۆری پەڕە"
      >
        <button
          type="button"
          role="tab"
          aria-selected="true"
          className="flex flex-1 items-center justify-center gap-2 border-r border-black/10 px-4 text-sm text-black/55 aria-selected:font-black aria-selected:text-black aria-selected:shadow-[inset_0_-2px_0_var(--sponsor-krd-accent)] dark:border-white/10 dark:text-white/50 dark:aria-selected:text-white sm:max-w-52"
        >
          <Link2 className="h-4 w-4" />
          Linktree
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-black/10 p-4 dark:border-white/10 sm:block">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--sponsor-krd-accent)] text-sm font-black text-[var(--sponsor-krd-accent-ink)]">
              M
            </span>
            <div>
              <p className="text-xs font-black">Sponsor.krd Demo</p>
              <p className="text-[0.65rem] text-black/40 dark:text-white/35">
                sponsor.krd/demo
              </p>
            </div>
          </div>
          <div className="mt-7 space-y-2 text-xs text-black/50 dark:text-white/45">
            <p className="rounded-xl bg-black/5 px-3 py-2.5 font-bold text-black/80 dark:bg-white/8 dark:text-white">
              پێشبینین
            </p>
            <p className="px-3 py-2.5">ناوەڕۆک</p>
            <p className="px-3 py-2.5">دیزاین</p>
            <p className="px-3 py-2.5">ئامار</p>
          </div>
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            className="mx-auto min-h-full max-w-md rounded-[1.8rem] border border-black/10 bg-white p-5 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-[#0b0d0e] dark:shadow-black/30"
            dir="rtl"
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--sponsor-krd-accent)] text-2xl font-black text-[var(--sponsor-krd-accent-ink)]">
              M
            </div>
            <h2 className="mt-4 text-center text-xl font-black">
              ستودیۆی نموونە
            </h2>
            <p className="mt-1 text-center text-sm text-black/45 dark:text-white/40">
              هەموو زانیارییە گرنگەکان لە یەک شوێن
            </p>
              <div className="mt-6 space-y-3" role="tabpanel">
                <ProductPreviewAction
                  icon={<Globe2 className="h-4 w-4" />}
                  label="ماڵپەڕی سەرەکی"
                />
                <ProductPreviewAction
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="پەیوەندی لە WhatsApp"
                />
                <ProductPreviewAction
                  icon={<LayoutGrid className="h-4 w-4" />}
                  label="بینینی کارەکانمان"
                />
                <ProductPreviewAction
                  icon={<MapPin className="h-4 w-4" />}
                  label="شوێنی ئێمە"
                />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
