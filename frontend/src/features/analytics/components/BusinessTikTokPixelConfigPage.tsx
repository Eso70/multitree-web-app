"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleOff,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { EffectiveAccessManifest } from "@linktree/types";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkeletonDashboardPage } from "@/components/shared/Skeleton";

interface PixelConfig {
  id?: string;
  pixel_id: string;
  events_token: string;
  token_last_four?: string | null;
  has_events_token?: boolean;
  keep_events_token?: boolean;
}

function normalizeConfigs(value: unknown): PixelConfig[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
    const tokenLastFour =
      typeof row.token_last_four === "string" ? row.token_last_four : null;
    return {
      id: typeof row.id === "string" ? row.id : undefined,
      pixel_id: typeof row.pixel_id === "string" ? row.pixel_id : "",
      events_token: "",
      token_last_four: tokenLastFour,
      has_events_token: Boolean(row.has_events_token ?? tokenLastFour),
      keep_events_token: Boolean(row.has_events_token ?? tokenLastFour),
    };
  });
}

export function BusinessTikTokPixelConfigPage() {
  const [configs, setConfigs] = useState<PixelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<number, boolean>>({});
  const [access, setAccess] = useState<EffectiveAccessManifest | null>(null);

  const pixelLimit = useMemo(() => {
    const raw = access?.entitlements["limit.tiktok_pixels"];
    if (typeof raw === "number") return raw;
    if (typeof raw === "string" && raw.trim()) {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }, [access]);

  const canAdd = pixelLimit === -1 || configs.length < pixelLimit;
  const hasInvalidRows = configs.some((config) => !config.pixel_id.trim());

  const loadConfig = useCallback(async (rethrow = false) => {
    try {
      const [settingsResponse, accessResponse] = await Promise.all([
        fetch("/api/auth/settings", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/auth/effective-access", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!settingsResponse.ok || !accessResponse.ok) {
        throw new Error("Failed to load");
      }
      const [settingsPayload, accessPayload] = await Promise.all([
        settingsResponse.json(),
        accessResponse.json(),
      ]);
      setConfigs(normalizeConfigs(settingsPayload.data?.tiktok_configs));
      setAccess(accessPayload.data || null);
    } catch (error) {
      if (rethrow) throw error;
      toast.error("بارکردنی ڕێکخستنەکانی TikTok سەرکەوتوو نەبوو");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConfig().finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConfig]);

  useEffect(() => {
    const syncAccess = (event: Event) => {
      const detail = (event as CustomEvent<EffectiveAccessManifest>).detail;
      if (detail) setAccess(detail);
    };
    window.addEventListener("multitree:access-updated", syncAccess);
    return () =>
      window.removeEventListener("multitree:access-updated", syncAccess);
  }, []);

  const updateConfig = (index: number, patch: Partial<PixelConfig>) => {
    setConfigs((current) =>
      current.map((config, configIndex) =>
        configIndex === index ? { ...config, ...patch } : config,
      ),
    );
  };

  const save = async () => {
    if (hasInvalidRows) {
      toast.error("Pixel ID بۆ هەر گرووپێک پێویستە");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "integrations",
          tiktok_configs: configs.map((config) => ({
            id: config.id,
            pixel_id: config.pixel_id.trim(),
            events_token: config.events_token.trim(),
            keep_events_token:
              config.keep_events_token && !config.events_token.trim(),
          })),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Save failed");
      }
      const nextConfigs = normalizeConfigs(payload?.data?.tiktok_configs);
      setConfigs(nextConfigs);
      window.dispatchEvent(
        new CustomEvent("multitree:business-settings-updated", {
          detail: payload?.data,
        }),
      );
      // No `tiktok-settings-updated` broadcast: the dashboard no longer loads a
      // pixel of its own, so there is nothing here to refresh. The public pages
      // read their ids from the server on their next request.
      toast.success("ڕێکخستنەکانی TikTok نوێکرانەوە");
    } catch (error) {
      toast.error("پاشەکەوتکردن سەرکەوتوو نەبوو", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-primary)_18%,transparent)] dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500 dark:[color-scheme:dark]";

  if (loading) {
    return <SkeletonDashboardPage body="form" statCount={0} />;
  }

  return (
    <DashboardSurface>
      <PageHeader
        icon={KeyRound}
        title="پەیوەستکردنی TikTok"
        description="Pixel ID بۆ شوێنکەوتنی وێبگەڕ پێویستە. Events API token دڵخوازە و تەنها کاتێک بەکار دەکەوێت کە دابنرێت."
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-white/5">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            گرووپەکانی Pixel و Events API
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            هەر tokenێک تەنها لەگەڵ Pixel IDی هەمان گرووپ بەکار دەکەوێت.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            canAdd &&
            setConfigs((current) => [
              ...current,
              {
                pixel_id: "",
                events_token: "",
                has_events_token: false,
                keep_events_token: false,
              },
            ])
          }
          disabled={!canAdd}
          className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            borderColor:
              "color-mix(in srgb, var(--theme-primary) 28%, transparent)",
            background:
              "color-mix(in srgb, var(--theme-primary) 10%, transparent)",
            color: "var(--theme-primary)",
          }}
        >
          <Plus className="h-4 w-4" />
          زیادکردنی گرووپ
        </button>
      </div>

      {configs.length === 0 ? (
        <EmptyState
          compact
          icon={CircleOff}
          title="هیچ گرووپێکی TikTok نییە"
          description="گرووپێک زیاد بکە، Pixel ID دابنێ و ئەگەر دەتەوێت گەیاندنی ڕاژەکار چالاک بێت Events API token زیاد بکە."
        />
      ) : (
        <div className="mt-5 space-y-4">
          {configs.map((config, index) => (
            <div
              key={config.id || `new-${index}`}
              className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-2"
            >
              <div className="flex items-center justify-between sm:col-span-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black"
                    style={{
                      background:
                        "color-mix(in srgb, var(--theme-primary) 14%, transparent)",
                      color: "var(--theme-primary)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    گرووپی TikTok
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfigs((current) =>
                      current.filter((_, configIndex) => configIndex !== index),
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label="سڕینەوەی گرووپ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Pixel ID <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  className={inputClass}
                  value={config.pixel_id}
                  onChange={(event) =>
                    updateConfig(index, { pixel_id: event.target.value })
                  }
                  placeholder="Pixel ID بنووسە"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>
                    Events API token{" "}
                    <span className="text-slate-400">(دڵخواز)</span>
                  </span>
                  {config.has_events_token && (
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig(index, {
                          events_token: "",
                          has_events_token: false,
                          keep_events_token: false,
                          token_last_four: null,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                      لابردن
                    </button>
                  )}
                </span>
                <div className="relative">
                  <input
                    type={showTokens[index] ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${inputClass} pr-11`}
                    value={config.events_token}
                    onChange={(event) =>
                      updateConfig(index, {
                        events_token: event.target.value,
                        keep_events_token: false,
                        has_events_token:
                          Boolean(event.target.value) ||
                          Boolean(config.token_last_four),
                      })
                    }
                    placeholder={
                      config.keep_events_token && config.token_last_four
                        ? `••••${config.token_last_four} — tokenێکی نوێ بنووسە بۆ گۆڕین`
                        : "Events API Token"
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowTokens((current) => ({
                        ...current,
                        [index]: !current[index],
                      }))
                    }
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    aria-label={showTokens[index] ? "شاردنەوەی token" : "پیشاندانی token"}
                  >
                    {showTokens[index] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-400">
                  {config.keep_events_token
                    ? "tokenی پاشەکەوتکراو دەپارێزرێت تا tokenێکی نوێ بنووسیت یان لایببەیت."
                    : "بە بەتاڵی جێبهێڵە بۆ ئەوەی Events API چالاک نەبێت."}
                </p>
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-5 dark:border-white/5">
        <button
          type="button"
          onClick={() => void save()}
          aria-busy={saving}
          disabled={saving || hasInvalidRows}
          className="flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--theme-css)", color: "var(--theme-ink)" }}
        >
          {saving ? (
            <MotionSpinner><Loader2 className="h-4 w-4 "  /></MotionSpinner>
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
        </button>
      </div>
    </DashboardSurface>
  );
}
