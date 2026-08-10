"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { AuthenticationMethods } from "@/components/shared/AuthenticationMethods";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { ErrorPagePanel } from "@/components/error-pages/ErrorPage";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import { MULTITREE_ERROR_THEME } from "@/components/error-pages/error-theme";

export function InvitationEntryPage() {
  const search = useSearchParams();
  const [token] = useState(() => search.get("token") || "");
  const [state, setState] = useState<
    "loading" | "valid" | "invalid" | "expired"
  >(token ? "loading" : "invalid");

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/signup/invitation?token=${encodeURIComponent(token)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        if (response.ok) {
          setState("valid");
          window.history.replaceState({}, "", "/join");
          return;
        }
        setState(
          response.status === 410 && payload?.message === "Invitation expired"
            ? "expired"
            : "invalid",
        );
      })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "expired") {
    return (
      <AuthenticationShell brandDescription="هەژماری بزنسەکەت دروست بکە">
        <ErrorPagePanel
          {...ERROR_PAGE_COPY.invitationExpired}
          theme={MULTITREE_ERROR_THEME}
          homeHref="/"
        />
      </AuthenticationShell>
    );
  }

  return (
    <AuthenticationShell brandDescription="هەژماری بزنسەکەت دروست بکە">
      <AuthenticationCard
        title="دروستکردنی هەژماری بزنس"
        description="بانگێشت نامەکەت پشتڕاست بکەوە بە گوگڵ یاخود ئیمەیڵ"
      >
        {state === "loading" ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <MotionSpinner>
              <Loader2 className="h-6 w-6" />
            </MotionSpinner>
            بانگهێشتنامەکە پشتڕاست دەکرێتەوە...
          </div>
        ) : state === "invalid" ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-left dark:border-red-900 dark:bg-red-950/30"
          >
            <ShieldCheck className="h-9 w-9 text-red-500" />
            <h3 className="mt-4 font-bold text-red-700 dark:text-red-300">
              بانگهێشتنامە دروست نییە
            </h3>
            <p className="mt-2 text-sm leading-6 text-red-600/80 dark:text-red-300/80">
              بەستەرەکە بەسەرچووە، بەکارهاتووە یان هەڵوەشێنراوەتەوە.
              بانگهێشتنامەی نوێ لە بەڕێوەبەر داوا بکە.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <AuthenticationMethods
              googleHref={`/api/signup/google/start?invite=${encodeURIComponent(token)}`}
              requestEndpoint={`/api/signup/email/request?invite=${encodeURIComponent(token)}`}
              verifyEndpoint="/api/signup/email/verify"
              emailPlaceholder="Enter your invited email"
              emailActionLabel="Continue signup with email"
              emailCodeTitle="Enter your verification code"
              emailVerifyActionLabel="Continue signup"
            />
            <p
              className="text-center text-xs leading-5 text-slate-400"
              dir="rtl"
            >
              بە بەردەوامبوون، ڕەزامەندی لەسەر{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                className="underline hover:text-slate-600"
              >
                مەرجەکان
              </Link>{" "}
              و{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="underline hover:text-slate-600"
              >
                سیاسەتی تایبەتمەندی
              </Link>{" "}
              دەدەیت.
            </p>
          </div>
        )}
      </AuthenticationCard>
    </AuthenticationShell>
  );
}
