export type AuditActorType =
  "anonymous" | "business" | "platform-admin" | "multitree";

export type AuditOutcome = "success" | "failure" | "denied";

export type AuditLogKind = "audit" | "request" | "view" | "click" | "integration";
export type RequestSource = "frontend" | "backend";
export type AuditLogSort =
  | "newest"
  | "oldest"
  | "failure-first"
  | "denied-first"
  | "success-first"
  | "business-first"
  | "views-first"
  | "clicks-first"
  | "requests-first"
  | "integrations-first"
  | "slowest-first";

export interface AuditLogEntry {
  id: string;
  kind: AuditLogKind;
  actorType: AuditActorType;
  actorId: string | null;
  actorLabel: string;
  businessId: string | null;
  businessLabel: string | null;
  linktreeId: string | null;
  linktreeLabel: string | null;
  eventType: string;
  outcome: AuditOutcome;
  resourceType: string | null;
  resourceId: string | null;
  resourceLabel: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  httpMethod: string | null;
  requestPath: string | null;
  statusCode: number | null;
  durationMs: number | null;
  source: RequestSource | null;
  createdAt: string;
}

export interface AuditLogFilterOptions {
  businesses: Array<{ id: string; label: string }>;
  linktrees: Array<{
    id: string;
    businessId: string;
    label: string;
    uid: string;
  }>;
}

export interface AuditLogSummary {
  total: number;
  successful: number;
  failed: number;
  denied: number;
  last24Hours: number;
}

export interface AuditLogFacet {
  value: string;
  count: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  summary: AuditLogSummary;
  eventTypes: AuditLogFacet[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
