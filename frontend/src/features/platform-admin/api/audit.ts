import type { AuditLogFilterOptions, AuditLogPage } from "@linktree/types";
import { apiRequest } from "@/lib/api/request";

export function getAuditLog(params: URLSearchParams, signal: AbortSignal) {
  return apiRequest<AuditLogPage>(`/api/platform/audit-events?${params}`, {
    signal,
  });
}

export function getAuditFilterOptions(
  params: URLSearchParams,
  signal: AbortSignal,
) {
  return apiRequest<AuditLogFilterOptions>(
    `/api/platform/audit-events/filter-options?${params}`,
    { signal },
  );
}
