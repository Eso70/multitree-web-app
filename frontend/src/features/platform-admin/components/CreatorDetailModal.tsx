"use client";

import { memo, useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import {
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  Globe2,
  LogIn,
  Mail,
  MonitorSmartphone,
  Phone,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { remoteAvatarSrc } from "@/lib/utils/remote-avatar";
import {
  CreatorMetaBadges,
  CreatorVerificationBadge,
} from "@/features/platform-admin/components/CreatorMetaBadges";
import {
  creatorPageHref,
  formatOptionalDate,
  PAGE_TYPE_LABELS,
  type Creator,
} from "@/features/platform-admin/creator-account";

interface CreatorDetailModalProps {
  creator: Creator | null;
  onClose: () => void;
}

/** One labelled fact in the modal's grids. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <div
        className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm"
        dir="ltr"
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function ModalAvatar({ creator }: { creator: Creator }) {
  // Same guard the table uses: a photo outside `next/image`'s allowlist throws
  // rather than degrading, and one such account would take the modal down.
  const avatarUrl = remoteAvatarSrc(creator.avatar_url);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm dark:border-white/10 dark:bg-white/5 sm:h-20 sm:w-20">
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={creator.display_name}
          fill
          sizes="80px"
          onError={() => setImgError(true)}
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-black text-white">
          {creator.display_name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}

/**
 * Everything worth knowing about one Creator account, laid out the way the
 * business and mini-website modals are: a portrait header, then facts in a
 * responsive grid — rather than the single stacked column a flat field list
 * produces.
 *
 * The phone number is deliberately partial: `creator_accounts` stores only an
 * HMAC and the last four digits, so the full number cannot be shown here or
 * anywhere else — what is displayed is all that exists.
 */
export const CreatorDetailModal = memo(function CreatorDetailModal({
  creator,
  onClose,
}: CreatorDetailModalProps) {
  if (!creator) return null;

  const pageHref = creatorPageHref(creator);

  return (
    <ManagementModal
      isOpen
      wide
      createBusinessStyle
      onClose={onClose}
      title={creator.display_name}
      description={creator.email}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 sm:flex-1"
        >
          داخستن
        </button>
      }
    >
      <div className="space-y-6">
        <header className="flex items-start gap-4">
          <ModalAvatar creator={creator} />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h3 className="truncate text-base font-black text-slate-800 dark:text-white sm:text-lg">
                {creator.display_name}
              </h3>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                {creator.email}
              </p>
            </div>
            <CreatorMetaBadges
              status={creator.status}
              billingStatus={creator.billing_status}
              createdAt={creator.created_at}
              riskLevel={creator.risk_level}
            />
            <CreatorVerificationBadge verified={creator.google_email_verified} />
          </div>
        </header>

        <Section title="پەیوەندی و چوونەژوورەوە">
          <Fact icon={Mail} label="ئیمەیڵ" value={creator.email} />
          <Fact
            icon={Phone}
            label="مۆبایل"
            value={
              creator.phone_last_four ? `•••• ${creator.phone_last_four}` : "—"
            }
          />
          <Fact
            icon={ShieldCheck}
            label="پشتڕاستکردنەوەی مۆبایل"
            value={formatOptionalDate(creator.phone_verified_at)}
          />
          <Fact
            icon={ShieldCheck}
            label="دوا چوونەژوورەوەی گوگڵ"
            value={formatOptionalDate(creator.google_last_authenticated_at)}
          />
          <Fact
            icon={LogIn}
            label="دوا چوونەژوورەوە"
            value={formatOptionalDate(creator.last_login_at)}
          />
          <Fact
            icon={MonitorSmartphone}
            label="دانیشتنی چالاک"
            value={String(creator.active_session_count)}
          />
        </Section>

        <Section title="بەشداری">
          <Fact
            icon={CalendarPlus}
            label="درێژی تاقیکردنەوە"
            value={`${creator.trial_days} ڕۆژ`}
          />
          <Fact
            icon={CalendarClock}
            label="کۆتایی تاقیکردنەوە"
            value={formatOptionalDate(creator.trial_ends_at)}
          />
          <Fact
            icon={CalendarClock}
            label="کۆتایی ماوەی لێبوردن"
            value={formatOptionalDate(creator.grace_ends_at)}
          />
          <Fact
            icon={Wallet}
            label="دەستپێکی پارەدان"
            value={formatOptionalDate(creator.paid_started_at)}
          />
        </Section>

        <Section title="پەڕەی گشتی">
          <Fact
            icon={Globe2}
            label="جۆری پەڕە"
            value={
              creator.page_type
                ? PAGE_TYPE_LABELS[creator.page_type]
                : "دروست نەکراوە"
            }
          />
          <Fact
            icon={ExternalLink}
            label="ناونیشان"
            value={
              pageHref ? (
                <a
                  href={pageHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sky-600 hover:underline dark:text-sky-400"
                >
                  {creator.page_slug}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "—"
              )
            }
          />
          <Fact
            icon={Sparkles}
            label="بەرواری دروستکردن"
            value={formatOptionalDate(creator.created_at)}
          />
        </Section>
      </div>
    </ManagementModal>
  );
});
