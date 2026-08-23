"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, Link2, LockKeyhole, ShieldAlert } from "lucide-react";
import { EditorField } from "@/components/shared/EditorField";
import { ReusableLinktreeEditorModal } from "@/features/link-editor/components/ReusableLinktreeEditorModal";
import type { LinktreeEditorSubmitData } from "@/features/link-editor/editor-types";
import { getPlatformNameKurdish } from "@/features/link-editor/modal-constants";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { getTemplateName } from "@/lib/templates/config";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import {
  findClientAccessDemoInvitation,
  isClientAccessDemoExpired,
  submitClientAccessDemoInvitation,
  updateClientAccessDemoInvitation,
  type ClientAccessDemoDraft,
  type ClientAccessDemoInvitation,
} from "../mock-store";

const MAX_PIN_ATTEMPTS = 5;
const pinAttemptKey = (token: string) => `multitree:client-demo:pin-attempts:${token}`;

function editorDataToDraft(data: LinktreeEditorSubmitData): ClientAccessDemoDraft {
  return {
    pageName: data.name,
    description: data.description ?? "",
    backgroundColor: data.background_color,
    profileImageDataUrl: data.image,
    links: Object.entries(data.links).flatMap(([platform, urls]) =>
      urls.map((url, index) => ({
        id: `${platform}-${index}`,
        label: data.linkMetadata?.[platform]?.[index]?.display_name?.trim() || getPlatformNameKurdish(platform),
        url,
      })),
    ),
  };
}

function DemoPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main dir="ltr" className="min-h-screen bg-slate-50 px-4 py-6 text-left text-slate-900 dark:bg-[#0d1117] dark:text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--multitree-accent)] font-black text-[var(--multitree-accent-ink)]">M</div>
            <div>
              <p className="text-sm font-black">MultiTree</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">تاقیکردنەوەی دەستگەیشتنی کاتی کڕیار</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">نموونەی ڕووکار</span>
        </header>
        {children}
      </div>
    </main>
  );
}

function StateCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#161b22]">
      <div className="mb-4 text-[var(--multitree-accent)]">{icon}</div>
      <h1 className="text-2xl font-black">{title}</h1>
      <div className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{children}</div>
    </div>
  );
}

