"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clipboard, Link2 } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api/request";
import { copyToClipboard } from "@/lib/utils/clipboard";
import { formatDateTime } from "@/lib/utils/format-date-time";

export function InvitationCreator({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (
        container.current &&
        !container.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const copyInvitationLink = useCallback(async () => {
    const copied = await copyToClipboard(inviteUrl);
    if (copied) toast.success("کۆپی کرا");
    else toast.error("کۆپیکردن سەرکەوتوو نەبوو");
  }, [inviteUrl]);

  async function createInvite() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ signupUrl: string; expiresAt: string }>(
        "/api/platform/signup/invitations",
        { method: "POST", json: email.trim() ? { email: email.trim() } : {} },
      );
      setInviteUrl(result.signupUrl);
      setInviteExpiresAt(result.expiresAt);
      setEmail("");
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
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
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

      {open && (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-white/5">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">
              بانگهێشتنامەی نوێ
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              تۆمارکردن تەنها بە بەستەری یەکەمەڕەی ٧ ڕۆژە دەکرێت.
            </p>
          </div>

          <div className="space-y-3 p-4">
            <input
              type="email"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition-colors focus:border-slate-400 dark:border-white/10 dark:bg-[#161b22] dark:focus:border-white/25"
              placeholder="ئەیمەیڵی دیاریکراو (ئارەزووەکەرانە)"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createInvite();
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void createInvite()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--multitree-accent)] px-4 text-sm font-bold text-[var(--multitree-accent-ink)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2 className="h-4 w-4" />
              دروستکردنی بانگهێشتنامە
            </button>

            {inviteUrl && (
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300">
                    {inviteUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyInvitationLink()}
                    aria-label="کۆپیکردنی بانگهێشتنامە"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-gray-400 dark:hover:bg-[#1c222b] dark:hover:text-gray-200"
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>
                </div>
                {inviteExpiresAt && (
                  <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                    بەسەردەچێت: {formatDateTime(inviteExpiresAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
