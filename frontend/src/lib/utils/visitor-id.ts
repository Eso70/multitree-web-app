/**
 * Stable anonymous visitor identifier.
 *
 * Used as the analytics visitor identity so unique-view/click reporting is
 * per-browser instead of per-IP. It is persisted when storage is available
 * and falls back to this page's memory when privacy settings block storage.
 */

const VISITOR_ID_KEY = "mt_visitor_id";
const SESSION_ID_KEY = "mt_analytics_session_id";
const SESSION_ACTIVITY_KEY = "mt_analytics_session_activity";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let memoryVisitorId: string | undefined;
let memorySessionId: string | undefined;
let memorySessionActivity = 0;

function generateVisitorId(): string {
  return createRuntimeId("v_");
}

export function getVisitorId(): string {
  if (!memoryVisitorId) memoryVisitorId = generateVisitorId();
  if (typeof window === "undefined") return memoryVisitorId;
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = generateVisitorId();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    memoryVisitorId = id;
    return memoryVisitorId;
  } catch {
    return memoryVisitorId;
  }
}

export function getAnalyticsSessionId(): string {
  const now = Date.now();
  if (!memorySessionId || now - memorySessionActivity > SESSION_TIMEOUT_MS) {
    memorySessionId = createRuntimeId();
  }
  memorySessionActivity = now;
  if (typeof window === "undefined") return memorySessionId;
  try {
    const lastActivity = Number(
      sessionStorage.getItem(SESSION_ACTIVITY_KEY) || 0,
    );
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id || now - lastActivity > SESSION_TIMEOUT_MS) {
      id = createRuntimeId();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
    memorySessionId = id;
    memorySessionActivity = now;
    return memorySessionId;
  } catch {
    return memorySessionId;
  }
}
import { createRuntimeId } from "./random-id";
