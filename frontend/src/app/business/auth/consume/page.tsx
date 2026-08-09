"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ConsumeBusinessAuthPage() {
  const search = useSearchParams();
  const code = search.get("code");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!code) {
      window.location.replace("/business/login");
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
          window.location.replace("/business/login");
          return;
        }
        window.location.replace("/business");
      })
      .catch(() => window.location.replace("/business/login"))
      .finally(() => window.clearTimeout(timeout));
  }, [code]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-500" />
        <h1 className="mt-4 text-base font-bold text-slate-700 dark:text-white">
          Loading...
        </h1>
      </div>
    </main>
  );
}
