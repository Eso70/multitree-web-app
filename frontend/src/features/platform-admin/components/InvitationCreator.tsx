"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Clipboard, Clock3, Link2, Mail } from "lucide-react";
import { toast } from "sonner";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { ModalWizardProgress } from "@/components/shared/ModalWizardProgress";
import { apiRequest } from "@/lib/api/request";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { formatDateTime } from "@/lib/utils/format-date-time";

type InvitationStep = "details" | "result";

const INVITATION_STEPS = [
  { id: "details", label: "زانیاری" },
  { id: "result", label: "بەستەر" },
];

function isValidOptionalEmail(value: string): boolean {
  const normalized = value.trim();
  return (
    normalized.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  );
}

export function InvitationCreator({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<InvitationStep>("details");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const emailValid = isValidOptionalEmail(email);

  const closeModal = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setStep("details");
    setEmail("");
    setEmailTouched(false);
    setInviteUrl("");
    setInviteExpiresAt("");
  }, [busy]);

  const copyInvitationLink = useCallback(async () => {
    const copied = await copyToClipboard(inviteUrl);
    if (copied) toast.success("کۆپی کرا");
    else toast.error("کۆپیکردن سەرکەوتوو نەبوو");
  }, [inviteUrl]);

  async function createInvite() {
    if (busy) return;
    setEmailTouched(true);
    if (!emailValid) return;

    setBusy(true);
    try {
      const result = await apiRequest<{ signupUrl: string; expiresAt: string }>(
        "/api/platform/signup/invitations",
        { method: "POST", json: email.trim() ? { email: email.trim() } : {} },
      );
      setInviteUrl(result.signupUrl);
      setInviteExpiresAt(result.expiresAt);
      setStep("result");
      toast.success("بانگهێشتنامە دروستکرا");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "بانگهێشتنامە دروست نەکرا",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Invite"
        title="بانگهێشتنامەی نوێ"
        className={`group flex h-10 items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--multitree-accent)] text-[var(--multitree-accent-ink)] shadow-sm transition-all hover:brightness-95 hover:shadow ${showLabel ? "w-10 px-0 sm:w-auto sm:px-3.5" : "w-10"}`}
      >
        <Link2 className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
        {showLabel ? (
          <span className="hidden text-xs font-bold sm:inline">
            بانگهێشتنامەی نوێ
          </span>
        ) : null}
      </button>

      <ManagementModal
        isOpen={open}
        onClose={closeModal}
        title="بانگهێشتنامەی نوێ"
        description="تۆمارکردن تەنها بە بەستەرێکی یەکجارەی ٧ ڕۆژە دەکرێت."
        busy={busy}
        createBusinessStyle
        multiTreeTheme
        flushFooter
        progress={
          <ModalWizardProgress
            steps={INVITATION_STEPS}
            currentStep={step}
            variant="multitree"
          />
        }
        footer={
          <ModalWizardActions
            variant="multitree"
            isFirstStep={step === "details"}
            isFinalStep={step === "result"}
            isSubmitting={busy}
            canContinue={step === "details" ? emailValid : Boolean(inviteUrl)}
            disableWhenInvalid={false}
            nextLabel="دروستکردنی بانگهێشتنامە"
            submitLabel="کۆپیکردنی بەستەر"
            onBack={() => setStep("details")}
            onCancel={closeModal}
            onNext={() => void createInvite()}
            onSubmit={() => void copyInvitationLink()}
          />
        }
      >
        {step === "details" ? (
          <div className="space-y-5" dir="rtl">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="sa-step-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="invitation-email"
                    className="block text-sm font-black text-slate-700 dark:text-slate-200"
                  >
                    ئیمەیڵی دیاریکراو
                    <span className="ms-1 text-xs font-medium text-slate-400">
                      (ئارەزوومەندانە)
                    </span>
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    ئەگەر ئیمەیڵێک دیاری بکەیت، تەنها هەمان ئیمەیڵ دەتوانێت
                    بەستەرەکە بەکاربهێنێت.
                  </p>
                </div>
              </div>

              <input
                id="invitation-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[var(--multitree-accent)] dark:border-white/10 dark:bg-[#161b22] dark:text-slate-200"
                placeholder="name@example.com"
                value={email}
                aria-invalid={emailTouched && !emailValid}
                aria-describedby={
                  emailTouched && !emailValid
                    ? "invitation-email-error"
                    : undefined
                }
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmailTouched(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createInvite();
                  }
                }}
              />
              {emailTouched && !emailValid ? (
                <p
                  id="invitation-email-error"
                  role="alert"
                  className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400"
                >
                  تکایە ئیمەیڵێکی دروست بنووسە.
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <Clock3 className="h-4 w-4 shrink-0" />
              <p className="text-xs font-semibold leading-5">
                بەستەرەکە یەکجار بەکاردێت و دوای ٧ ڕۆژ بەسەردەچێت.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-center" dir="rtl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-700 dark:text-slate-100">
                بانگهێشتنامەکە ئامادەیە
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                بەستەرەکە بە شێوەیەکی پارێزراو بۆ خاوەن بزنس بنێرە.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-start dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2" dir="ltr">
                <code className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                  {inviteUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyInvitationLink()}
                  aria-label="کۆپیکردنی بانگهێشتنامە"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-700 dark:border-white/10 dark:bg-[#1c222b] dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>
              {inviteExpiresAt ? (
                <p className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-amber-600 dark:border-white/10 dark:text-amber-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  بەسەردەچێت: {formatDateTime(inviteExpiresAt)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </ManagementModal>
    </div>
  );
}
