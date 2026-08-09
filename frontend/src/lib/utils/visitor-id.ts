/**
 * Stable anonymous visitor identifier.
 *
 * Used as the analytics `session_id` so unique-view/click de-duplication is
 * per-browser instead of per-IP (which previously collapsed everyone behind a
 * shared NAT/CGNAT into a single "visitor"). The id is persisted in
 * localStorage and never tied to a logged-in business.
 */

const VISITOR_ID_KEY = "mt_visitor_id";
const SESSION_ID_KEY = "mt_analytics_session_id";
const SESSION_ACTIVITY_KEY = "mt_analytics_session_activity";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function generateVisitorId(): string {
  return createRuntimeId("v_");
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = generateVisitorId();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const now = Date.now();
    const lastActivity = Number(
      sessionStorage.getItem(SESSION_ACTIVITY_KEY) || 0,
    );
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id || now - lastActivity > SESSION_TIMEOUT_MS) {
      id = createRuntimeId();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
    return id;
  } catch {
    return createRuntimeId();
  }
}
import { createRuntimeId } from "./random-id";
