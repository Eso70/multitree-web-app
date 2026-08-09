"use client";

import { useCallback, useEffect, useState } from "react";
import type { BusinessLinktreeSummary as Linktree } from "@linktree/types";

export function sortLinktreesForDashboard(items: Linktree[]): Linktree[] {
  return [...items].sort((a, b) => {
    const aIsDefault = a.uid === "id";
    const bIsDefault = b.uid === "id";
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
      setLinktrees((current) =>
        current.map((linktree) =>
          linktree.id === id ? { ...linktree, ...changes } : linktree,
        ),
      );
    },
    [],
  );

  const prependLinktree = useCallback((linktree: Linktree) => {
    setLinktrees((current) =>
      sortLinktreesForDashboard([linktree, ...current]),
    );
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
