"use client";

import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/request";

type EmailChallenge = {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

type EmailVerification = {
  authenticated: boolean;
  redirectUrl: string;
};

interface EmailCodeAuthenticationFormProps {
  requestEndpoint: string;
  verifyEndpoint: string;
  rememberDevice?: boolean;
  emailPlaceholder?: string;
  actionLabel?: string;
  codeTitle?: string;
  verifyActionLabel?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The request could not be completed. Try again.";
}

export function EmailCodeAuthenticationForm({
  requestEndpoint,
  verifyEndpoint,
  rememberDevice = false,
  emailPlaceholder = "Enter your email",
  actionLabel = "Continue with email",
  codeTitle = "Enter your login code",
  verifyActionLabel = "Sign in",
}: EmailCodeAuthenticationFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<EmailChallenge | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(
      () => setResendIn((current) => Math.max(0, current - 1)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<EmailChallenge>(requestEndpoint, {
        method: "POST",
        json: { email },
      });
      setChallenge(result);
      setCode("");
      setResendIn(result.resendAfterSeconds);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<EmailVerification>(verifyEndpoint, {
        method: "POST",
        json: { challengeId: challenge.challengeId, code, rememberDevice },
      });
      window.location.assign(result.redirectUrl);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (challenge) {
    return (
      <form onSubmit={verifyCode} className="space-y-3" dir="ltr">
        <button
          type="button"
          onClick={() => {
            setChallenge(null);
            setCode("");
            setError("");
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change email
        </button>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {codeTitle}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            We sent a 6-digit code to {email}. It expires in 10 minutes.
          </p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          aria-label="Login code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-lg font-black tracking-[0.45em] text-slate-900 outline-none transition focus:border-[var(--multitree-accent)] focus:ring-2 focus:ring-[var(--multitree-accent)]/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
        />
        {error ? (
          <p
            role="alert"
            className="text-xs font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--multitree-accent)] px-4 text-sm font-bold text-[var(--multitree-accent-ink)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            verifyActionLabel
          )}
        </button>
        <button
          type="button"
          disabled={busy || resendIn > 0}
          onClick={() => void requestCode()}
          className="w-full text-center text-xs font-semibold text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:text-white"
        >
          {resendIn > 0 ? `Send again in ${resendIn}s` : "Send code again"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-3" dir="ltr">
      <div className="relative">
        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          suppressHydrationWarning
          aria-label="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={emailPlaceholder}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--multitree-accent)] focus:ring-2 focus:ring-[var(--multitree-accent)]/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="text-xs font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--multitree-accent)] px-4 text-sm font-bold text-[var(--multitree-accent-ink)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : actionLabel}
      </button>
    </form>
  );
}
