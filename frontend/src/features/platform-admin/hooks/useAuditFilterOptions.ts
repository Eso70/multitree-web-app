"use client";

import { useEffect, useState } from "react";
import type { AuditLogFilterOptions } from "@linktree/types";
import { getAuditFilterOptions } from "@/features/platform-admin/api/audit";

const emptyOptions: AuditLogFilterOptions = {
  businesses: [],
  linktrees: [],
};

export function useAuditFilterOptions(businessId: string) {
  const [options, setOptions] = useState<AuditLogFilterOptions>(emptyOptions);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (businessId) params.set("businessId", businessId);

    async function load() {
      try {
        setOptions(await getAuditFilterOptions(params, controller.signal));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setOptions(emptyOptions);
      }
    }

    void load();
    return () => controller.abort();
  }, [businessId]);

  return options;
}
