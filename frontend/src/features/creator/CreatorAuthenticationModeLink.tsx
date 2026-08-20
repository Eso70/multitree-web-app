import Link from "next/link";
import type { CreatorAuthMode } from "@/features/creator/creator-auth.types";

export function CreatorAuthenticationModeLink({ mode }: { mode: CreatorAuthMode }) {
  return (
    <p className="mt-5 text-center text-sm text-slate-500" dir="rtl">
      {mode === "signup" ? "پێشتر هەژمارت هەیە؟ " : "هێشتا هەژمارت نییە؟ "}
      <Link
        className="font-black text-slate-900 underline decoration-[var(--multitree-accent)] decoration-2 underline-offset-4 dark:text-white"
        href={mode === "signup" ? "/login" : "/signup"}
      >
        {mode === "signup" ? "بچۆ ژوورەوە" : "هەژمار دروست بکە"}
      </Link>
    </p>
  );
}
