"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditLogPage, AuditLogSort } from "@linktree/types";
import { getAuditLog } from "@/features/platform-admin/api/audit";
import { isApiRequestError } from "@/lib/api/request";

export interface AuditLogFilters {
  search: string;
  actorType: string;
  outcome: string;
  eventType: string;
  from: string;
  to: string;
  sort: AuditLogSort;
  kind: string;
  source: string;
  httpMethod: string;
  businessId: string;
  linktreeId: string;
}

interface UseAuditLogOptions extends AuditLogFilters {
  page: number;
  pageSize: number;
}

export function useAuditLog(options: UseAuditLogOptions) {
  const {
    page,
    pageSize,
    search,
    actorType,
    outcome,
    eventType,
    from,
    to,
    sort,
    kind,
    source,
    httpMethod,
    businessId,
    linktreeId,
  } = options;
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    for (const [key, value] of Object.entries({
      search,
      actorType,
      outcome,
      eventType,
      from,
      to,
      sort,
      kind,
      source,
      httpMethod,
      businessId,
      linktreeId,
    })) {
      if (value) params.set(key, value);
    }

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAuditLog(params, controller.signal);
        setData(result);
      } catch (requestError) {
        if (
          isApiRequestError(requestError, 401) ||
          isApiRequestError(requestError, 403)
        ) {
          const basePath = `/${window.location.pathname.split("/").filter(Boolean)[0]}`;
          window.location.assign(`${basePath}/login`);
          return;
        }
        if ((requestError as Error).name !== "AbortError") {
          setError(
            "نەتوانرا تۆماری چاودێری باربکرێت. تکایە دووبارە هەوڵ بدەرەوە.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [
    actorType,
    businessId,
    eventType,
    from,
    httpMethod,
    kind,
    linktreeId,
    outcome,
    page,
    pageSize,
    search,
    source,
    sort,
    to,
    reloadToken,
  ]);

  return { data, isLoading, isRefreshing, error, refresh };
}
