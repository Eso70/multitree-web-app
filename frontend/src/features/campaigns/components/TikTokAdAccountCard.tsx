import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Unlink,
  Link2,
  Wallet,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { TbBrandTiktok } from "react-icons/tb";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import type { TikTokAdAccount } from "../types";

interface TikTokAdAccountCardProps {
  account: TikTokAdAccount | null;
  onConnectClick: () => void;
  onDisconnectClick: () => void;
  onSyncClick: () => void;
  isSyncing?: boolean;
}

export function TikTokAdAccountCard({
  account,
  onConnectClick,
  onDisconnectClick,
  onSyncClick,
  isSyncing = false,
}: TikTokAdAccountCardProps) {
  const isConnected = account && account.status === "connected";

  if (!isConnected) {
    return (
      <DashboardSurface className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-black dark:bg-white/10 text-white flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
              <TbBrandTiktok className="size-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  بەستنەوەی هەژماری ڕیکلامی تیکتۆک
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="size-3.5" />
                  نەبەستراوەتەوە
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                هەژماری ڕیکلامی تیکتۆک بە وێبسایتەکەتەوە ببەستەرەوە بۆ ئەوەی ڕاستەوخۆ کەمپەینەکانی ڕیکلام دروست بکەیت و بینەران ڕەوانەی لاپەڕەی لینکەکانت بکەیت بە ئامار و تۆماری ورد.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onConnectClick}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95 shrink-0"
          >
            <Link2 className="size-4" />
            بەستنەوە بە تیکتۆک
          </button>
        </div>
      </DashboardSurface>
    );
  }

  return (
    <DashboardSurface className="p-6 md:p-8 overflow-hidden relative">
      {/* Decorative subtle background gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pink-500/5 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-start sm:items-center gap-4">
          <div className="size-14 rounded-2xl bg-black dark:bg-white/10 text-white flex items-center justify-center shrink-0 shadow-md">
            <TbBrandTiktok className="size-8" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {account.advertiserName}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="size-3.5" />
                چالاک و بەستراوەتەوە
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-mono">
                {account.accountType}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Advertiser ID: <span className="text-slate-700 dark:text-slate-300 font-bold">{account.advertiserId}</span></span>
              <span>•</span>
              <span>کاتی ڕێکخستن: {account.timezone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            type="button"
            onClick={onSyncClick}
            disabled={isSyncing}
            title="نوێکردنەوەی داتای ئەکاونت"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-slate-900 dark:text-white" : ""}`} />
            {isSyncing ? "نوێدەکرێتەوە..." : "نوێکردنەوە"}
          </button>

          <button
            type="button"
            onClick={onDisconnectClick}
            title="پچڕاندنی هەژمار"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <Unlink className="size-3.5" />
            پچڕاندن
          </button>
        </div>
      </div>

      {/* Account Info Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Wallet className="size-4 text-emerald-500" />
            باڵانسی ئەکاونت (Balance)
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            ${(account.balance ?? 0).toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-500 font-sans">{account.currency}</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Layers className="size-4 text-sky-500" />
            پیکسڵی بەستراوە (Connected Pixel)
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {account.connectedPixelName || "Main Business Pixel"}
            </p>
            <span className="text-xs font-mono text-slate-500">
              {account.connectedPixelId}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="size-4 text-indigo-500" />
            سنووری خەرجی ڕۆژانە (Daily Cap)
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            ${(account.dailySpendCap ?? 0).toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-500 font-sans">لە ڕۆژێکدا</span>
          </p>
        </div>
      </div>
    </DashboardSurface>
  );
}
