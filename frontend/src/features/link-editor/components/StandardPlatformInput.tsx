"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { modalInputClass } from "../modal-input-styles";

export const PHONE_PLATFORMS = ["whatsapp", "phone", "viber"] as const;

export function isPhonePlatform(platform: string): boolean {
  return PHONE_PLATFORMS.includes(
    platform as (typeof PHONE_PLATFORMS)[number],
  );
}

export function normalizeNationalPhoneInput(
  value: string,
  countryCode = "964",
): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith(countryCode) && digits.length > countryCode.length) {
    digits = digits.slice(countryCode.length);
  }
  return digits;
}

export function platformInputPlaceholder(platform: string): string {
  if (isPhonePlatform(platform)) return "0750 123 4567";
  const placeholders: Record<string, string> = {
    gps: "36.191, 44.009",
    telegram: "@username یان t.me/username",
    instagram: "@username یان instagram.com/username",
    tiktok: "@username یان tiktok.com/@username",
    snapchat: "username یان snapchat.com/add/username",
    twitter: "@username یان x.com/username",
    x: "@username یان x.com/username",
    facebook: "username یان facebook.com/username",
    linkedin: "username یان linkedin.com/in/username",
    youtube: "@username یان youtube.com/@username",
    discord: "ناسنامەی بەکارهێنەر یان discord.gg/...",
    email: "name@business.com",
    website: "example.com",
    custom: "https://example.com",
  };
  return placeholders[platform] || "بەهاکە بنووسە";
}

export interface StandardPlatformInputProps {
  platform: string;
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (countryCode: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  inputClassName?: string;
  countryClassName?: string;
  showError?: boolean;
  showClear?: boolean;
  disabled?: boolean;
}

export function StandardPlatformInput({
  platform,
  value,
  onChange,
  countryCode = "964",
  onCountryCodeChange,
  onBlur,
  error,
  placeholder,
  inputClassName = "",
  countryClassName = "",
  showError = false,
  showClear = false,
  disabled = false,
}: StandardPlatformInputProps) {
  const [touched, setTouched] = useState(false);
  const phoneBased = isPhonePlatform(platform);
  const errorVisible = touched && Boolean(error);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(
        phoneBased
          ? normalizeNationalPhoneInput(event.target.value, countryCode)
          : event.target.value,
      );
    },
    [countryCode, onChange, phoneBased],
  );
  const handleCountryChange = useCallback(
    (nextCountryCode: string) => {
      onChange(normalizeNationalPhoneInput(value, countryCode));
      onCountryCodeChange?.(nextCountryCode);
    },
    [countryCode, onChange, onCountryCodeChange, value],
  );

  return (
    <div className="w-full">
      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {phoneBased && (
          <CountrySelector
            value={countryCode || "964"}
            onChange={handleCountryChange}
            className={`h-11 shrink-0 ${countryClassName}`}
          />
        )}
        <div className="relative min-w-0 flex-1">
          <input
            type={platform === "email" ? "email" : "text"}
            inputMode={phoneBased ? "tel" : undefined}
            dir="ltr"
            value={
              phoneBased
                ? normalizeNationalPhoneInput(value, countryCode)
                : value
            }
            onChange={handleChange}
            onBlur={() => {
              setTouched(true);
              onBlur?.();
            }}
            placeholder={placeholder || platformInputPlaceholder(platform)}
            className={modalInputClass(
              errorVisible,
              `h-11 min-w-0 flex-1 py-0 md:rounded-xl md:px-4 md:py-0 text-xs sm:text-sm ${inputClassName}`,
            )}
            style={showClear && value ? { paddingRight: "2.75rem" } : undefined}
            aria-invalid={errorVisible}
            disabled={disabled}
          />
          {showClear && value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setTouched(false);
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-white/10"
              aria-label="سڕینەوەی بەها"
              title="سڕینەوە"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {showError && errorVisible && error && (
        <p className="mt-1.5 text-[10px] font-semibold leading-4 text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
