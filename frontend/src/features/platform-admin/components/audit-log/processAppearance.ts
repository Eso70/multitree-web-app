import type { AuditLogEntry } from "@linktree/types";
import type { LucideIcon } from "lucide-react";
import { Database, Download, Eye, FileClock, KeyRound, LogIn, LogOut, MousePointerClick, PencilLine, Plus, RefreshCw, Send, Trash2, UploadCloud } from "lucide-react";

export interface ProcessAppearance {
  Icon: LucideIcon;
  classes: string;
}

export function processAppearance(event: AuditLogEntry): ProcessAppearance {
  const type = event.eventType.toLowerCase();
  const method = (event.httpMethod || "").toUpperCase();
  if (type === "analytics.page_view") return appearance(Eye, "sky");
  if (type === "analytics.link_click") return appearance(MousePointerClick, "orange");
  if (type.startsWith("integration.tiktok.events_api")) return appearance(Send, "cyan");
  if (method === "GET" || method === "HEAD") return appearance(Eye, "sky");
  if (method === "POST") return appearance(Send, "emerald");
  if (method === "PUT" || method === "PATCH") return appearance(PencilLine, "violet");
  if (method === "DELETE") return appearance(Trash2, "rose");
  if (type.includes("logout")) return appearance(LogOut, "slate");
  if (type.includes("login")) return appearance(LogIn, "indigo");
  if (type.includes("password") || type.includes("auth")) return appearance(KeyRound, "amber");
  if (type.includes("upload") || type.includes("import")) return appearance(UploadCloud, "cyan");
  if (type.includes("export")) return appearance(Download, "purple");
  if (type.includes("cache")) return appearance(Database, "orange");
  if (type.includes("delete")) return appearance(Trash2, "rose");
  if (type.includes("create")) return appearance(Plus, "emerald");
  if (type.includes("update") || type.includes("change")) return appearance(PencilLine, "violet");
  if (type.includes("sync")) return appearance(RefreshCw, "blue");
  return appearance(FileClock, "slate");
}

function appearance(Icon: LucideIcon, color: keyof typeof COLOR_CLASSES): ProcessAppearance {
  return { Icon, classes: COLOR_CLASSES[color] };
}

const COLOR_CLASSES = {
  sky: "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-800/40 dark:bg-sky-950/35 dark:text-sky-400",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/35 dark:text-emerald-400",
  violet: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-800/40 dark:bg-violet-950/35 dark:text-violet-400",
  rose: "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800/40 dark:bg-rose-950/35 dark:text-rose-400",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800/40 dark:bg-indigo-950/35 dark:text-indigo-400",
  amber: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/40 dark:bg-amber-950/35 dark:text-amber-400",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-800/40 dark:bg-cyan-950/35 dark:text-cyan-400",
  purple: "border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-800/40 dark:bg-purple-950/35 dark:text-purple-400",
  orange: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800/40 dark:bg-orange-950/35 dark:text-orange-400",
  blue: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/40 dark:bg-blue-950/35 dark:text-blue-400",
  slate: "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
} as const;
