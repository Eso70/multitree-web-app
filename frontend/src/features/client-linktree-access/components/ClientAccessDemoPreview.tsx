import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { ClientAccessDemoInvitation } from "../mock-store";

export function ClientAccessDemoPreview({
  invitation,
  interactive = false,
}: {
  invitation: ClientAccessDemoInvitation;
  interactive?: boolean;
}) {
  const { draft } = invitation;

  return (
    <div className="mx-auto w-full max-w-[330px] rounded-[2rem] border border-slate-200 bg-slate-950 p-2 shadow-xl dark:border-white/10">
      <div
        className="min-h-[480px] overflow-hidden rounded-[1.55rem] px-5 py-8 text-center"
        style={{ background: draft.backgroundColor }}
      >
        {draft.profileImageDataUrl ? (
          <Image
            src={draft.profileImageDataUrl}
            alt="پێشبینینی وێنەی هەڵبژێردراوی کڕیار"
            width={72}
            height={72}
            unoptimized
            className="mx-auto h-[72px] w-[72px] rounded-full border-2 border-white/70 object-cover shadow-lg"
          />
        ) : (
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-white/70 bg-white/25 text-2xl font-black text-white shadow-lg">
            {(draft.pageName || invitation.campaignLabel)
              .charAt(0)
              .toUpperCase()}
          </div>
        )}
        <h3 className="mt-4 text-xl font-black text-white">
          {draft.pageName || "ناوی پەڕەکەت"}
        </h3>
        <p className="mt-2 min-h-10 text-sm leading-5 text-white/80">
          {draft.description || "وەسفی کورتی کەمپینەکەت لێرە دەردەکەوێت"}
        </p>
        <div className="mt-6 space-y-3">
          {draft.links.length > 0 ? (
            draft.links.map((link) => {
              const content = (
                <>
                  <span className="truncate">{link.label || "لینکی نوێ"}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </>
              );
              return interactive && link.url ? (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-sm transition hover:brightness-95"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={link.id}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-sm"
                >
                  {content}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/50 px-4 py-5 text-sm text-white/75">
              لینکەکان لێرە دەردەکەون
            </div>
          )}
        </div>
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
          تاقیکردنەوەی ڕووکار · MultiTree
        </p>
      </div>
    </div>
  );
}

export function ClientAccessDemoStatusPill({
  invitation,
}: {
  invitation: ClientAccessDemoInvitation;
}) {
  const styles = {
    active:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
    submitted:
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",
    published:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    revoked:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300",
  } as const;
  const labels = {
    active: "چالاک",
    submitted: "چاوەڕوانی پێداچوونەوە",
    published: "بڵاوکراوە",
    revoked: "هەڵوەشێنراوەتەوە",
  } as const;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${styles[invitation.status]}`}
    >
      {labels[invitation.status]}
    </span>
  );
}
