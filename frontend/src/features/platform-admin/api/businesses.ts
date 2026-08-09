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

export function getBusinesses(
  params: URLSearchParams,
): Promise<BusinessListPage> {
  return apiRequest<BusinessListPage>(`/api/platform/businesses?${params}`);
}
