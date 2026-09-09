"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  CircleOff,
  Copy,
  Globe2,
  Link2,
  Megaphone,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tooltip } from "@/components/shared/Tooltip";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { ConnectTikTokAdModal } from "@/features/campaigns/components/ConnectTikTokAdModal";
import type { TikTokAdAccount } from "@/features/campaigns/types";

export function PlatformTikTokAdAccountTab() {
  const localStorageKey = "platform_tiktok_ad_account";
  const eventName = "platform:tiktok-ad-account-updated";

  const [account, setAccount] = useState<TikTokAdAccount | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const saveAccount = useCallback(
    (nextAccount: TikTokAdAccount | null) => {
      setAccount(nextAccount);
      if (nextAccount) {
        localStorage.setItem(localStorageKey, JSON.stringify(nextAccount));
      } else {
        localStorage.removeItem(localStorageKey);
      }
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: nextAccount,
        }),
      );
    },
    [eventName, localStorageKey],
  );

  // Initialize redirect URL and check query parameters on callback
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const authCode = params.get("auth_code");
      const connected = params.get("connected");
      const advId = params.get("adv_id");
      const advName = params.get("adv_name");
      const error = params.get("error");

      if (error) {
        toast.error("هەڵە لە بەستنەوەی TikTok Ads", { description: error });
        window.history.replaceState({}, "", window.location.pathname);
      } else if (connected || authCode) {
        const newAccount: TikTokAdAccount = {
          id: `tt-acc-${Date.now()}`,
          advertiserId: advId || "ADV-TIKTOK",
          advertiserName:
            advName ||
            ("هەژماری ڕیکلامی پلاتفۆرم"),
          currency: params.get("currency") || "USD",
          timezone: params.get("timezone") || "Asia/Baghdad",
          status: "connected",
          lastSyncedAt: new Date().toISOString(),
          accountType: "AUCTION",
        };
        saveAccount(newAccount);
        toast.success("هەژماری TikTok Ads بە سەرکەوتوویی بەسترایەوە!");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [saveAccount]);

  // Load account from storage without mock fallback
  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            parsed?.advertiserName?.includes("Sponsor.krd") ||
            parsed?.id === "tt-acc-10928"
          ) {
            localStorage.removeItem(localStorageKey);
            setAccount(null);
          } else {
            setAccount(parsed);
          }
        } else {
          setAccount(null);
        }
      } catch {
        setAccount(null);
      }
    };

    loadFromStorage();

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<TikTokAdAccount | null>;
      if (customEvent.detail !== undefined) {
        setAccount(customEvent.detail);
      } else {
        loadFromStorage();
      }
    };

    window.addEventListener(eventName, handleUpdated);
    return () => window.removeEventListener(eventName, handleUpdated);
  }, [eventName, localStorageKey]);

  const handleCopyAdvertiserId = () => {
    if (!account?.advertiserId) return;
    void navigator.clipboard.writeText(account.advertiserId);
    setCopiedId(true);
    toast.success("Advertiser ID کۆپیکرا");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSyncConnection = () => {
    if (isSyncing || !account) return;
    setIsSyncing(true);
    setTimeout(() => {
      const updated: TikTokAdAccount = {
        ...account,
        lastSyncedAt: new Date().toISOString(),
      };
      saveAccount(updated);
      setIsSyncing(false);
      toast.success("پەیوەندیی هەژمار نوێکرایەوە");
    }, 600);
  };

  const handleDisconnectConfirm = () => {
    saveAccount(null);
    setIsDisconnectModalOpen(false);
    toast.info("هەژماری TikTok Ads پچڕێنرا");
  };

  const isConnected = account && account.status === "connected";

  return (
    <DashboardSurface>
      {/* Consistent Page Header matching other tabs */}
      <PageHeader
        icon={Megaphone}
        title="هەژماری ڕیکلامی تیکتۆک"
        description={
          "بەستنەوە و بەڕێوەبردنی هەژماری ڕیکلامی تیکتۆک بۆ بەڕێوەبردنی کەمپەینەکانی پلاتفۆرم."
        }
        action={
          isConnected ? (
            <Tooltip content="نوێکردنەوەی دۆخی هەژمار" side="bottom">
              <button
                type="button"
                onClick={handleSyncConnection}
                disabled={isSyncing}
                aria-busy={isSyncing}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200 cursor-pointer"
                aria-label="نوێکردنەوە"
              >
                <MotionSpinner active={isSyncing}>
                  <RefreshCw className="h-4 w-4" />
                </MotionSpinner>
              </button>
            </Tooltip>
          ) : undefined
        }
      />

      {/* Top Divider Control Bar: Strictly 1 Ad Account Supported */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isConnected ? "زانیارییەکانی هەژماری بەستراوە" : "بەستنەوەی هەژمار"}
            </p>
            <span
              className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold"
              style={{
                borderColor: "color-mix(in srgb, var(--sponsor-krd-accent) 28%, transparent)",
                background: "color-mix(in srgb, var(--sponsor-krd-accent) 10%, transparent)",
                color: "var(--sponsor-krd-accent)",
              }}
            >
              ١ لە ١ هەژمار
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isConnected
              ? "تەنها ١ هەژماری ڕیکلام بەستراوەتەوە (سنووری دیاریکراو: تەنها ١ هەژمار)."
              : "تەنها ١ هەژماری ڕیکلامی تیکتۆک دەتوانرێت بۆ پلاتفۆرم ببەسترێتەوە."}
          </p>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 cursor-pointer"
            >
              گۆڕینی هەژمار
            </button>
            <Tooltip content="پچڕاندنی پەیوەندی ئەم هەژمارە" side="bottom">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/70 px-4 text-xs font-bold text-rose-600 shadow-sm transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <Unlink className="h-3.5 w-3.5" />
                پچڕاندن
              </button>
            </Tooltip>
          </div>
        ) : (
          <Tooltip content="بەستنەوەی ١ هەژماری ڕیکلام لە ڕێگەی مۆدال" side="bottom">
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className={
                "sa-gradient sa-gradient-hover flex h-10 shrink-0 items-center gap-2 rounded-xl px-5 text-xs font-black text-white shadow-sm transition cursor-pointer"
              }
            >
              <Link2 className="h-4 w-4" />
              بەستنەوە بە TikTok Ads
            </button>
          </Tooltip>
        )}
      </div>

      {/* Main Body */}
      {isConnected ? (
        /* CONNECTED STATE: RAW CLEAN AD ACCOUNT CARD */
        <div className="mt-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: "color-mix(in srgb, var(--sponsor-krd-accent) 12%, transparent)",
                    color: "var(--sponsor-krd-accent)",
                  }}
                >
                  <Megaphone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {account.advertiserName}
                    </h4>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      چالاکە
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>Advertiser ID:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {account.advertiserId}
                    </span>
                    <Tooltip content={copiedId ? "کۆپیکرا!" : "کۆپیکردنی ID"} side="top">
                      <button
                        type="button"
                        onClick={handleCopyAdvertiserId}
                        className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {copiedId ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Account Metadata: Currency & Timezone */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {account.currency || "USD"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  <Globe2 className="h-3.5 w-3.5 opacity-70" />
                  {account.timezone || "Asia/Baghdad"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DISCONNECTED STATE: EMPTY STATE WITH MODAL TRIGGER */
        <div className="mt-5 flex flex-col items-center pb-8">
          <EmptyState
            compact
            icon={CircleOff}
            title="هیچ هەژمارێکی ڕیکلامی تیکتۆک نەبەستراوەتەوە"
            description="هەژماری ڕیکلامەکەت ببەستەرەوە بۆ بەڕێوەبردنی ڕیکلام و کەمپەینەکان. تەنها ١ هەژمار پشتیوانی دەکرێت."
          />
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className={
              "mt-1 sa-gradient sa-gradient-hover flex h-10 shrink-0 items-center gap-2 rounded-xl px-5 text-xs font-black text-white shadow-sm transition cursor-pointer"
            }
          >
            <Link2 className="h-4 w-4" />
            بەستنەوە بە تیکتۆک
          </button>
        </div>
      )}

      {/* Shared Reusable Modal for Connecting / Switching the 1 Ad Account */}
      <ConnectTikTokAdModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        sponsorKrdTheme
        onConnect={(newAcc) => {
          saveAccount(newAcc);
          toast.success("هەژماری ڕیکلام بە سەرکەوتوویی بەسترایەوە");
        }}
        initialAccount={account}
      />

      {/* Shared Reusable Disconnect Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        onConfirm={async () => {
          handleDisconnectConfirm();
        }}
        title="پچڕاندنی هەژماری ڕیکلامی تیکتۆک"
        confirmLabel="پچڕاندن"
        message={
          "ئایا دڵنیایت لە پچڕاندنی پەیوەندیی ئەم هەژمارە لە پلاتفۆرم؟ پچڕاندنی ئەم هەژمارە پەیوەندی نێوان پلاتفۆرم و TikTok Marketing API دەپچڕێنێت."
        }
        tone="danger"
      />
    </DashboardSurface>
  );
}
