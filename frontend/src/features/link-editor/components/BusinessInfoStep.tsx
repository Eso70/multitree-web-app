"use client";

import { memo, useState, useMemo } from "react";
import { ColorGradientModal } from "../ColorGradientModal";
import { TikTokConfigModal } from "../TikTokConfigModal";
import { modalInputClass } from "../modal-input-styles";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { BrandAssetStack } from "./BrandAssetStack";
import { BusinessOwnerIdentityFields } from "./BusinessOwnerIdentityFields";

// Exported validation helpers

/**
 * Validates business name: must be at least 2 characters after trimming.
 * Returns a Kurdish error message if invalid, or undefined if valid.
 */
export function validateBusinessName(name: string): string | undefined {
  if (name.trim().length < 2) {
    return "ناو دەبێت لانی کەم ٢ پیت بێت";
  }
  return undefined;
}

/**
 * Validates subdomain: must match /^[a-z0-9-]+$/.
 * Returns a Kurdish error message if invalid, or undefined if valid.
 */
export function validateSubdomain(subdomain: string): string | undefined {
  if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
    return "سەب دۆمەین دەبێت تەنها پیتی بچووک، ژمارە و هێڵ بێت";
  }
  return undefined;
}

// Props

export interface BusinessInfoStepProps {
  name: string;
  username: string;
  subdomain: string;
  phone: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  subscriptionPlanId: string;
  subscriptionPlans: Array<{
    id: string;
    name: string;
    permissionProfileName: string;
  }>;
  subscriptionPlansLoading: boolean;
  tiktokConfigs: Array<{ pixel_id: string; events_token: string }>;
  websiteColor: string;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  onUsernameChange: (value: string) => void;
  onSubdomainChange: (value: string) => void;
  onSubdomainBlur: () => void;
  onGenerateSubdomain?: () => void;
  onPhoneChange: (value: string) => void;
  onSubscriptionPlanChange: (value: string) => void;
  onTikTokConfigsChange: (
    value: Array<{ pixel_id: string; events_token: string }>,
  ) => void;
  onWebsiteColorChange: (value: string) => void;
  onWebsiteColorBlur: () => void;
  errors: {
    name?: string;
    username?: string;
    subdomain?: string;
    phone?: string;
    websiteColor?: string;
  };
  touched: {
    name?: boolean;
    username?: boolean;
    subdomain?: boolean;
    phone?: boolean;
    websiteColor?: boolean;
  };
  isEditMode?: boolean;
  onLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDefaultAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFaviconChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  logoPreview: string | null;
  faviconPreview: string | null;
  defaultAvatarPreview: string | null;
}

