"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessLinktreeSummary as Linktree } from "@linktree/types";

/**
 * The business default page is pinned to the top of the dashboard list. Legacy
 * rows are only identifiable by the reserved `id` uid, so both markers count.
 */
function isDefaultLinktree(item: Linktree): boolean {
  return item.is_default === true || item.uid === "id";
}

/**
 * The backend demotes the previous default whenever another page is saved as
 * default, so the list mirrors that instead of showing two default pages until
 * the next reload.
 */
function withSingleDefault(items: Linktree[], defaultId: string): Linktree[] {
  return items.map((item) =>
    item.id === defaultId || !item.is_default
      ? item
      : { ...item, is_default: false },
  );
}

export function sortLinktreesForDashboard(items: Linktree[]): Linktree[] {
  return [...items].sort((a, b) => {
    const aIsDefault = isDefaultLinktree(a);
    const bIsDefault = isDefaultLinktree(b);
    if (aIsDefault !== bIsDefault) return aIsDefault ? -1 : 1;

    const dateA = Date.parse(a.created_at) || 0;
    const dateB = Date.parse(b.created_at) || 0;
    return dateB - dateA;
  });
}

export function useLinktrees(initialLinktrees: Linktree[]) {
  const [linktrees, setLinktrees] = useState<Linktree[]>(() =>
    sortLinktreesForDashboard(initialLinktrees),
  );
  const [isLoading, setIsLoading] = useState(initialLinktrees.length === 0);

  const reload = useCallback(
    async (
      showLoading = false,
      bypassCache = false,
      rethrow = false,
    ) => {
      if (showLoading) setIsLoading(true);

      try {
        const { fetchWithCache } = await import("@/lib/utils/cache");
        const url = bypassCache
          ? `/api/linktrees?_t=${Date.now()}`
          : "/api/linktrees";
        const result = await fetchWithCache<Linktree[]>(
          url,
          undefined,
          "/api/linktrees",
          bypassCache,
          (value): value is Linktree[] => Array.isArray(value),
        );

        setLinktrees(sortLinktreesForDashboard(result || []));
      } catch (error) {
        console.error("Error fetching linktrees:", error);
        if (rethrow) throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialLinktrees.length === 0) {
      const frame = requestAnimationFrame(() => void reload(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [initialLinktrees.length, reload]);

  const removeLinktree = useCallback((id: string) => {
    setLinktrees((current) => current.filter((linktree) => linktree.id !== id));
  }, []);

  const mergeLinktree = useCallback(
    (id: string, changes: Partial<Linktree>) => {
      // Re-sorted because an edit can promote a page to default, and the
      // default page has to stay first without waiting for a reload.
      setLinktrees((current) => {
        const merged = current.map((linktree) =>
          linktree.id === id ? { ...linktree, ...changes } : linktree,
        );
        return sortLinktreesForDashboard(
          changes.is_default ? withSingleDefault(merged, id) : merged,
        );
      });
    },
    [],
  );

  const prependLinktree = useCallback((linktree: Linktree) => {
    setLinktrees((current) => {
      const next = [linktree, ...current];
      return sortLinktreesForDashboard(
        linktree.is_default ? withSingleDefault(next, linktree.id) : next,
      );
    });
  }, []);

  const mapLinktrees = useCallback(
    (mapper: (linktree: Linktree) => Linktree) => {
      setLinktrees((current) => current.map(mapper));
    },
    [],
  );

  return {
    linktrees,
    isLoading,
    reload,
    removeLinktree,
    mergeLinktree,
    prependLinktree,
    mapLinktrees,
  };
}
