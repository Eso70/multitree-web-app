"use client";

import {
  Eye,
  MousePointerClick,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { OBJECTIVE_LABELS } from "../mock-data";
import type { TikTokCampaign } from "../types";

interface CampaignDetailsModalProps {
  campaign: TikTokCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  sponsorKrdTheme?: boolean;
}

export function CampaignDetailsModal({
  campaign,
  isOpen,
  onClose,
  sponsorKrdTheme = false,
}: CampaignDetailsModalProps) {
  if (!campaign) return null;

  const objectiveInfo = OBJECTIVE_LABELS[campaign.objective] || {
    label: campaign.objective,
    description: "",
  };

  return (
    <ManagementModal
      isOpen={isOpen}
      onClose={onClose}
      sponsorKrdTheme={sponsorKrdTheme}
      title={campaign.name}
      description={`وردەکاری ئەنجام و زانیارییەکانی کەمپەین لە تیکتۆک`}
      wide
      footer={
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-white font-semibold text-sm transition-colors"
          >
            داخستن
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Eye className="size-3.5 text-sky-500" />
              بینین (Impressions)
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {campaign.impressions.toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MousePointerClick className="size-3.5 text-emerald-500" />
              کلیک (Clicks)
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {campaign.clicks.toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-400 font-mono block">
              CTR: {campaign.ctr}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <DollarSign className="size-3.5 text-amber-500" />
              خەرجی گشتی (Spent)
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              ${campaign.totalSpent.toFixed(2)}
            </p>
            <span className="text-[11px] text-slate-400 font-mono block">
              CPC: ${campaign.cpc.toFixed(3)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <TrendingUp className="size-3.5 text-indigo-500" />
              گۆڕین (Conversions)
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {campaign.conversions.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Campaign Configuration Summary */}
        <div className="rounded-xl border border-slate-200/80 dark:border-white/10 p-4 space-y-3 bg-slate-50/50 dark:bg-white/[0.02]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            ڕێکخستنەکانی کەمپەین
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">ئامانج:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {objectiveInfo.label}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">بودجەی ڕۆژانە:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                ${campaign.dailyBudget.toFixed(2)} / ڕۆژ
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">پەیجی ئامانج:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                /{campaign.destinationPage.slug} ({campaign.destinationPage.title})
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">دوگمەی بانگەواز:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {campaign.callToAction}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">ناوچەی نیشانکراو:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {campaign.targetAudience.location}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">ڕێکەوتی دەستپێکردن:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ManagementModal>
  );
}
