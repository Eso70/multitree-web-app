"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { apiRequest } from "@/lib/api/request";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";
import { EditorField } from "@/components/shared/EditorField";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { BrandAssetStack } from "@/features/link-editor/components/BrandAssetStack";
import { BusinessOwnerIdentityFields } from "@/features/link-editor/components/BusinessOwnerIdentityFields";
import { ColorGradientModal } from "@/features/link-editor/ColorGradientModal";
import { TikTokConfigModal } from "@/features/link-editor/TikTokConfigModal";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

type TikTokConfig = {
  id?: string;
  pixel_id: string;
  events_token: string;
};

type OnboardingData = {
  completedAt: string | null;
  name: string;
  phone: string;
  subdomain: string;
  ownerName: string | null;
  ownerEmail: string | null;
  logo: string;
  favicon: string;
  defaultAvatar: string;
  websiteColor: string;
  tiktokConfigs: TikTokConfig[];
};

export function BusinessGettingStarted(_props: { initialStep?: number }) {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTikTok, setShowTikTok] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoPreviewRef = useRef<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    logo?: string;
  }>({});

  useEffect(() => {
    void apiRequest<OnboardingData>("/api/auth/onboarding")
      .then((result) => {
        if (result.completedAt) {
          window.location.assign("/business");
          return;
        }
        setData({
          ...result,
          name: result.name || "",
          phone: result.phone || "",
          subdomain: result.subdomain || "",
          ownerName: result.ownerName || result.name || null,
          ownerEmail: result.ownerEmail || null,
          tiktokConfigs: result.tiktokConfigs || [],
        });
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Setup could not load",
        ),
      );
  }, []);

  useEffect(
    () => () => {
      if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    },
    [],
  );

  // The logo is the only upload setup asks for: the favicon is derived from it
  // and the avatar comes from the platform default, so without it a business
  // would finish setup showing placeholders for both.
  const hasLogo = Boolean(data?.logo.startsWith("/images/upload/"));

  const valid = useMemo(() => {
    if (!data) return false;
    return (
      data.name.trim().length >= 2 &&
      /^\+?[0-9][0-9\s-]{6,29}$/.test(data.phone.trim()) &&
      data.logo.startsWith("/images/upload/")
    );
  }, [data]);

  function validateFields() {
    if (!data) return false;
    const next = {
      name:
        data.name.trim().length >= 2
          ? undefined
          : "Business name must be at least 2 characters.",
      phone: /^\+?[0-9][0-9\s-]{6,29}$/.test(data.phone.trim())
        ? undefined
        : "Enter a valid phone number.",
      logo: data.logo.startsWith("/images/upload/")
        ? undefined
        : "لۆگۆی بزنس پێویستە",
    };
    setFieldErrors(next);
    return !next.name && !next.phone && !next.logo;
  }

  async function upload(
    file: File,
    assetType: "logo" | "favicon" | "default-avatar",
  ): Promise<string | null> {
    setBusy(true);
    setError("");
    try {
      return await enqueueImageUpload(async () => {
        try {
          const body = new FormData();
          // Fastify exposes multipart fields in stream order. Put metadata
          // first so the server always knows which branding slot owns the file.
          body.append("assetType", assetType);
          body.append("file", file);
          const response = await fetch("/api/auth/onboarding/assets", {
            method: "POST",
            credentials: "include",
            body,
          });
          const payload = await response.json().catch(() => null);
          const url = payload?.data?.url || payload?.url;
          if (!response.ok || !url) {
            throw new Error(payload?.message || "Upload failed");
          }
          const key =
            assetType === "default-avatar" ? "defaultAvatar" : assetType;
          setData((current) =>
            current ? { ...current, [key]: url } : current,
          );
          return url;
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Image upload failed",
          );
          return null;
        }
      });
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file: File) {
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    const preview = URL.createObjectURL(file);
    logoPreviewRef.current = preview;
    setLogoPreview(preview);

    const uploadedUrl = await upload(file, "logo");
    if (!uploadedUrl && logoPreviewRef.current === preview) {
      URL.revokeObjectURL(preview);
      logoPreviewRef.current = null;
      setLogoPreview(null);
      return;
    }
    if (!uploadedUrl) return;
    // The favicon follows the logo on every logo upload, so setup only asks for
    // one upload. Unlocking the favicon tile and uploading a different one
    // still overrides this, until the next logo upload. The default avatar is
    // deliberately left alone — it stands in for a person, not for the brand.
    setData((current) =>
      current ? { ...current, favicon: uploadedUrl } : current,
    );
  }

  async function saveAndComplete() {
    if (!data || !validateFields()) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest<OnboardingData>("/api/auth/onboarding", {
        method: "PATCH",
        json: {
          step: 2,
          name: data.name.trim(),
          phone: data.phone.trim(),
          logo: data.logo.startsWith("/images/upload/") ? data.logo : undefined,
          favicon: data.favicon.startsWith("/images/upload/")
            ? data.favicon
            : undefined,
          defaultAvatar: data.defaultAvatar.startsWith("/images/upload/")
            ? data.defaultAvatar
            : undefined,
          websiteColor: data.websiteColor || MULTITREE_ACCENT_COLOR,
          tiktokConfigs: data.tiktokConfigs,
        },
      });
      await apiRequest("/api/auth/onboarding/complete", { method: "POST" });
      window.location.assign("/business");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Setup could not be saved",
      );
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <ManagementModal
        isOpen
        locked
        busy
        onClose={() => undefined}
        title="ڕێکخستنی سەرەتایی"
        description={error || "زانیارییەکان بار دەکرێن"}
        headerAction={<LockKeyhole className="h-4 w-4 text-slate-400" />}
      >
        {!error ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <InlineRequestError
            error={{
              code: "ONBOARDING_LOAD_ERROR",
              status: null,
              title: "Setup error",
              message: error,
            }}
          />
        )}
      </ManagementModal>
    );
  }

  return (
    <>
      <ManagementModal
        isOpen
        locked
        wide
        createBusinessStyle
        busy={busy}
        onClose={() => undefined}
        title="بەخێربێیت بۆ MultiTree"
        description="زانیارییەکانی بزنس و براندەکەت پێداچوونەوە بکە"
        headerAction={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
            <LockKeyhole className="h-3.5 w-3.5" />
            پێویستە
          </span>
        }
        footer={
          <button
            type="button"
            disabled={busy || !valid}
            onClick={() => void saveAndComplete()}
            className="ml-auto flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-[var(--multitree-accent)] px-5 text-sm font-bold text-[var(--multitree-accent-ink)] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                پاشەکەوتکردن و چوونە داشبۆرد
              </>
            )}
          </button>
        }
      >
        <div className="min-h-[50vh] space-y-6" dir="ltr">
          {error ? (
            <InlineRequestError
              error={{
                code: "ONBOARDING_ERROR",
                status: null,
                title: "Setup error",
                message: error,
              }}
            />
          ) : null}

          <BrandAssetStack
            lockedAssets
            logo={logoPreview || data.logo}
            favicon={data.favicon}
            defaultAvatar={data.defaultAvatar}
            websiteColor={data.websiteColor}
            onLogoChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadLogo(file);
            }}
            onFaviconChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file, "favicon");
            }}
            onDefaultAvatarChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file, "default-avatar");
            }}
            onChooseColor={() => setShowColorPicker(true)}
          />

          <p
            className={`-mt-3 text-center text-xs font-medium ${
              fieldErrors.logo
                ? "text-red-500"
                : "text-slate-500 dark:text-slate-400"
            }`}
            dir="rtl"
          >
            {fieldErrors.logo ||
              (hasLogo
                ? "فایڤ لە لۆگۆوە دانراوە. بۆ گۆڕینی فایڤ یان ئەڤاتار، کلیکی قوفڵەکە بکە"
                : "لۆگۆ هەڵبژێرە — فایڤ خۆکارانە لە لۆگۆوە دادەنرێت")}
          </p>

          <div className="space-y-3">
            <BusinessOwnerIdentityFields
              ownerName={data.ownerName}
              ownerEmail={data.ownerEmail}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <EditorField label="ناوی بزنس" required error={fieldErrors.name}>
                <input
                  className={modalInputClass(Boolean(fieldErrors.name))}
                  value={data.name}
                  onChange={(event) => {
                    setData({ ...data, name: event.target.value });
                    setFieldErrors({ ...fieldErrors, name: undefined });
                  }}
                  onBlur={validateFields}
                />
              </EditorField>
              <EditorField
                label="ژمارەی مۆبایل"
                required
                error={fieldErrors.phone}
              >
                <input
                  type="tel"
                  className={modalInputClass(Boolean(fieldErrors.phone))}
                  value={data.phone}
                  onChange={(event) => {
                    setData({ ...data, phone: event.target.value });
                    setFieldErrors({ ...fieldErrors, phone: undefined });
                  }}
                  onBlur={validateFields}
                />
              </EditorField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <EditorField
                label="ساب‌دۆمەین"
                hint="لە کاتی تۆمارکردندا دیاریکراوە"
              >
                <input
                  disabled
                  className={`${modalInputClass()} cursor-not-allowed opacity-60`}
                  value={data.subdomain}
                />
              </EditorField>
              <EditorField label="ڕێکخستنی تیکتۆک">
                <button
                  type="button"
                  onClick={() => setShowTikTok(true)}
                  className={`${modalInputClass()} flex items-center justify-between text-left`}
                >
                  <span>
                    {data.tiktokConfigs.length
                      ? `${data.tiktokConfigs.length} گرووپی تیکتۆک`
                      : "زیادکردنی Pixel و Events API"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10">
                    {data.tiktokConfigs.length}
                  </span>
                </button>
              </EditorField>
            </div>
          </div>
        </div>
      </ManagementModal>

      <ColorGradientModal
        isOpen={showColorPicker}
        value={data.websiteColor}
        onChange={(websiteColor) => setData({ ...data, websiteColor })}
        onClose={() => setShowColorPicker(false)}
        solidFallback={MULTITREE_ACCENT_COLOR}
        gradientFallback="#22c55e"
      />
      <TikTokConfigModal
        isOpen={showTikTok}
        configs={data.tiktokConfigs}
        onChange={(tiktokConfigs) => setData({ ...data, tiktokConfigs })}
        onClose={() => setShowTikTok(false)}
      />
    </>
  );
}
