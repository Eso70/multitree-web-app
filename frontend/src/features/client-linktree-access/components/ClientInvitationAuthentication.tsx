"use client";

import { type FormEvent, useState } from "react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";
import type { BusinessSubdomainTheme } from "@/lib/utils/business-error-theme";

export function ClientInvitationAuthentication({
  theme,
  unavailable,
  onUnlock,
}: {
  theme: BusinessSubdomainTheme | null;
  unavailable: boolean;
  onUnlock: (pin: string) => Promise<string | null>;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pin.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      setError(await onUnlock(pin));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthenticationShell
      brandDescription="بە شێوەیەکی پارێزراو پەڕەکەت دروست بکە و ئامارەکانی ببینە"
      brandName={theme?.name || "Business"}
      brandLogo={theme?.logo ?? BUSINESS_LOGO_PLACEHOLDER}
      accentColor={theme?.websiteColor.raw}
      previewTitle="پانێڵی کڕیار"
    >
      <AuthenticationCard
        title={
          unavailable ? "بانگهێشتنامە بەردەست نییە" : "پینی بانگهێشتنامە بنووسە"
        }
        description={
          unavailable
            ? "بەستەرەکە نادروستە یان لەلایەن بازرگانییەکەوە داخراوە."
            : "ئەو پینە ٦ ژمارەییە بنووسە کە بازرگانییەکە بە جیاوازی بۆی ناردوویت."
        }
      >
        {unavailable ? (
          <div className="flex justify-center py-4 text-red-500">
            <LockKeyhole className="h-10 w-10" />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" dir="ltr">
            <div className="mb-4 flex justify-center text-[var(--multitree-accent)]">
              <KeyRound className="h-9 w-9" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              aria-label="پینی دەستگەیشتن"
              value={pin}
              disabled={busy}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              placeholder="000000"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-lg font-black tracking-[0.45em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[var(--multitree-accent)] focus:ring-2 focus:ring-[var(--multitree-accent)]/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-600"
            />
            {error ? (
              <p
                role="alert"
                className="text-right text-xs font-medium text-red-600 dark:text-red-400"
                dir="rtl"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy || pin.length !== 6}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--multitree-accent)] px-4 text-sm font-bold text-[var(--multitree-accent-ink)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <MotionSpinner>
                    <Loader2 className="h-4 w-4" />
                  </MotionSpinner>
                  <span>پشکنین...</span>
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  <span>چوونە ناو پانێڵ</span>
                </>
              )}
            </button>
          </form>
        )}
      </AuthenticationCard>
    </AuthenticationShell>
  );
}
