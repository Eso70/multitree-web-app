import type { AuditActorType, AuditOutcome } from "@linktree/types";

const EVENT_LABELS: Record<string, string> = {
  "business.login": "چوونەژوورەوەی بزنس",
  "business.logout": "چوونەدەرەوەی بزنس",
  "business.settings.update": "نوێکردنەوەی ڕێکخستنەکانی بزنس",
  "business.linktree.create": "دروستکردنی پەڕە",
  "business.linktree.update": "نوێکردنەوەی پەڕە",
  "business.linktree.delete": "سڕینەوەی پەڕە",
  "business.linktree.links.sync": "نوێکردنەوەی لینکەکان",
  "business.link.create": "دروستکردنی لینک",
  "business.link.update": "نوێکردنەوەی لینک",
  "business.link.delete": "سڕینەوەی لینک",
  "business.asset.upload": "بارکردنی وێنەی بزنس",
  "platform_admin.login": "چوونەژوورەوەی بەڕێوەبەر",
  "platform_admin.logout": "چوونەدەرەوەی بەڕێوەبەر",
  "platform.business.create": "دروستکردنی بزنس",
  "platform.business.update": "نوێکردنەوەی بزنس",
  "platform.business.delete": "سڕینەوەی بزنس",
  "platform.business.password.reset": "گۆڕینی وشەی نهێنی بزنس",
  "platform.business.template_access.update": "گۆڕینی دەستگەیشتنی قاڵب",
  "platform.business.profile_request.review": "پێداچوونەوەی داواکاری پرۆفایل",
  "platform.business.linktrees.import": "هاوردەکردنی پەڕەکان",
  "platform.business.tiktok.update": "نوێکردنەوەی TikTok",
  "platform.settings.profile.update": "نوێکردنەوەی پرۆفایلی بەڕێوەبەر",
  "platform.settings.password.change": "گۆڕینی وشەی نهێنی بەڕێوەبەر",
  "platform.settings.branding.update": "نوێکردنەوەی براندینگ",
  "platform.template.settings.update": "نوێکردنەوەی ڕێکخستنی قاڵب",
  "platform.cache.clear": "پاککردنەوەی کاش",
  "platform.asset.upload": "بارکردنی وێنەی پلاتفۆرم",
  "platform.audit.export": "هەناردەکردنی تۆماری چاودێری",
  "analytics.page_view": "Public linktree view",
  "analytics.link_click": "Public link click",
  "http.get": "GET request",
  "http.head": "HEAD request",
  "http.post": "POST request",
  "http.put": "PUT request",
  "http.patch": "PATCH request",
  "http.delete": "DELETE request",
  "http.options": "OPTIONS request",
};

export function eventLabel(eventType: string): string {
  if (eventType.startsWith("integration.tiktok.events_api.")) {
    return `TikTok Events API · ${eventType.split(".").at(-1)}`;
  }
  return EVENT_LABELS[eventType] || eventType.replace(/[._]/g, " ");
}

export function actorTypeLabel(actorType: AuditActorType): string {
  return {
    anonymous: "نەناسراو",
    business: "بزنس",
    "platform-admin": "بەڕێوەبەری پلاتفۆرم",
    multitree: "MultiTree",
  }[actorType];
}

export function outcomeLabel(outcome: AuditOutcome): string {
  return {
    success: "سەرکەوتوو",
    failure: "شکستخواردوو",
    denied: "ڕەتکراوە",
  }[outcome];
}

export function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat("ku", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function outcomeClasses(outcome: AuditOutcome): string {
  if (outcome === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400";
  }
  if (outcome === "denied") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400";
}
