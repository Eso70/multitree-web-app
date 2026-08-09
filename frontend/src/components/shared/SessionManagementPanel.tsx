"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useState } from "react";
import { Monitor, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { SkeletonList } from "@/components/shared/Skeleton";

type Session = {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  session_expires_at: string;
  is_current: boolean;
  remembered: boolean;
};

type LoginActivity = {
  id: string;
  outcome: "success" | "failure" | "denied";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export function SessionManagementPanel({
  endpoint,
  administratorMode = false,
}: {
  endpoint: string;
  administratorMode?: boolean;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<"all" | Session | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.message || "Unable to load sessions");
      setSessions(payload.data?.sessions || []);
      setActivity(payload.data?.recent_activity || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load sessions",
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(payload.message || "Unable to load sessions");
        return payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setSessions(payload.data?.sessions || []);
        setActivity(payload.data?.recent_activity || []);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          toast.error(
            error instanceof Error ? error.message : "Unable to load sessions",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const confirmRevoke = async () => {
    if (!pendingRevoke) return;
    setRevoking(true);
    try {
      const url =
        pendingRevoke === "all" ? endpoint : `${endpoint}/${pendingRevoke.id}`;
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.message || "Unable to revoke session");
      if (pendingRevoke === "all") {
        setSessions((current) =>
          administratorMode
            ? []
            : current.filter((session) => session.is_current),
        );
      } else {
        setSessions((current) =>
          current.filter((session) => session.id !== pendingRevoke.id),
        );
      }
      toast.success("Session access revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to revoke session",
      );
      throw error;
    } finally {
      setRevoking(false);
    }
  };

  const revocableSessions = sessions.filter(
    (session) => administratorMode || !session.is_current,
  );

  return (
    <div className="col-span-full space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck
              className="h-5 w-5"
              style={{ color: "var(--theme-primary, var(--multitree-accent))" }}
            />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Active sessions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review devices with access to this business.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            aria-busy={loading}
            disabled={loading}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
            aria-label="Refresh sessions"
          >
            <MotionSpinner active={loading}>
              <RefreshCw className="h-4 w-4" />
            </MotionSpinner>
          </button>
        </div>

        <div className="space-y-3">
          {loading && sessions.length === 0 ? (
            <SkeletonList rows={3} />
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No active sessions found.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#161B22]"
              >
                <Monitor className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {describeUserAgent(session.user_agent)}
                    </p>
                    {session.is_current && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        Current
                      </span>
                    )}
                    {session.remembered && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                        Remembered
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-400">
                    {session.ip_address || "Unknown IP"} ·{" "}
                    {formatDate(session.created_at)} · expires{" "}
                    {formatDate(session.session_expires_at)}
                  </p>
                </div>
                {(administratorMode || !session.is_current) && (
                  <button
                    type="button"
                    onClick={() => setPendingRevoke(session)}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    aria-label="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {revocableSessions.length > 0 && (
          <button
            type="button"
            onClick={() => setPendingRevoke("all")}
            className="mt-4 w-full cursor-pointer rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            {administratorMode
              ? "Revoke all business sessions"
              : "Sign out all other sessions"}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">
          Recent login activity
        </h3>
        <div className="mt-3 divide-y divide-slate-200 dark:divide-white/5">
          {loading && activity.length === 0 ? (
            <SkeletonList rows={4} />
          ) : activity.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              No recent login activity.
            </p>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {describeUserAgent(item.user_agent)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {item.ip_address || "Unknown IP"} ·{" "}
                    {formatDate(item.created_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.outcome === "success" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}
                >
                  {item.outcome === "success" ? "Successful" : "Failed"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={pendingRevoke !== null}
        onClose={() => setPendingRevoke(null)}
        onConfirm={confirmRevoke}
        isDeleting={revoking}
        title="Revoke session access"
        confirmLabel="Revoke access"
        loadingLabel="Revoking…"
        message="This device will immediately lose access. The action is recorded in the security activity log."
        zIndexClassName="z-[80]"
      />
    </div>
  );
}

function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const platform = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iPad")
        ? "iOS"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown device";
  return `${browser} on ${platform}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}