function ClientInvitationEditorDemoContent({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<ClientAccessDemoInvitation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [openedAt] = useState(() => new Date());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setInvitation(findClientAccessDemoInvitation(token));
      const attempts = Number(window.sessionStorage.getItem(pinAttemptKey(token))) || 0;
      setPinAttempts(Math.min(MAX_PIN_ATTEMPTS, Math.max(0, attempts)));
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [token]);

  const accessExpired = invitation ? isClientAccessDemoExpired(invitation, openedAt) : false;
  const remainingHours = useMemo(() => {
    if (!invitation) return 0;
    return Math.max(0, Math.ceil((new Date(invitation.expiresAt).getTime() - openedAt.getTime()) / 3_600_000));
  }, [invitation, openedAt]);

  if (!loaded) return <DemoPageShell><StateCard title="بانگهێشتنامە بار دەکرێت…" icon={<Link2 className="h-10 w-10" />}>تکایە چاوەڕێ بکە.</StateCard></DemoPageShell>;
  if (!invitation) return <DemoPageShell><StateCard title="بانگهێشتنامە نەدۆزرایەوە" icon={<ShieldAlert className="h-10 w-10 text-red-500" />}>ئەم نموونەیە تەنها لە هەمان وێبگەڕی بازرگانییەکەدا کار دەکات.</StateCard></DemoPageShell>;

  if (invitation.status === "revoked" || accessExpired) {
    return <DemoPageShell><StateCard title={invitation.status === "revoked" ? "دەستگەیشتن هەڵوەشێنراوەتەوە" : "بانگهێشتنامە بەسەرچووە"} icon={<LockKeyhole className="h-10 w-10 text-red-500" />}>داوا لە بازرگانی بکە بانگهێشتنامەیەکی نوێ دروست بکات.</StateCard></DemoPageShell>;
  }

  if (invitation.status === "submitted" || invitation.status === "published") {
    return (
      <DemoPageShell>
        <StateCard title={invitation.status === "published" ? "پەڕەکەت بڵاوکرایەوە" : "بۆ پێداچوونەوە نێردرا"} icon={<CheckCircle2 className="h-12 w-12 text-emerald-500" />}>
          <p>دەستکاریکردنی کڕیار داخراوە و بازرگانی دەتوانێت پێداچوونەوە بکات.</p>
          {invitation.status === "published" && (
            <a href={`/client-linktree-demo/${encodeURIComponent(invitation.resultsToken)}/results`} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--multitree-accent)] px-5 font-black text-[var(--multitree-accent-ink)]">بینینی ئەنجامەکان <ExternalLink className="h-4 w-4" /></a>
          )}
        </StateCard>
      </DemoPageShell>
    );
  }

  const attemptsRemaining = Math.max(0, MAX_PIN_ATTEMPTS - pinAttempts);
  const pinLocked = Boolean(invitation.pin) && attemptsRemaining === 0;

  if (!unlocked) {
    return (
      <DemoPageShell>
        <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#161b22] sm:p-8">
          <Link2 className="h-10 w-10 text-[var(--multitree-accent)]" />
          <h1 className="mt-5 text-2xl font-black">پەڕەی کەمپینەکەت دروست بکە</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">دەتوانیت یەک لینکتری بۆ <strong>{invitation.campaignLabel}</strong> ئامادە و بنێریت.</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" /> نزیکەی {remainingHours.toLocaleString("ckb-IQ")} کاتژمێر ماوە</div>
          {invitation.pin && (
            <EditorField label="پینی دەستگەیشتن" required error={pinError ?? undefined} className="mt-6">
              <input value={pin} disabled={pinLocked} onChange={(event) => { setPin(event.target.value.toUpperCase().slice(0, 9)); setPinError(null); }} className={modalInputClass(Boolean(pinError), "text-left font-mono tracking-widest")} placeholder="XXXX-XXXX" autoComplete="one-time-code" />
            </EditorField>
          )}
          <button type="button" disabled={pinLocked} onClick={() => {
            if (invitation.pin && pin.trim().toUpperCase() !== invitation.pin) {
              const nextAttempts = Math.min(MAX_PIN_ATTEMPTS, pinAttempts + 1);
              setPinAttempts(nextAttempts);
              window.sessionStorage.setItem(pinAttemptKey(token), String(nextAttempts));
              setPinError(nextAttempts >= MAX_PIN_ATTEMPTS ? "زۆر هەوڵ دراوە. بۆ ئەم دانیشتنە دەستگەیشتن داخرا." : `پینەکە هەڵەیە. ${MAX_PIN_ATTEMPTS - nextAttempts} هەوڵ ماوە.`);
              return;
            }
            window.sessionStorage.removeItem(pinAttemptKey(token));
            setUnlocked(true);
            setEditorOpen(true);
          }} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--multitree-accent)] px-5 text-sm font-black text-[var(--multitree-accent-ink)] disabled:cursor-not-allowed disabled:opacity-50"><LockKeyhole className="h-4 w-4" /> کردنەوەی دەستکاریکەر</button>
          <p className="mt-4 text-xs leading-5 text-amber-700 dark:text-amber-300">ئەمە تەنها نموونەی ناو وێبگەڕە؛ پاراستنی ڕاستەقینە پێویستی بە پشتگیری سێرڤەر و بنکەدراوە هەیە.</p>
        </section>
      </DemoPageShell>
    );
  }

  return (
    <DemoPageShell>
      <StateCard title="دەستکاریکەری هاوبەش ئامادەیە" icon={<Link2 className="h-10 w-10" />}>
        <p>هەمان مۆداڵ و هەمان هەنگاوەکانی لینکتری بەکاردەهێنرێن. هیچ داواکارییەکی پاشەوە نانێردرێت.</p>
        <button type="button" onClick={() => setEditorOpen(true)} className="mt-5 h-11 rounded-xl bg-[var(--multitree-accent)] px-5 font-black text-[var(--multitree-accent-ink)]">کردنەوەی دەستکاریکەر</button>
      </StateCard>
      <ReusableLinktreeEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSubmit={(data) => {
          const updated = updateClientAccessDemoInvitation(token, (current) => submitClientAccessDemoInvitation({
            ...current,
            templateName: getTemplateName(data.templateKey) ?? data.templateKey,
            draft: editorDataToDraft(data),
            editorData: data,
          }));
          setEditorOpen(false);
          if (updated) setInvitation(updated);
        }}
        workflow={{
          persistence: "browser-local",
          allowedTemplateKeys: invitation.allowedTemplateKeys,
          maxLinks: invitation.maxLinks,
          allowImageUploads: invitation.allowImageUploads,
          maxImageBytes: 2_000_000,
          hideBusinessFields: true,
          title: "لینکترییەکەت دروست بکە",
          submitLabel: "ناردن بۆ پێداچوونەوە",
        }}
      />
    </DemoPageShell>
  );
}

export default function ClientInvitationEditorDemo({ token }: { token: string }) {
  return (
    <ThemeProvider websiteColor={null}>
      <ClientInvitationEditorDemoContent token={token} />
    </ThemeProvider>
  );
}
