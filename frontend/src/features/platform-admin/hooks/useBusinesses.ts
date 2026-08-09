"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformBusiness as Business } from "@linktree/types";
import {
  getBusinesses,
  type BusinessPagination,
  type BusinessSummary,
} from "@/features/platform-admin/api/businesses";
import { isApiRequestError } from "@/lib/api/request";

export type { BusinessPagination, BusinessSummary };

export function useBusinesses(onUnauthorized: () => void) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [badGateway, setBadGateway] = useState(false);
  const [gatewayTimeout, setGatewayTimeout] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearchValue] = useState("");
  const [pagination, setPagination] = useState<BusinessPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState<BusinessSummary>({
    total: 0,
    active: 0,
    suspended: 0,
    pendingApplications: 0,
    totalApplications: 0,
    activeInvitations: 0,
  });

  const reload = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search.trim()) params.set("search", search.trim());
      const payload = await getBusinesses(params);
      setBusinesses(payload.items ?? []);
      if (payload.pagination) setPagination(payload.pagination);
      if (payload.summary) setSummary(payload.summary);
      setError(null);
      setBadGateway(false);
      setServiceUnavailable(false);
      setGatewayTimeout(false);
    } catch (cause) {
      if (isApiRequestError(cause, 401)) {
        onUnauthorized();
        return;
      }
      if (isApiRequestError(cause, 403)) {
        setBusinesses([]);
        setError(null);
        setBadGateway(false);
        setServiceUnavailable(false);
        setGatewayTimeout(false);
        return;
      }
      if (isApiRequestError(cause, 502)) {
        setBadGateway(true);
        setServiceUnavailable(false);
        setGatewayTimeout(false);
        setError(null);
        return;
      }
      if (isApiRequestError(cause, 504)) {
        setBadGateway(false);
        setServiceUnavailable(false);
        setGatewayTimeout(true);
        setError(null);
        return;
      }
      if (
        isApiRequestError(cause) &&
        (cause.status === 0 || cause.status === 503)
      ) {
        setBadGateway(false);
        setGatewayTimeout(false);
        setServiceUnavailable(true);
        setError(null);
        return;
      }
      setError(
        cause instanceof Error ? cause.message : "Failed to fetch businesses",
      );
    } finally {
      setIsLoading(false);
    }
  }, [onUnauthorized, page, search]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void reload();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reload]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  }, [reload]);

  const removeBusiness = useCallback((id: string) => {
    setBusinesses((current) =>
      current.filter((business) => business.id !== id),
    );
  }, []);

  const setSearch = useCallback((value: string) => {
    setPage(1);
    setSearchValue(value);
  }, []);

  return {
    businesses,
    isLoading,
    isRefreshing,
    error,
    badGateway,
    serviceUnavailable,
    gatewayTimeout,
    reload,
    refresh,
    removeBusiness,
    page,
    setPage,
    search,
    setSearch,
    pagination,
    summary,
    setOperationError: setError,
  };
}
