"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Play,
  Pause,
  BarChart2,
  Trash2,
  Clock,
  Radio,
} from "lucide-react";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { EmptyState } from "@/components/shared/EmptyState";
import { OBJECTIVE_LABELS } from "../mock-data";
import type { CampaignStatus, TikTokCampaign } from "../types";

interface TikTokCampaignsTableProps {
  campaigns: TikTokCampaign[];
  onToggleStatus: (campaignId: string) => void;
  onViewDetails: (campaign: TikTokCampaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
}

export function TikTokCampaignsTable({
  campaigns,
  onToggleStatus,
  onViewDetails,
  onDeleteCampaign,
}: TikTokCampaignsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CampaignStatus>("ALL");

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      const matchesSearch =
        camp.name.toLowerCase().includes(search.toLowerCase()) ||
        camp.destinationPage.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ? true : camp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            چالاکە
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
            ڕاگیراوە
          </span>
        );
      case "review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="size-3" />
            لە ژێر پێداچوونەوەدایە
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            تەواوبووە
          </span>
        );
    }
  };

  return (
    <DashboardSurface className="p-0 overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="size-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="گەڕان بەپێی ناوی کەمپەین یان لاپەڕە..."
            className="w-full pr-10 pl-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 self-end sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "ALL", label: "هەمووی" },
              { id: "active", label: "چالاک" },
              { id: "paused", label: "ڕاگیراو" },
              { id: "review", label: "پێداچوونەوە" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === filter.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table Content */}
      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="هیچ کەمپەینێک نەدۆزرایەوە"
          description="هیچ کەمپەینێک لەگەڵ مەرجەکانی گەڕان یان فلتەرەکاندا یەکناگرێتەوە."
          compact
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50/75 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3.5">ناوی کەمپەین و ئامانج</th>
                <th className="px-4 py-3.5">دۆخ</th>
                <th className="px-4 py-3.5">بودجە / خەرجکراو</th>
                <th className="px-4 py-3.5">بینین (Impr.)</th>
                <th className="px-4 py-3.5">کلیک و CTR</th>
                <th className="px-4 py-3.5">گۆڕین (Conv.)</th>
                <th className="px-5 py-3.5 text-left">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filteredCampaigns.map((camp) => {
                const objectiveInfo = OBJECTIVE_LABELS[camp.objective] || {
                  label: camp.objective,
                };
                return (
                  <tr
                    key={camp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Name & Target Page */}
                    <td className="px-5 py-4">
                      <div className="space-y-1 max-w-xs sm:max-w-sm">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {camp.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[11px] font-mono">
                            {objectiveInfo.label.split("(")[0].trim()}
                          </span>
                          <span>•</span>
                          <span className="truncate">
                            پەیج: /{camp.destinationPage.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(camp.status)}
                    </td>

                    {/* Budget & Spend */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ${camp.dailyBudget.toFixed(2)}/ڕۆژ
                        </span>
                        <p className="text-xs text-slate-500">
                          خەرجکراو: ${camp.totalSpent.toFixed(2)}
                        </p>
                      </div>
                    </td>

                    {/* Impressions */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                      {camp.impressions.toLocaleString()}
                    </td>

                    {/* Clicks & CTR */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {camp.clicks.toLocaleString()}
                        </span>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {camp.ctr > 0 ? `${camp.ctr}% CTR` : "-"}
                        </p>
                      </div>
                    </td>

                    {/* Conversions */}
                    <td className="px-4 py-4 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                      <span className="font-bold">{camp.conversions}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-left">
                      <div className="inline-flex items-center gap-1.5">
                        {camp.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(camp.id)}
                            title="ڕاگرتنی کەمپەین"
                            className="p-2 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                          >
                            <Pause className="size-4" />
                          </button>
                        ) : camp.status === "paused" ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(camp.id)}
                            title="دەستپێکردنەوەی کەمپەین"
                            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
                          >
                            <Play className="size-4" />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => onViewDetails(camp)}
                          title="بینینی وردەکاری و ئامار"
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                          <BarChart2 className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteCampaign(camp.id)}
                          title="سڕینەوەی کەمپەین"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSurface>
  );
}
