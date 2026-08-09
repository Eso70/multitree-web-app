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
  kind: "pixel" | "queue" | "error";
  eventName: string;
  eventId?: string;
  actionKey?: string;
  pixelDispatched?: boolean;
  detail?: string;
}

const MAX_ENTRIES = 200;
const entries: TikTokDebugEntry[] = [];
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
  const pixelIds =
    typeof window !== "undefined" && window.ttq
      ? Object.keys(
          (window.ttq as unknown as { _i?: Record<string, unknown> })._i || {},
        )
      : [];
  const dispatched = entries.filter((entry) => entry.kind === "pixel");
  const queued = entries.filter((entry) => entry.kind === "queue");
  const ids = queued.map((entry) => entry.eventId).filter(Boolean);
  return {
    pixelLoaded: loaded,
    pixelIds,
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
    errors: entries.filter((entry) => entry.kind === "error"),
    entries: [...entries],
  };
}

let reporterInstalled = false;

function installReporter(): void {
  if (reporterInstalled || typeof window === "undefined") return;
  reporterInstalled = true;
  (window as unknown as { __ttDebug: unknown }).__ttDebug = {
    report: () => {
      const snapshot = tikTokDebugSnapshot();
       
      console.table(snapshot.entries);
      return snapshot;
    },
    snapshot: tikTokDebugSnapshot,
    clear: () => entries.splice(0, entries.length),
  };
}
