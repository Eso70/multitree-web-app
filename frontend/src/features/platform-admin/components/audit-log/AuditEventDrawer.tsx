"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AuditLogEntry } from "@linktree/types";
import {
  Check,
  Clipboard,
  Clock3,
  Code2,
  Fingerprint,
  Globe2,
  MonitorSmartphone,
  UserRound,
  X,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import {
  actorTypeLabel,
  eventLabel,
  formatAuditDate,
  outcomeClasses,
  outcomeLabel,
} from "./presentation";
import { processAppearance } from "./processAppearance";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

interface AuditEventDrawerProps {
  event: AuditLogEntry | null;
  onClose: () => void;
}

export function AuditEventDrawer({ event, onClose }: AuditEventDrawerProps) {
  useEffect(() => {
    if (!event) return;
    const handleKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [event, onClose]);

  if (!event) return null;
  const appearance = processAppearance(event);

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="وردەکاری تۆماری چاودێری">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="داخستنی وردەکاری"
      />
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-xl select-text flex-col border-l border-slate-200 bg-white text-left shadow-2xl [--business-website-color:var(--multitree-accent)] dark:border-white/10 dark:bg-[#161B22]"
        dir="ltr"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-3.5 py-3.5 dark:border-white/10 sm:px-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`rounded-xl border p-2 ${appearance.classes}`}>
              <appearance.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400">Audit event #{event.id}</p>
              <h2 className="mt-0.5 text-base font-bold text-slate-800 dark:text-white">
                {eventLabel(event.eventType)}
              </h2>
              <span className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${outcomeClasses(event.outcome)}`}>
                {outcomeLabel(event.outcome)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="داخستن"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="custom-scrollbar lime-custom-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
          <StatCardGrid columns={2}>
            <StatCard icon={UserRound} label={actorTypeLabel(event.actorType)} value={event.actorLabel} color="blue" compact />
            <StatCard icon={Clock3} label="Time" value={formatAuditDate(event.createdAt)} color="purple" compact />
            <div className="relative h-[76px] min-w-0">
              <StatCard
                icon={Fingerprint}
                label={event.resourceType || "Resource"}
                value={event.resourceLabel || event.resourceId || "—"}
                color="slate"
                compact
                action={event.resourceId ? <CopyButton value={event.resourceId} /> : undefined}
              />
            </div>
            <div className="relative h-[76px] min-w-0">
              <StatCard
                icon={Globe2}
                label="IP Address"
                value={event.ipAddress || "—"}
                color="green"
                compact
                action={event.ipAddress ? <CopyButton value={event.ipAddress} /> : undefined}
              />
            </div>
          </StatCardGrid>

          {event.kind === "request" && (
            <InfoSection title="HTTP request" icon={Globe2}>
              <InfoRow label="Source" value={event.source || "—"} />
              <InfoRow label="Method" value={event.httpMethod || "—"} />
              <InfoRow label="Path" value={event.requestPath || "—"} copy={!!event.requestPath} />
              <InfoRow label="Status" value={event.statusCode?.toString() || "Pending"} />
              <InfoRow label="Duration" value={event.durationMs === null ? "—" : `${event.durationMs} ms`} />
            </InfoSection>
          )}

          <InfoSection title="ناسنامە و شوێنکەوتن" icon={Fingerprint}>
            <InfoRow label="Event type" value={event.eventType} copy />
            <InfoRow label="Request ID" value={event.requestId || "—"} copy={!!event.requestId} />
            <InfoRow label="Actor ID" value={event.actorId || "—"} copy={!!event.actorId} />
            <InfoRow label="Business" value={event.businessLabel || "—"} />
            <InfoRow label="Business ID" value={event.businessId || "—"} copy={!!event.businessId} />
            <InfoRow label="Public linktree" value={event.linktreeLabel || "—"} />
            <InfoRow label="Linktree ID" value={event.linktreeId || "—"} copy={!!event.linktreeId} />
          </InfoSection>

          <InfoSection title="زانیاری ئامێر" icon={MonitorSmartphone}>
            <p className="break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-left font-mono text-xs leading-6 text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300" dir="ltr">
              {event.userAgent || "No user-agent recorded"}
            </p>
          </InfoSection>

          <InfoSection title="Metadata" icon={Code2}>
            <pre className="custom-scrollbar lime-custom-scrollbar max-h-56 overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-slate-950 p-2.5 text-left text-[10px] leading-5 text-emerald-300 shadow-inner" dir="ltr">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </InfoSection>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function InfoSection({ title, icon: Icon, children }: { title: string; icon: typeof Fingerprint; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
        <Icon className="h-4 w-4 text-slate-400" />
        {title}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
        {children}
      </div>
    </section>
  );
}

function InfoRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-0 dark:border-white/5">
      <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex min-w-0 items-center gap-2" dir="ltr">
        <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-300" title={value}>{value}</span>
        {copy && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
      aria-label="کۆپیکردن"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}
    </button>
  );
}
