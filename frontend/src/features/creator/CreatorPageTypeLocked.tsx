import { LockKeyhole } from "lucide-react";
import { DashboardSurface } from "@/components/shared/DashboardSurface";

export function CreatorPageTypeLocked({
  ownedPageType,
}: {
  ownedPageType: "linktree" | "mini_website";
}) {
  return (
    <DashboardSurface
      className="flex min-h-[55vh] flex-col items-center justify-center text-center"
      dir="rtl"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <LockKeyhole className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-xl font-black text-slate-800 dark:text-white">
        ئەم جۆرە پەڕەیە قوفڵە
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
        هەژمارەکەت پێشتر یەک
        {ownedPageType === "linktree" ? " لینکتری" : " مینی وێبسایت"}ی هەیە و
        ناتوانێت جۆرێکی دیکە دروست بکات
      </p>
      <p className="mt-2 max-w-lg text-xs leading-5 text-slate-400">
        سڕینەوە یان گۆڕینی جۆری پەڕە تەنها لەلایەن بەڕێوەبەری پلاتفۆرمەوە ئەنجام
        دەدرێت
      </p>
    </DashboardSurface>
  );
}
