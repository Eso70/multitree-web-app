"use client";

/**
 * A window onto what tracking actually did, for checking a live page.
 *
 * Tracking fails quietly by design — a public page must never break because an
 * event could not be sent — which leaves no way to tell "working" from
 * "silently dropping everything". This records what happened and prints it on
 * request.
 *
 * Off unless asked for, so it costs a disabled boolean check in production.
 * Turn it on with `?ttdebug=1`, or `localStorage.ttdebug = "1"` to keep it on
 * across navigations, then read `window.__ttDebug.report()` in the console.
 */

export interface TikTokDebugEntry {
  at: string;
  kind:
    | "pixel"
    | "queue"
    | "error"
    | "pixel_loaded"
    | "pixel_failed"
    | "flush";
  eventName: string;
  eventId?: string;
  actionKey?: string;
  pixelDispatched?: boolean;
  pixelId?: string;
  detail?: string;
}

/** The last outcome of a queue flush, for the "did the server accept it?" row. */
export interface TikTokFlushResult {
  at: string;
  ok: boolean;
  statusCode?: number;
  accepted?: number;
  deduplicated?: number;
  total?: number;
  retryable?: boolean;
}

const MAX_ENTRIES = 200;
const MAX_FLUSH_RESULTS = 10;
const entries: TikTokDebugEntry[] = [];
const flushResults: TikTokFlushResult[] = [];
let enabled: boolean | null = null;

function cookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function isTikTokDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (enabled !== null) return enabled;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get(
      "ttdebug",
    );
    if (fromQuery === "1") window.localStorage.setItem("ttdebug", "1");
    if (fromQuery === "0") window.localStorage.removeItem("ttdebug");
    enabled = window.localStorage.getItem("ttdebug") === "1";
  } catch {
    // Private-mode storage refusals must not disable the page itself.
    enabled = false;
  }
  return enabled;
}

export function recordTikTokDebug(entry: Omit<TikTokDebugEntry, "at">): void {
  if (!isTikTokDebugEnabled()) return;
  entries.push({ ...entry, at: new Date().toISOString() });
  // Bounded: a long session on a busy page would otherwise grow without limit.
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  installReporter();
}

/** What the page can see about its own tracking, for the console report. */
export function tikTokDebugSnapshot() {
  const loaded = typeof window !== "undefined" && Boolean(window.ttq);
  const registry =
    typeof window !== "undefined"
      ? (window.ttq as unknown as { _i?: Record<string, unknown> })._i
      : undefined;
  const pixelIds = registry ? Object.keys(registry).filter(Boolean) : [];
  const dispatched = entries.filter((entry) => entry.kind === "pixel");
  const queued = entries.filter((entry) => entry.kind === "queue");
  const ids = queued.map((entry) => entry.eventId).filter(Boolean);
  const pixelStatus = Object.fromEntries(
    pixelIds.map((pixelId) => {
      if (entries.some((entry) => entry.kind === "pixel_failed" && entry.pixelId === pixelId))
        return [pixelId, "failed"];
      if (entries.some((entry) => entry.kind === "pixel_loaded" && entry.pixelId === pixelId))
        return [pixelId, "loaded"];
      return [pixelId, "loading"];
    }),
  );
  return {
    pixelLoaded: loaded,
    pixelIds,
    pixelStatus,
    route: typeof window !== "undefined" ? window.location.pathname : "",
    url: typeof window !== "undefined" ? window.location.href : "",
    ttp: cookie("_ttp") ?? null,
    ttclid:
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ttclid")
        : null,
    pixelEventsFired: dispatched.length,
    eventsQueuedToServer: queued.length,
    // Both sides send the same id for one interaction, so a repeat means the
    // pair TikTok is meant to collapse would instead be counted twice.
    duplicateEventIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    missingEventIds: queued.filter((entry) => !entry.eventId).length,
    // The server answers per batch: accepted/deduplicated counts and a retry
    // flag. This row turns "did it send?" into "did it land?".
    flushes: [...flushResults],
    errors: entries.filter((entry) => entry.kind === "error"),
    entries: [...entries],
  };
}

let reporterInstalled = false;

/**
 * Listens for the queue's flush outcomes.
 *
 * `client-queue` dispatches `mt:analytics-flush` on every batch result; the
 * server's per-event verdicts (`accepted`, `deduplicated`) are what turn this
 * report from "the queue handed off" into "the server recorded it".
 */
function installFlushListener(): void {
  if (typeof window === "undefined") return;
  const record = (event: Event) => {
    const detail = (event as CustomEvent<TikTokFlushResult>).detail;
    if (!detail) return;
    flushResults.push({ ...detail, at: new Date().toISOString() });
    if (flushResults.length > MAX_FLUSH_RESULTS)
      flushResults.splice(0, flushResults.length - MAX_FLUSH_RESULTS);
    entries.push({
      at: new Date().toISOString(),
      kind: "flush",
      eventName: "batch",
      detail: `status=${detail.statusCode ?? "none"} accepted=${detail.accepted ?? "?"} deduplicated=${detail.deduplicated ?? "?"}`,
    });
    if (entries.length > MAX_ENTRIES)
      entries.splice(0, entries.length - MAX_ENTRIES);
  };
  window.addEventListener("mt:analytics-flush", record);
}

function installReporter(): void {
  if (reporterInstalled || typeof window === "undefined") return;
  reporterInstalled = true;
  installFlushListener();
  (window as unknown as { __ttDebug: unknown }).__ttDebug = {
    report: () => {
      const snapshot = tikTokDebugSnapshot();

      console.table(snapshot.entries);
      return snapshot;
    },
    snapshot: tikTokDebugSnapshot,
    clear: () => {
      entries.splice(0, entries.length);
      flushResults.splice(0, flushResults.length);
    },
  };
}
