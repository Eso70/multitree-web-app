"use client";

import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import type { PlatformBusiness as Business } from "@linktree/types";
import { SessionManagementPanel } from "@/components/shared/SessionManagementPanel";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";

export function BusinessSessionsModal({
  business,
  onClose,
}: {
  business: Business | null;
  onClose: () => void;
}) {
  useModalKeyboard({
    isOpen: business !== null,
    onEscape: onClose,
    onEnter: () => undefined,
    enterEnabled: false,
  });

  if (!business) return null;

  return createPortal(
    <div className="modal-ltr fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && onClose()} dir="ltr" data-multitree-theme>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#161B22]">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--multitree-accent)" }} />
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Business sessions</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{business.name} · @{business.username}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Close session manager">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <SessionManagementPanel endpoint={`/api/platform/businesses/${business.id}/sessions`} administratorMode />
        </div>
      </div>
    </div>,
    document.body,
  );
}
