"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { ModalFooterActions } from "@/components/shared/ModalFooterActions";
import { OBJECTIVE_LABELS } from "../mock-data";
import type { CampaignObjective, TikTokCampaign } from "../types";

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (campaign: TikTokCampaign) => void;
  sponsorKrdTheme?: boolean;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  onCreate,
  sponsorKrdTheme = false,
}: CreateCampaignModalProps) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("TRAFFIC");
  const [dailyBudget, setDailyBudget] = useState(25);
  const [destinationSlug, setDestinationSlug] = useState("main");
  const [location, setLocation] = useState("هەولێر، سلێمانی، دهۆک");
  const [callToAction, setCallToAction] = useState("سەردانی وێبسایت بکە");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const newCampaign: TikTokCampaign = {
        id: `camp-${Date.now()}`,
        name: name.trim(),
        objective,
        status: "active",
        dailyBudget: Number(dailyBudget) || 20,
        totalSpent: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        destinationPage: {
          id: `lt-${Date.now()}`,
          title: destinationSlug === "main" ? "لاپەڕەی سەرەکی براند" : "لاپەڕەی تایبەت",
          slug: destinationSlug,
          type: "linktree",
        },
        targetAudience: {
          location: location.trim() || "سەرجەم هەرێمی کوردستان",
          gender: "ALL",
          ageGroups: ["18-24", "25-34"],
          languages: ["Kurdish", "Arabic"],
        },
        callToAction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onCreate(newCampaign);
      setIsSubmitting(false);
      setName("");
      onClose();
    }, 600);
  };

  return (
    <ManagementModal
      isOpen={isOpen}
      onClose={onClose}
      sponsorKrdTheme={sponsorKrdTheme}
      title="دروستکردنی کەمپەینی نوێ لە TikTok"
      description="ڕیکلامی نوێ دابنێ و بینەرانی تیکتۆک ڕاستەوخۆ ڕەوانەی لاپەڕەی دیاریکراوی خۆت بکە"
      wide
      footer={
        <ModalFooterActions
          submitLabel="دروستکردن و دەستپێکردنی کەمپەین"
          submittingLabel="دروست دەکرێت..."
          submitDisabled={!name.trim() || dailyBudget <= 0}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      }
    >
      <div className="space-y-5">
        {/* Campaign Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            ناوی کەمپەین (Campaign Name) *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="بۆ نموونە: کەمپەینی نەورۆز ٢٠٢٦"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>

        {/* Objective Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            ئامانجی کەمپەین (Campaign Objective)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(OBJECTIVE_LABELS) as CampaignObjective[]).map((key) => {
              const info = OBJECTIVE_LABELS[key];
              const isSelected = objective === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setObjective(key)}
                  className={`flex flex-col text-right p-3.5 rounded-xl border transition-all text-sm ${
                    isSelected
                      ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-white/10 shadow-sm"
                      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
                >
                  <span className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    {info.label}
                    {isSelected && <Check className="size-4 text-emerald-500" />}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Destination & Budget Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              لاپەڕەی ئامانج (Destination Page)
            </label>
            <select
              value={destinationSlug}
              onChange={(e) => setDestinationSlug(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            >
              <option value="main" className="dark:bg-slate-900">لاپەڕەی سەرەکی براند (/main)</option>
              <option value="offers" className="dark:bg-slate-900">داشکاندنەکانی ئەم مانگە (/offers)</option>
              <option value="b2b" className="dark:bg-slate-900">خزمەتگوزاری بازرگانی (/b2b)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              بودجەی ڕۆژانە (Daily Budget) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">
                $
              </span>
              <input
                type="number"
                min={5}
                max={5000}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              کەمترین بودجەی پێشنیارکراوی ڕۆژانە لە تیکتۆک $10 ە.
            </span>
          </div>
        </div>

        {/* Audience Location & CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ناوچەی نیشانکراو (Target Location)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="هەولێر، سلێمانی، دهۆک..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              دەقی دوگمەی بانگەواز (Call to Action)
            </label>
            <select
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            >
              <option value="سەردانی وێبسایت بکە" className="dark:bg-slate-900">سەردانی وێبسایت بکە (Learn More)</option>
              <option value="ئێستا داوا بکە" className="dark:bg-slate-900">ئێستا داوا بکە (Order Now)</option>
              <option value="پەیوەندیمان پێوە بکە" className="dark:bg-slate-900">پەیوەندیمان پێوە بکە (Contact Us)</option>
              <option value="داشکاندنەکە وەربگرە" className="dark:bg-slate-900">داشکاندنەکە وەربگرە (Get Offer)</option>
            </select>
          </div>
        </div>
      </div>
    </ManagementModal>
  );
}