export const BusinessInfoStep = memo(function BusinessInfoStep({
  name,
  username,
  subdomain,
  phone,
  ownerName,
  ownerEmail,
  subscriptionPlanId,
  subscriptionPlans,
  subscriptionPlansLoading,
  tiktokConfigs,
  websiteColor,
  onNameChange,
  onNameBlur,
  onUsernameChange,
  onSubdomainChange,
  onSubdomainBlur,
  onGenerateSubdomain,
  onPhoneChange,
  onSubscriptionPlanChange,
  onTikTokConfigsChange,
  onWebsiteColorChange,
  onWebsiteColorBlur,
  errors,
  touched,
  onLogoChange,
  onDefaultAvatarChange,
  onFaviconChange,
  logoPreview,
  faviconPreview,
  defaultAvatarPreview,
}: BusinessInfoStepProps) {
  const [showGradientPicker, setShowGradientPicker] = useState(false);

  const [showTikTokModal, setShowTikTokModal] = useState(false);

  const filledTikTokConfigs = useMemo(
    () =>
      tiktokConfigs.filter(
        (item) => item.pixel_id.trim() || item.events_token.trim(),
      ),
    [tiktokConfigs],
  );

  return (
    <div className="space-y-6 min-h-[50vh]">
      <BrandAssetStack
        logo={logoPreview}
        favicon={faviconPreview}
        defaultAvatar={defaultAvatarPreview}
        websiteColor={websiteColor}
        onLogoChange={onLogoChange}
        onFaviconChange={onFaviconChange}
        onDefaultAvatarChange={onDefaultAvatarChange}
        onChooseColor={() => {
          onWebsiteColorBlur();
          setShowGradientPicker(true);
        }}
      />

      <div className="space-y-3">
        <BusinessOwnerIdentityFields
          ownerName={ownerName}
          ownerEmail={ownerEmail}
        />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="business-name"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              ناوی بزنس <RequiredMark />
            </label>
            <input
              id="business-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
              required
              className={modalInputClass(!!(errors.name && touched.name))}
              placeholder="ناوی بزنس بنووسە"
            />
            {errors.name && touched.name && (
              <p className="mt-1 text-xs text-red-500 font-kurdish">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="business-username"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              ناوی بەکارهێنەر <RequiredMark />
            </label>
            <input
              id="business-username"
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              onBlur={() => onUsernameChange(username)}
              required
              className={modalInputClass(
                !!(errors.username && touched.username),
              )}
              placeholder="ناوی بەکارهێنەر"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="business-subdomain"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              سەب دۆمەین
              <RequiredMark />
            </label>
            <div className="relative">
              <input
                id="business-subdomain"
                type="text"
                value={subdomain}
                onChange={(e) => onSubdomainChange(e.target.value)}
                onBlur={onSubdomainBlur}
                className={modalInputClass(
                  !!(errors.subdomain && touched.subdomain),
                  "pr-11",
                )}
                placeholder="سەب دۆمەین بنووسە"
                required
              />
              <button
                type="button"
                onClick={onGenerateSubdomain}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
                aria-label="Generate random subdomain"
                title="Generate random subdomain"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 2l-6 6" />
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22l6-6" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            </div>
            {errors.subdomain && touched.subdomain && (
              <p className="mt-1 text-xs text-red-500 font-kurdish">
                {errors.subdomain}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="business-phone"
              className="block text-xs sm:text-sm font-medium text-gray-700"
            >
              ژمارەی مۆبایل
              <RequiredMark />
            </label>
            <input
              id="business-phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              className={modalInputClass(!!(errors.phone && touched.phone))}
              placeholder="ژمارەی مۆبایل"
            />
            {errors.phone && touched.phone && (
              <p className="mt-1 text-xs text-red-500 font-kurdish">
                {errors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              ڕێکخستنی تیکتۆک <RequiredMark />
            </label>
            <button
              type="button"
              onClick={() => setShowTikTokModal(true)}
              className="modal-standard-input flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:border-slate-400 focus:ring-slate-200/70 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm dark:border-white/10 dark:bg-[#161B22] dark:text-gray-100 dark:hover:border-white/20 dark:hover:bg-white/5"
            >
              <span>
                {filledTikTokConfigs.length > 0
                  ? `${filledTikTokConfigs.length} گرووپی تیکتۆک`
                  : "زیادکردنی پیکسڵ و Events API"}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {filledTikTokConfigs.length}/3
              </span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">
              پلانی بەشداربوون
            </label>
            <CustomSelect
              label="پلانی بەشداربوون"
              value={subscriptionPlanId}
              options={
                subscriptionPlansLoading
                  ? [{ value: "", label: "بارکردنی پلانەکان..." }]
                  : subscriptionPlans.length
                    ? subscriptionPlans.map((plan) => ({
                        value: plan.id,
                        label: plan.name,
                      }))
                    : [{ value: "", label: "هیچ پلانێکی چالاک نییە" }]
              }
              onChange={onSubscriptionPlanChange}
              disabled={subscriptionPlansLoading || !subscriptionPlans.length}
              hideLabel
              triggerClassName="h-auto rounded-lg sm:rounded-xl border-gray-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 dark:bg-[#161B22] dark:text-gray-100 dark:border-white/10 dark:hover:border-white/20"
            />
          </div>
        </div>

        {errors.websiteColor && touched.websiteColor && (
          <p className="text-xs text-red-500 -mt-2 text-center font-kurdish">
            {errors.websiteColor}
          </p>
        )}
      </div>

      <ColorGradientModal
        isOpen={showGradientPicker}
        value={websiteColor}
        onChange={onWebsiteColorChange}
        onClose={() => setShowGradientPicker(false)}
        solidFallback="#000000"
        gradientFallback="#0066ff"
      />

      <TikTokConfigModal
        isOpen={showTikTokModal}
        configs={tiktokConfigs}
        onChange={onTikTokConfigsChange}
        onClose={() => setShowTikTokModal(false)}
      />
    </div>
  );
});

BusinessInfoStep.displayName = "BusinessInfoStep";
