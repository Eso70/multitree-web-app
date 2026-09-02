"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";

export default function ConsumeBusinessAuthPage() {
  const search = useSearchParams();
  const code = search.get("code");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!code) {
      window.location.replace("/business/workspace-entry");
      return;
    }
    window.history.replaceState({}, "", "/business/auth/consume");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    void fetch("/api/auth/handoff", {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((response) => {
        if (!response.ok) {
          window.location.replace("/business/workspace-entry");
          return;
        }
        window.location.replace("/business");
      })
      .catch(() => window.location.replace("/business/workspace-entry"))
      .finally(() => window.clearTimeout(timeout));
  }, [code]);

  return (
    <AuthenticationShell
      backHref="/business/workspace-entry"
      brandDescription="بە پاراستن دەچیتە داشبۆردی بزنسەکەت"
      brandName="بزنس"
      brandLogo={BUSINESS_LOGO_PLACEHOLDER}
      previewTitle="پانێڵی بزنس"
      businessTenant
    >
      <AuthenticationCard
        title="چوونەژوورەوەی پارێزراو"
        description="دانیشتنەکەت پشتڕاست دەکەینەوە"
      >
        <LoadingState
          compact
          title="دانیشتنەکەت ئامادە دەکرێت"
          description="ئەمە تەنها چەند چرکەیەک دەخایەنێت."
        />
      </AuthenticationCard>
    </AuthenticationShell>
  );
}
