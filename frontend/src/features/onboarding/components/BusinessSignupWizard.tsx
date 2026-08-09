"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/api/request";
import { getSubdomainLoginUrl } from "@/lib/utils/app-url";
import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { AuthenticationRefreshButton } from "@/components/shared/AuthenticationRefreshButton";
import { EditorField } from "@/components/shared/EditorField";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { toast } from "sonner";
import {
  buildSignupApplicationPayload,
  validateSignupApplication,
  type SignupFieldErrors,
} from "@/features/onboarding/signup-application";

type Application = {
  status: string;
  ownerEmail: string;
  businessName: string | null;
  phone: string | null;
  requestedSubdomain: string | null;
  reviewReason?: string | null;
};

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function BusinessSignupWizard() {
  const [application, setApplication] = useState<Application | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    phone: "",
    requestedSubdomain: "",
  });
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<SignupFieldErrors>({});

  useEffect(() => {
    void apiRequest<Application>("/api/signup/application")
      .then((data) => {
        setApplication(data);
        setForm({
          businessName: data.businessName || "",
          phone: data.phone || "",
          requestedSubdomain: data.requestedSubdomain || "",
        });
      })
      .catch(() =>
        setError("Signup session expired. Request a new invitation."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function refreshStatus() {
    setRefreshing(true);
    setError("");
    try {
      const latest = await apiRequest<Application>("/api/signup/application");
      setApplication(latest);
      if (latest.status === "pending") {
        toast.info("Your application is still pending review.");
      } else {
        toast.success("Application status updated.");
      }
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Application status could not be refreshed.";
      setError(message);
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!form.requestedSubdomain) return;
    const timer = window.setTimeout(() => {
      void apiRequest<{ available: boolean }>(
        `/api/signup/subdomain-availability?value=${encodeURIComponent(form.requestedSubdomain)}`,
      )
        .then((result) => setAvailable(result.available))
        .catch(() => setAvailable(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.requestedSubdomain]);

  async function submit() {
    const nextErrors = validateSignupApplication(form, available);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/signup/application", {
        method: "PATCH",
        json: buildSignupApplicationPayload(form),
      });
      setApplication(
        await apiRequest<Application>("/api/signup/application/submit", {
          method: "POST",
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Application could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !application) {
    return (
      <AuthenticationShell brandDescription="هەژماری بزنسەکەت بە پاراستن تەواو بکە">
        <AuthenticationCard
          title={loading ? "ئامادەکردنی داواکاری" : "داواکاری بەردەست نییە"}
          description={loading ? "زانیارییەکانت بار دەکرێن" : error}
        >
          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500">
              <MotionSpinner>
                <Loader2 className="h-6 w-6" />
              </MotionSpinner>
              Loading...
            </div>
          ) : null}
        </AuthenticationCard>
      </AuthenticationShell>
    );
  }

  if (["pending", "approved", "rejected"].includes(application.status)) {
    const approved = application.status === "approved";
    const pending = application.status === "pending";
    return (
      <AuthenticationShell
        brandDescription="داواکارییەکەت لەلایەن بەڕێوەبەری MultiTree پشکنین دەکرێت"
        headerAction={
          pending ? (
            <AuthenticationRefreshButton
              refreshing={refreshing}
              onRefresh={() => void refreshStatus()}
            />
          ) : undefined
        }
      >
        <AuthenticationCard
          title={
            pending
              ? "داواکارییەکەت نێردرا"
              : approved
                ? "داواکارییەکەت پەسەندکرا"
                : "داواکارییەکەت ڕەتکرایەوە"
          }
          description={
            application.reviewReason ||
            (pending
              ? "بەڕێوەبەر زانیارییەکانت پشکنین دەکات."
              : approved
                ? "ئێستا دەتوانیت بچیتە ژوورەوە و ڕێکخستنی سەرەتایی تەواو بکەیت."
                : "بۆ زانیاری زیاتر پەیوەندی بە بەڕێوەبەرەوە بکە.")
          }
        >
          <div className="flex justify-center py-3">
            {pending ? (
              <Clock3 className="h-12 w-12 text-amber-500" />
            ) : approved ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            ) : (
              <ShieldCheck className="h-12 w-12 text-red-500" />
            )}
          </div>
          {approved && application.requestedSubdomain ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = getSubdomainLoginUrl(
                  application.requestedSubdomain || undefined,
                );
              }}
              className="mt-4 h-12 w-full rounded-xl bg-[var(--multitree-accent)] text-sm font-bold text-[var(--multitree-accent-ink)]"
            >
              چوونەژوورەوەی بزنس
            </button>
          ) : null}
        </AuthenticationCard>
      </AuthenticationShell>
    );
  }

  return (
    <AuthenticationShell brandDescription="بزنسەکەت بە سێ زانیاریی سەرەکی تۆمار بکە">
      <AuthenticationCard
        title="دروستکردنی هەژماری بزنس"
        description="ناوی بزنس، ژمارەی مۆبایل و ساب‌دۆمەین دیاری بکە"
      >
        <div className="space-y-4" dir="ltr">
          {error ? (
            <InlineRequestError
              error={{
                code: "SIGNUP_ERROR",
                status: null,
                title: "Application could not be submitted",
                message: error,
              }}
            />
          ) : null}
          {application.reviewReason ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              {application.reviewReason}
            </div>
          ) : null}
          <EditorField label="ناوی بزنس" required error={errors.businessName}>
            <input
              autoFocus
              className={modalInputClass(Boolean(errors.businessName))}
              aria-invalid={Boolean(errors.businessName)}
              value={form.businessName}
              placeholder="Store Name"
              onChange={(event) => {
                const businessName = event.target.value;
                setAvailable(null);
                setForm((current) => ({
                  ...current,
                  businessName,
                  requestedSubdomain: subdomainTouched
                    ? current.requestedSubdomain
                    : slug(businessName),
                }));
              }}
            />
          </EditorField>
          <EditorField label="ژمارەی مۆبایل" required error={errors.phone}>
            <input
              type="tel"
              autoComplete="tel"
              className={modalInputClass(Boolean(errors.phone))}
              aria-invalid={Boolean(errors.phone)}
              value={form.phone}
              placeholder="750 000 0000"
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </EditorField>
          <EditorField
            label="ساب‌دۆمەین"
            required
            hint={
              available === null ? "" : available ? "بەردەستە" : "بەردەست نییە"
            }
            error={errors.requestedSubdomain || errors.subdomainAvailability}
          >
            <div className="flex items-center gap-2">
              <input
                className={modalInputClass(
                  available === false ||
                    Boolean(
                      errors.requestedSubdomain || errors.subdomainAvailability,
                    ),
                )}
                aria-invalid={Boolean(
                  errors.requestedSubdomain || errors.subdomainAvailability,
                )}
                value={form.requestedSubdomain}
                placeholder="electronics-shop"
                onChange={(event) => {
                  setSubdomainTouched(true);
                  setAvailable(null);
                  setForm({
                    ...form,
                    requestedSubdomain: slug(event.target.value),
                  });
                }}
              />
              <span className="shrink-0 text-xs text-slate-400">.lvh.me</span>
            </div>
          </EditorField>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--multitree-accent)] px-5 text-sm font-bold text-[var(--multitree-accent-ink)] transition hover:brightness-95 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "ناردنی داواکاری"
            )}
          </button>
          <p
            className="text-center text-[11px] leading-5 text-slate-400"
            dir="rtl"
          >
            بە ناردنی داواکاری، ڕەزامەندی لەسەر{" "}
            <Link href="/legal/terms" target="_blank" className="underline">
              مەرجەکان
            </Link>{" "}
            و{" "}
            <Link href="/legal/privacy" target="_blank" className="underline">
              سیاسەتی تایبەتمەندی
            </Link>{" "}
            دەدەیت.
          </p>
        </div>
      </AuthenticationCard>
    </AuthenticationShell>
  );
}
