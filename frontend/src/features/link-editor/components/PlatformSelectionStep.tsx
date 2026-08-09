"use client";

import { memo, useMemo } from "react";
import { Check } from "lucide-react";
import { SOCIAL_PLATFORMS } from "../modal-constants";
import type { SocialLink } from "@/features/link-editor/types";
import { PlatformBadge } from "@/lib/brand/PlatformVisuals";

interface PlatformSelectionStepProps {
  socialLinks: SocialLink[];
  error?: string;
  touched?: boolean;
  onTogglePlatform: (platformId: string) => void;
}

// Memoized platform button component
const PlatformButton = memo(
  function PlatformButton({
    platform,
    isSelected,
    onToggle,
  }: {
    platform: (typeof SOCIAL_PLATFORMS)[0];
    isSelected: boolean;
    onToggle: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSelected}
        className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
          isSelected
            ? "scale-[1.02] shadow-sm ring-2 ring-[color:var(--theme-primary)]/15"
            : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
        }`}
        style={
          isSelected
            ? {
                borderColor: "var(--theme-primary, #64748b)",
                backgroundColor:
                  "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
              }
            : undefined
        }
      >
        {isSelected && (
          <span
            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ background: "var(--theme-primary, #64748b)" }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
        {/* Fixed box so every platform tile is the same size, whether the brand is
          a glyph on a fill or a full-color mark that fills the chip itself. */}
        <PlatformBadge
          platform={platform.id}
          className="h-12 w-12 rounded-lg"
          iconClassName="h-6 w-6"
        />
        <span className="text-xs font-medium text-gray-900">
          {platform.name}
        </span>
      </button>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.platform.id === nextProps.platform.id
    );
  },
);

PlatformButton.displayName = "PlatformButton";

export const PlatformSelectionStep = memo(function PlatformSelectionStep({
  socialLinks,
  error,
  touched,
  onTogglePlatform,
}: PlatformSelectionStepProps) {
  const selectedPlatformsMap = useMemo(() => {
    return new Set(socialLinks.map((l) => l.platform));
  }, [socialLinks]);
  const selectedPlatformOptions = useMemo(
    () =>
      SOCIAL_PLATFORMS.filter((platform) =>
        selectedPlatformsMap.has(platform.id),
      ),
    [selectedPlatformsMap],
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs sm:text-sm text-gray-600 text-center">
        پلاتفۆڕمەکان هەڵبژێرە
      </p>
      {selectedPlatformOptions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">
            {selectedPlatformOptions.length} پلاتفۆڕم هەڵبژێردراوە
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedPlatformOptions.map((platform) => (
              <span
                key={platform.id}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {platform.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {SOCIAL_PLATFORMS.map((platform) => (
          <PlatformButton
            key={platform.id}
            platform={platform}
            isSelected={selectedPlatformsMap.has(platform.id)}
            onToggle={() => onTogglePlatform(platform.id)}
          />
        ))}
      </div>
      {error && touched && (
        <p className="text-xs text-red-500 mt-2 text-center font-kurdish">
          {error}
        </p>
      )}
    </div>
  );
});
