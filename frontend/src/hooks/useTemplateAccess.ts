"use client";
import { useCallback, useEffect, useState } from "react";

export function useTemplateAccess(enabled = true) {
  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(enabled);

  const refresh = useCallback(
    async (options?: { rethrow?: boolean; signal?: AbortSignal }) => {
      if (!enabled) return;
      try {
        const response = await fetch("/api/auth/template-access", {
          credentials: "include",
          cache: "no-store",
          signal: options?.signal,
        });
        if (!response.ok) throw new Error("Unable to load template access");
        const result = await response.json();
        const keys = result?.data?.template_keys;
        setLoadedKeys(
          Array.isArray(keys)
            ? new Set(
                keys.filter(
                  (key): key is string => typeof key === "string",
                ),
              )
            : new Set(),
        );
      } catch (error) {
        if (options?.signal?.aborted) return;
        setLoadedKeys(new Set());
        if (options?.rethrow) throw error;
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refresh({ signal: controller.signal }).finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, refresh]);

  const allowedKeys = enabled ? loadedKeys : null;

  return {
    allowedKeys,
    isLoading: enabled && isLoading,
    refresh,
    isTemplateAllowed: (key: string) =>
      allowedKeys === null || allowedKeys.has(key),
  };
}
