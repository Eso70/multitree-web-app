"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, EyeOff } from "lucide-react";
import { isApiRequestError } from "@/lib/api/request";
import {
  getTikTokDeliveryErrors,
  getTikTokHealth,
  type TikTokDeliveryError,
  type TikTokHealth,
} from "@/features/analytics/api";

/**
 * What is actually wrong with a business's TikTok connection.
 *
 * The configuration page could previously only show what was saved, never
 * whether it worked. A rejected Events API token, a payload TikTok refused, or
 * a pixel that never loads all look identical from the form: the fields are
 * filled in and nothing arrives in Events Manager.
 *
 * Two different kinds of evidence are shown, and they are labelled differently
 * on purpose:
 *
 * - **Events API** errors are real, recorded responses. Every delivery attempt
 *   writes a `marketing_delivery_attempts` row, so this half quotes what TikTok
 *   said, with its status code.
 * - **Pixel** problems are *derived*. A pixel failing in a visitor's browser —
 *   ad blocker, network, wrong id — leaves no server-side record, so nothing
 *   here can quote an error for it. What can be said honestly is that events
 *   were queued while none of them carried a browser dispatch, which is what a
 *   pixel that never fires looks like from the server.
 */
function formatWhen(value: string): string {
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? "—" : at.toLocaleString();
}

function ErrorRow({ item }: { item: TikTokDeliveryError }) {
  const permanent = item.severity === "permanent";
  return (
    <li
      className={`rounded-xl border p-3 ${
        permanent
          ? "border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/10"
          : "border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {permanent ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <span
          className={`text-xs font-bold ${
            permanent
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {permanent ? "شکستی کۆتایی" : "هەوڵی دووبارە"}
        </span>
        {item.pixelId && (
          <span className="rounded-lg bg-white/70 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {item.pixelId}
          </span>
        )}
        {item.statusCode !== null && (
          <span className="rounded-lg bg-white/70 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
            HTTP {item.statusCode}
          </span>
        )}
      </div>
      <p className="mt-2 break-words text-xs text-slate-700 dark:text-slate-200">
        {item.message}
      </p>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {item.events} ڕووداو · {item.attempts} هەوڵ · {formatWhen(item.lastSeenAt)}
      </p>
    </li>
  );
}

export function TikTokDeliveryStatusPanel() {
  const [health, setHealth] = useState<TikTokHealth | null>(null);
  const [errors, setErrors] = useState<TikTokDeliveryError[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getTikTokHealth(controller.signal),
      getTikTokDeliveryErrors(controller.signal),
    ])
      .then(([healthResult, errorResult]) => {
        setHealth(healthResult);
        setErrors(errorResult.items);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        // A plan without the TikTok feature answers 403 here. That is not an
        // error to shout about on a configuration page: the panel simply has
        // nothing to report.
        setUnavailable(isApiRequestError(cause, 403));
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading || unavailable) return null;
  if (!health || health.connections === 0) return null;

  // Queued but nothing dispatched from a browser: the server half is running
  // and the pixel half is not. Derived, not a captured error — see the note at
  // the top of this file.
  const pixelSilent = health.serverEvents > 0 && health.browserEvents === 0;
  const healthy = errors.length === 0 && !pixelSilent;

  return (
    <section className="mt-6 border-t border-slate-100 pt-5 dark:border-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            دۆخی گەیاندن
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ئەوەی TikTok وەڵامی داوەتەوە بۆ ئەم بزنسە.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {health.delivered} گەیشتوو · {health.retrying} لە ڕیز · {health.failed}{" "}
          شکستخواردوو
        </span>
      </div>

      {healthy ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            هیچ هەڵەیەکی گەیاندن نییە.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {pixelSilent && (
            <li className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Pixel هیچ ڕووداوێکی نەناردووە
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-200">
                {health.serverEvents} ڕووداو لە ڕاژەکارەوە نێردراون، بەڵام هیچیان
                لە وێبگەڕەوە نەنێردراون. زۆرجار مانای ئەوەیە Pixel ID هەڵەیە یان
                بەربەستی ڕیکلام ڕێی لێ گرتووە.
              </p>
            </li>
          )}
          {errors.map((item) => (
            <ErrorRow
              key={`${item.destinationId}:${item.statusCode ?? "none"}:${item.message}`}
              item={item}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
