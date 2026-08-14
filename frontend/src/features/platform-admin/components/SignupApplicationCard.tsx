"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Globe2, Mail, Phone, UserRound, X } from "lucide-react";
import { AccentActionButton } from "@/components/shared/AccentActionButton";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

export type SignupApplication = {
  id: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  phone: string;
  requestedSubdomain: string;
  logo?: string | null;
  favicon?: string | null;
  defaultAvatar?: string | null;
};

export type SignupPlan = {
  id: string;
  name: string;
  status: string;
  isDefault: boolean;
};

interface SignupApplicationCardProps {
  item: SignupApplication;
  index: number;
  total: number;
  plans: SignupPlan[];
  selectedPlanId: string;
  busy: boolean;
  onPlanChange: (planId: string) => void;
  onReview: (action: "reject" | "approve", reason?: string) => Promise<boolean>;
}

function ApplicantFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-650 dark:text-slate-300">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export function SignupApplicationCard({
  item,
  index,
  total,
  plans,
  selectedPlanId,
  busy,
  onPlanChange,
  onReview,
}: SignupApplicationCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const avatar = item.logo || item.defaultAvatar;
  const reasonValid = reason.trim().length > 0;
  const ownerDiffers =
    item.ownerName.trim() &&
    item.ownerName.trim().toLocaleLowerCase() !==
      item.businessName.trim().toLocaleLowerCase();
  const borderClasses = [
    index !== total - 1 ? "border-b border-slate-100 dark:border-white/5" : "",
    index % 2 === 0 ? "sm:border-r sm:border-b-0" : "sm:border-r-0",
    index < total - (total % 2 === 0 ? 2 : 1) ? "sm:border-b" : "sm:border-b-0",
  ].join(" ");

  function closeReviewModal() {
    if (busy) return;
    setRejectOpen(false);
    setReason("");
    setReasonTouched(false);
  }

  async function submitReview() {
    setReasonTouched(true);
    if (!reasonValid) return;
    const reviewed = await onReview("reject", reason.trim());
    if (reviewed) closeReviewModal();
  }

  return (
    <article
      className={`group bg-transparent p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.03] sm:p-5 ${borderClasses}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm dark:border-white/10 dark:bg-white/5">
          {avatar && !imageFailed ? (
            <Image
              src={avatar}
              alt=""
              fill
              sizes="48px"
              unoptimized
              onError={() => setImageFailed(true)}
              className="object-cover"
            />
          ) : (
            <span className="sa-gradient sa-ink flex h-full w-full items-center justify-center text-sm font-black">
              {(item.businessName || item.ownerName || "B")
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-slate-800 dark:text-white sm:text-base">
            {item.businessName || item.ownerName}
          </h3>
          {ownerDiffers ? (
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              {item.ownerName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.025] sm:grid-cols-3">
        <ApplicantFact icon={Mail} label="ئیمەیڵ" value={item.ownerEmail} />
        <ApplicantFact icon={Phone} label="مۆبایل" value={item.phone} />
        <ApplicantFact
          icon={Globe2}
          label="ساب‌دۆمەین"
          value={item.requestedSubdomain}
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm">
          پلانی بەشداربوون
        </label>
        <CustomSelect
          label="پلانی بەشداربوون"
          value={selectedPlanId}
          options={
            plans.length
              ? plans.map((plan) => ({
                  value: plan.id,
                  label: plan.name,
                }))
              : [{ value: "", label: "هیچ پلانێکی چالاک نییە" }]
          }
          onChange={onPlanChange}
          disabled={busy || !plans.length}
          hideLabel
          accent={MULTITREE_ACCENT_COLOR}
          triggerClassName="h-auto rounded-lg sm:rounded-xl border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:bg-[#161B22] dark:text-gray-100 dark:border-white/10 dark:hover:border-white/20"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
        <button
          type="button"
          disabled={busy}
          onClick={() => setRejectOpen(true)}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-300/80 bg-rose-50/70 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
        >
          <X className="h-4 w-4" />
          ڕەتکردنەوە
        </button>
        <AccentActionButton
          busy={busy}
          disabled={!selectedPlanId}
          onClick={() => void onReview("approve")}
          className="flex-1 justify-center"
        >
          <Check className="h-4 w-4" />
          پەسەندکردن
        </AccentActionButton>
      </div>

      <ManagementModal
        isOpen={rejectOpen}
        onClose={closeReviewModal}
        title="ڕەتکردنەوەی داواکاری"
        description={item.businessName || item.ownerName}
        busy={busy}
        createBusinessStyle
        multiTreeTheme
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={closeReviewModal}
              className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              هەڵوەشاندنەوە
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitReview()}
              className="h-10 rounded-xl bg-rose-600 px-4 text-xs font-black text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              ڕەتکردنەوە
            </button>
          </>
        }
      >
        <div dir="rtl">
          <label
            htmlFor={`application-review-reason-${item.id}`}
            className="text-xs font-black text-slate-700 dark:text-slate-200"
          >
            هۆکار
          </label>
          <textarea
            id={`application-review-reason-${item.id}`}
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setReasonTouched(true)}
            aria-invalid={reasonTouched && !reasonValid}
            aria-describedby={
              reasonTouched && !reasonValid
                ? `application-review-reason-error-${item.id}`
                : undefined
            }
            placeholder="هۆکاری بڕیارەکە بە ڕوونی بنووسە..."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition focus:border-[var(--multitree-accent)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
          {reasonTouched && !reasonValid ? (
            <p
              id={`application-review-reason-error-${item.id}`}
              role="alert"
              className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400"
            >
              هۆکار پێویستە.
            </p>
          ) : null}
        </div>
      </ManagementModal>
    </article>
  );
}
