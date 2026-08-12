import { apiRequest } from "@/lib/api/request";
import type { PlatformBusiness as Business } from "@linktree/types";

export interface BusinessPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BusinessSummary {
  total: number;
  active: number;
  suspended: number;
  pendingApplications: number;
  totalApplications: number;
  activeInvitations: number;
}

export interface BusinessListPage {
  items: Business[];
  pagination: BusinessPagination;
  summary: BusinessSummary;
}

export interface BusinessImpersonationHandoff {
  /** Single-use tenant URL that exchanges the handoff for a session cookie. */
  redirectUrl: string;
  expiresInSeconds: number;
}

export function getBusinesses(
  params: URLSearchParams,
): Promise<BusinessListPage> {
  return apiRequest<BusinessListPage>(`/api/platform/businesses?${params}`);
}

/**
 * Opens a business dashboard as that business. The response is a short-lived
 * single-use URL, so it must be navigated to immediately and never stored,
 * logged, or shared.
 */
export function startBusinessImpersonation(
  businessId: string,
  reason?: string,
): Promise<BusinessImpersonationHandoff> {
  return apiRequest<BusinessImpersonationHandoff>(
    `/api/platform/businesses/${businessId}/impersonation`,
    { method: "POST", json: reason ? { reason } : {} },
  );
}
