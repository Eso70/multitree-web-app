"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import {
  Archive,
  Clock3,
  Database,
  Globe,
  HardDrive,
  ImageIcon,
  Lock,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { StatCard } from "@/components/shared/StatCard";
import { ColorGradientModal } from "@/features/link-editor/ColorGradientModal";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import {
  getMultiTreeAccentInk,
  MULTITREE_ACCENT_COLOR,
} from "@/lib/multitree-theme";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import {
  createUploadFailureError,
  inlineRequestErrorFromResponse,
  type InlineRequestErrorData,
  validateUploadFile,
} from "@/lib/api/inline-request-error";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";
import { StatCardGrid } from "@/components/shared/StatCardGrid";
import {
  MULTITREE_LOGO,
  MULTITREE_LOGO_MARK,
} from "@/lib/brand/brand-assets";

type Tab = "general" | "security" | "retention" | "media";

type PlatformSettings = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  avatar: string | null;
  favicon: string | null;
  accent_color: string;
  accent_ink_color: string;
  app_url: string;
};

type BrandingAsset = "logo" | "avatar" | "favicon";

type AdminSession = {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_used_at: string;
  created_at: string;
  session_expires_at: string;
  is_current: boolean;
};

type LoginActivity = {
  id: string;
  outcome: "success" | "failure" | "denied";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type RetentionPolicy = {
  request_log_days: number;
  api_history_days: number;
  communication_history_days: number;
  automatic_cleanup: boolean;
  cleanup_hour_utc: number;
  batch_size: number;
  updated_at: string;
};

type RetentionStatus = {
  policy: RetentionPolicy;
  eligible: Record<"request_logs" | "api_history" | "communications", number>;
  last_run: null | {
    status: "running" | "completed" | "failed";
    trigger_type: "manual" | "scheduled";
    deleted_counts: Record<string, number>;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
  };
};

type MediaFormat = "jpeg" | "png" | "ico";
type MediaStatus = {
  policy: {
    max_upload_size_mb: number;
    allowed_formats: MediaFormat[];
    optimize_images: boolean;
    image_quality: number;
    max_image_dimension: number;
    auto_cleanup_unused: boolean;
    unused_grace_hours: number;
    updated_at: string;
  };
  stats: { asset_count: number; stored_bytes: number; saved_bytes: number };
  unused_assets: number;
};

const tabs = [
  { id: "general" as const, label: "گشتی", icon: Globe },
  { id: "security" as const, label: "چوونەژوورەوە و دانیشتنەکان", icon: Lock },
  { id: "retention" as const, label: "داتا و ماوەی هەڵگرتن", icon: Database },
  { id: "media" as const, label: "میدیا و بارکردن", icon: ImageIcon },
];

export function PlatformSettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [multiTreeName, setMultiTreeName] = useState("MultiTree");
  const [accentColor, setAccentColor] = useState(MULTITREE_ACCENT_COLOR);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [isGeneralLoading, setIsGeneralLoading] = useState(true);
  const [isGeneralSaving, setIsGeneralSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<BrandingAsset | null>(
    null,
  );
  const [assetUploadError, setAssetUploadError] =
    useState<InlineRequestErrorData | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loginActivity, setLoginActivity] = useState<LoginActivity[]>([]);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [retention, setRetention] = useState<RetentionStatus | null>(null);
  const [isRetentionLoading, setIsRetentionLoading] = useState(false);
  const [isRetentionSaving, setIsRetentionSaving] = useState(false);
  const [isCleanupRunning, setIsCleanupRunning] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [media, setMedia] = useState<MediaStatus | null>(null);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isMediaSaving, setIsMediaSaving] = useState(false);
  const [isMediaCleanupRunning, setIsMediaCleanupRunning] = useState(false);
  const [showMediaCleanupConfirm, setShowMediaCleanupConfirm] = useState(false);

  const applySettings = useCallback((settings: PlatformSettings) => {
    setMultiTreeName(settings.name);
    setUsername(settings.username);
    setAdminEmail(settings.email || "");
    setPhone(settings.phone || "");
    setLogo(settings.logo);
    setAvatar(settings.avatar);
    setFavicon(settings.favicon);
    setAccentColor(settings.accent_color || MULTITREE_ACCENT_COLOR);
    setAppUrl(settings.app_url || "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/platform/settings", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Unable to load settings");
        }
        if (!cancelled) applySettings(payload.data as PlatformSettings);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load settings",
          );
        }
      } finally {
        if (!cancelled) setIsGeneralLoading(false);
      }
    };
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [applySettings]);

  useEffect(() => {
    const root = document.documentElement;
    const parsed = parseWebsiteColor(accentColor);
    root.style.setProperty("--multitree-accent", parsed.primary);
    root.style.setProperty("--multitree-accent-gradient", parsed.css);
    root.style.setProperty(
      "--multitree-accent-ink",
      getMultiTreeAccentInk(parsed.primary),
    );
  }, [accentColor]);

  const request = useCallback(async (url: string, options: RequestInit) => {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(payload.message)
        ? payload.message.join(", ")
        : payload.message || "Unable to save settings";
      throw new Error(message);
    }
    return payload;
  }, []);

  const loadLoginSecurity = useCallback(async () => {
    setIsSecurityLoading(true);
    try {
      const payload = await request("/api/platform/settings/sessions", {
        method: "GET",
      });
      setSessions(payload.data?.sessions || []);
      setLoginActivity(payload.data?.recent_activity || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load sessions",
      );
    } finally {
      setIsSecurityLoading(false);
    }
  }, [request]);

  const loadRetention = useCallback(async () => {
    setIsRetentionLoading(true);
    try {
      const payload = await request("/api/platform/settings/data-retention", {
        method: "GET",
      });
      setRetention(payload.data as RetentionStatus);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "نەتوانرا ڕێکخستنەکانی داتا بهێنرێن",
      );
    } finally {
      setIsRetentionLoading(false);
    }
  }, [request]);

  const loadMedia = useCallback(async () => {
    setIsMediaLoading(true);
    try {
      const payload = await request("/api/platform/settings/media", {
        method: "GET",
      });
      setMedia(payload.data as MediaStatus);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "نەتوانرا ڕێکخستنەکانی میدیا بهێنرێن",
      );
    } finally {
      setIsMediaLoading(false);
    }
  }, [request]);

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === "security") void loadLoginSecurity();
    if (nextTab === "retention" && !retention) void loadRetention();
    if (nextTab === "media" && !media) void loadMedia();
  };

  const updateRetentionField = <K extends keyof RetentionPolicy>(
    key: K,
    value: RetentionPolicy[K],
  ) => {
    setRetention((current) =>
      current
        ? { ...current, policy: { ...current.policy, [key]: value } }
        : current,
    );
  };

  const saveRetention = async () => {
    if (!retention) return;
    setIsRetentionSaving(true);
    try {
      const {
        request_log_days,
        api_history_days,
        communication_history_days,
        automatic_cleanup,
        cleanup_hour_utc,
      } = retention.policy;
      await request("/api/platform/settings/data-retention", {
        method: "PUT",
        body: JSON.stringify({
          request_log_days,
          api_history_days,
          communication_history_days,
          automatic_cleanup,
          cleanup_hour_utc,
        }),
      });
      toast.success("ڕێکخستنەکانی ماوەی هەڵگرتن پاشەکەوت کران");
      await loadRetention();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "پاشەکەوتکردن سەرکەوتوو نەبوو",
      );
    } finally {
      setIsRetentionSaving(false);
    }
  };

  const runCleanup = async () => {
    setIsCleanupRunning(true);
    try {
      const payload = await request(
        "/api/platform/settings/data-retention/run",
        {
          method: "POST",
          body: JSON.stringify({ confirm: true }),
        },
      );
      const counts = Object.values(payload.data?.deleted_counts || {}).reduce(
        (sum: number, value) => sum + Number(value),
        0,
      );
      toast.success(`${counts.toLocaleString("en-US")} تۆماری کۆن پاککرایەوە`);
      await loadRetention();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "پاککردنەوە سەرکەوتوو نەبوو",
      );
      throw error;
    } finally {
      setIsCleanupRunning(false);
    }
  };

  const updateMediaField = <K extends keyof MediaStatus["policy"]>(
    key: K,
    value: MediaStatus["policy"][K],
  ) => {
    setMedia((current) =>
      current
        ? { ...current, policy: { ...current.policy, [key]: value } }
        : current,
    );
  };

  const toggleMediaFormat = (format: MediaFormat) => {
    if (!media) return;
    const selected = media.policy.allowed_formats.includes(format);
    if (selected && media.policy.allowed_formats.length === 1) {
      toast.error("لانیکەم یەک جۆری فایل دەبێت چالاک بێت");
      return;
    }
    updateMediaField(
      "allowed_formats",
      selected
        ? media.policy.allowed_formats.filter((item) => item !== format)
        : [...media.policy.allowed_formats, format],
    );
  };

  const saveMedia = async () => {
    if (!media) return;
    setIsMediaSaving(true);
    try {
      await request("/api/platform/settings/media", {
        method: "PUT",
        body: JSON.stringify(media.policy),
      });
      toast.success("ڕێکخستنەکانی میدیا پاشەکەوت کران");
      await loadMedia();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "پاشەکەوتکردن سەرکەوتوو نەبوو",
      );
    } finally {
      setIsMediaSaving(false);
    }
  };

  const cleanupMedia = async () => {
    setIsMediaCleanupRunning(true);
    try {
      const payload = await request("/api/platform/settings/media/cleanup", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      toast.success(
        `${Number(payload.data?.deleted || 0).toLocaleString("en-US")} فایلی بەکارنەهاتوو پاککرایەوە`,
      );
      await loadMedia();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "پاککردنەوە سەرکەوتوو نەبوو",
      );
      throw error;
    } finally {
      setIsMediaCleanupRunning(false);
    }
  };

  const handleAssetUpload = async (
    assetType: BrandingAsset,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateUploadFile(file, {
      allowedMimeTypes:
        assetType === "favicon"
          ? ["image/x-icon", "image/vnd.microsoft.icon", "image/png"]
          : ["image/jpeg", "image/png"],
      maxBytes: 10 * 1024 * 1024,
    });
    if (validationError) {
      setAssetUploadError(validationError);
      return;
    }
    setAssetUploadError(null);

    const formData = new FormData();
    formData.append("assetType", assetType);
    formData.append("file", file);
    setUploadingAsset(assetType);
    await enqueueImageUpload(async () => {
      try {
        const response = await fetch("/api/platform/settings/branding/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setAssetUploadError(inlineRequestErrorFromResponse(response));
          return null;
        }
        const url = payload.data?.url as string | undefined;
        if (!url) throw new Error("The upload did not return an image URL");
        if (assetType === "logo") setLogo(url);
        if (assetType === "avatar") setAvatar(url);
        if (assetType === "favicon") setFavicon(url);
        toast.success("Image uploaded. Save to apply the change.");
        return url;
      } catch {
        setAssetUploadError(createUploadFailureError());
        return null;
      }
    });
    setUploadingAsset(null);
  };

  const saveGeneralSettings = async () => {
    setIsGeneralSaving(true);
    try {
      const [profileResponse, brandingResponse] = await Promise.all([
        request("/api/platform/settings/profile", {
          method: "PUT",
          body: JSON.stringify({
            username: username.trim(),
            email: adminEmail.trim() || null,
            phone: phone.trim() || null,
          }),
        }),
        request("/api/platform/settings/branding", {
          method: "PUT",
          body: JSON.stringify({
            name: multiTreeName.trim(),
            logo,
            avatar,
            favicon,
            accent_color: accentColor,
          }),
        }),
      ]);

      applySettings({
        ...brandingResponse.data,
        ...profileResponse.data,
      } as PlatformSettings);
      window.dispatchEvent(
        new CustomEvent("platform-settings-updated", {
          detail: { ...brandingResponse.data, ...profileResponse.data },
        }),
      );
      toast.success("General settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save settings",
      );
    } finally {
      setIsGeneralSaving(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      await request(`/api/platform/settings/sessions/${sessionId}`, {
        method: "DELETE",
      });
      setSessions((current) =>
        current.filter((session) => session.id !== sessionId),
      );
      toast.success("Session signed out");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign out session",
      );
    } finally {
      setRevokingSession(null);
    }
  };

  const revokeOtherSessions = async () => {
    setRevokingSession("all");
    try {
      await request("/api/platform/settings/sessions", { method: "DELETE" });
      setSessions((current) => current.filter((session) => session.is_current));
      toast.success("All other sessions signed out");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign out sessions",
      );
    } finally {
      setRevokingSession(null);
    }
  };

  const tabMeta: Record<
    Tab,
    { title: string; description: string; icon: typeof Settings }
  > = {
    general: {
      title: "ڕێکخستنە گشتییەکان",
      description: "ناوی سیستەم، ڕەنگ و لۆگۆی پلاتفۆرم دیاری بکە.",
      icon: Globe,
    },
    security: {
      title: "چوونەژوورەوە و دانیشتنەکان",
      description:
        "پاسوۆرد، دانیشتنە چالاکەکان و مێژووی چوونەژوورەوە بەڕێوەببە.",
      icon: Lock,
    },
    retention: {
      title: "داتا و ماوەی هەڵگرتن",
      description:
        "ماوەی هەڵگرتنی تۆمارە کارگێڕییەکان دیاری بکە و پاککردنەوەی پارێزراو بەڕێوەببە.",
      icon: Database,
    },
    media: {
      title: "میدیا و بارکردن",
      description:
        "قەبارە، جۆر، کوالێتی و پاککردنەوەی وێنە بارکراوەکان بەڕێوەببە.",
      icon: ImageIcon,
    },
  };

  const meta = tabMeta[tab];

  return (
    <div className="space-y-5" dir="ltr">
      <StatCardGrid>
        <StatCard
          loading={isGeneralLoading}
          icon={Globe}
          label="ڕێکخستنە گشتییەکان"
          value="4"
          color="blue"
        />
        <StatCard
          loading={isSecurityLoading && sessions.length === 0}
          icon={Lock}
          label="چوونەژوورەوە و دانیشتنەکان"
          value="3"
          color="green"
        />
        <StatCard
          loading={isRetentionLoading && !retention}
          icon={Database}
          label="پاککردنەوەی خۆکار"
          value={retention?.policy.automatic_cleanup ? "چالاک" : "ناچالاک"}
          color="purple"
        />
        <StatCard
          loading={isMediaLoading && !media}
          icon={ImageIcon}
          label="فایلی میدیا"
          value={(media?.stats.asset_count || 0).toLocaleString("en-US")}
          color="slate"
        />
      </StatCardGrid>

      <SegmentedTabs
        tabs={tabs}
        value={tab}
        onChange={changeTab}
        accent="var(--multitree-accent)"
      />

      {/* ─── General ─── */}
      {tab === "general" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
          <PageHeader
            title={meta.title}
            description={meta.description}
            icon={meta.icon}
          />
          <div className="mt-2 border-t border-slate-100 pt-5 dark:border-white/5">
            {isGeneralLoading && (
              <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 dark:bg-white/5 dark:text-slate-300">
                Loading saved settings…
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="col-span-full">
                <div className="flex flex-col items-center gap-1 py-1">
                  <div className="relative h-44 w-72 sm:h-48 sm:w-80">
                    <label className="group absolute left-5 top-7 h-24 w-24 rotate-[-8deg] cursor-pointer overflow-hidden rounded-full border-4 border-white bg-white shadow-xl ring-1 ring-gray-200 transition hover:z-30 hover:rotate-0 hover:scale-105 dark:border-[#161B22] dark:bg-[#161B22] dark:ring-white/10">
                      <Image
                        src={avatar || MULTITREE_LOGO_MARK}
                        alt="Default avatar"
                        width={112}
                        height={112}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                      <UploadOverlay
                        label={uploadingAsset === "avatar" ? "…" : "ئەڤاتار"}
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        disabled={!!uploadingAsset}
                        onChange={(event) =>
                          void handleAssetUpload("avatar", event)
                        }
                      />
                    </label>
                    <label className="group absolute right-6 top-4 h-20 w-20 rotate-[10deg] cursor-pointer overflow-hidden rounded-2xl border-4 border-white bg-white p-2 shadow-lg ring-1 ring-gray-200 transition hover:z-30 hover:rotate-0 hover:scale-105 dark:border-[#161B22] dark:bg-[#161B22] dark:ring-white/10">
                      <Image
                        src={favicon || MULTITREE_LOGO}
                        alt="Favicon"
                        width={96}
                        height={96}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                      <UploadOverlay
                        label={uploadingAsset === "favicon" ? "…" : "فایڤ"}
                      />
                      <input
                        type="file"
                        accept="image/x-icon,image/vnd.microsoft.icon,image/png"
                        className="hidden"
                        disabled={!!uploadingAsset}
                        onChange={(event) =>
                          void handleAssetUpload("favicon", event)
                        }
                      />
                    </label>
                    <label className="group absolute left-1/2 top-12 z-20 h-32 w-32 -translate-x-1/2 cursor-pointer overflow-hidden rounded-3xl border-4 border-white bg-white p-3 shadow-2xl ring-1 ring-gray-200 transition hover:scale-105 dark:border-[#161B22] dark:bg-[#161B22] dark:ring-white/10">
                      <Image
                        src={logo || MULTITREE_LOGO}
                        alt="Logo"
                        width={144}
                        height={144}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                      <UploadOverlay
                        label={uploadingAsset === "logo" ? "…" : "لۆگۆ"}
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        disabled={!!uploadingAsset}
                        onChange={(event) =>
                          void handleAssetUpload("logo", event)
                        }
                      />
                    </label>
                  </div>
                  <div className="-mt-2 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#161B22]/90 dark:text-gray-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: accentColor }}
                    />
                    Logo<span>·</span>Avatar<span>·</span>Favicon
                  </div>
                </div>
                {assetUploadError && (
                  <InlineRequestError
                    className="mx-auto mt-3 max-w-xl"
                    error={assetUploadError}
                  />
                )}
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(true)}
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-white hover:text-gray-800 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-gray-100"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm"
                      style={{ background: parseWebsiteColor(accentColor).css }}
                    >
                      <Palette className="h-3.5 w-3.5" />
                    </span>
                    <span>ڕەنگی سەرەکی</span>
                  </button>
                </div>
              </div>
              <Field label="ناوی سیستەم">
                <input
                  value={multiTreeName}
                  onChange={(e) => setMultiTreeName(e.target.value)}
                  placeholder="بۆ نموونە: MultiTree"
                  className={inputClass}
                  dir="ltr"
                />
              </Field>
              <Field label="ناوی بەکارهێنەر">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ناوی بەکارهێنەر"
                  className={inputClass}
                  dir="ltr"
                />
              </Field>
              <Field label="ئیمەیڵ">
                <input
                  type="email"
                  value={adminEmail}
                  placeholder="ئیمەیڵی بەڕێوەبەر"
                  className={`${inputClass} cursor-not-allowed opacity-70`}
                  dir="ltr"
                  readOnly
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  لە ڕێکخستنی سێرڤەرەوە دیاری کراوە و ناگۆڕدرێت.
                </p>
              </Field>
              <Field label="ژمارەی مۆبایل">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+964 7XX XXX XXXX"
                  className={inputClass}
                  dir="ltr"
                />
              </Field>
              <Field label="دۆمەین">
                <input
                  value={appUrl}
                  placeholder="دۆمەین"
                  className={`${inputClass} opacity-70`}
                  dir="ltr"
                  readOnly
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4 dark:border-white/5">
              <SaveButton
                label={isGeneralSaving ? "پاشەکەوت دەکرێت…" : "پاشەکەوتکردن"}
                onClick={() => void saveGeneralSettings()}
                disabled={
                  isGeneralLoading || isGeneralSaving || !!uploadingAsset
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* ─── Login & Sessions ─── */}
      {tab === "security" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
          <PageHeader
            title={meta.title}
            description={meta.description}
            icon={meta.icon}
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5">
                  <ShieldCheck
                    className="h-5 w-5"
                    style={{ color: "var(--multitree-accent)" }}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    چوونەژوورەوە بە Google
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تەنها ئیمەیڵی Googleـی ڕێگەپێدراو دەتوانێت بچێتە ژوورەوە.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  Google OAuth چالاکە
                </p>
                <p
                  className="mt-1 break-all text-xs text-emerald-700 dark:text-emerald-300"
                  dir="ltr"
                >
                  {adminEmail}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    دانیشتنە چالاکەکان
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    ئامێرەکانی چوونەژوورەوە ببینە و بەڕێوەیانببە.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadLoginSecurity()}
                  disabled={isSecurityLoading}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                  aria-label="Refresh sessions"
                >
                  <MotionSpinner active={isSecurityLoading}><RefreshCw
                    className="h-4 w-4"
                   /></MotionSpinner>
                </button>
              </div>
              <div className="space-y-3">
                {isSecurityLoading && sessions.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    Loading sessions…
                  </p>
                ) : sessions.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No active sessions found.
                  </p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5"
                    >
                      <Monitor className="h-5 w-5 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                            {describeUserAgent(session.user_agent)}
                          </p>
                          {session.is_current && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--multitree-accent) 20%, transparent)",
                                color: "var(--multitree-accent)",
                              }}
                            >
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                          {session.ip_address || "Unknown IP"} ·{" "}
                          {formatSecurityDate(session.created_at)}
                        </p>
                      </div>
                      {!session.is_current && (
                        <button
                          type="button"
                          onClick={() => void revokeSession(session.id)}
                          disabled={revokingSession !== null}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
                          aria-label="Sign out session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {sessions.some((session) => !session.is_current) && (
                <button
                  type="button"
                  onClick={() => void revokeOtherSessions()}
                  disabled={revokingSession !== null}
                  className="mt-4 w-full cursor-pointer rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  {revokingSession === "all"
                    ? "Signing out…"
                    : "Sign out all other sessions"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              مێژووی چوونەژوورەوە
            </h3>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
              {loginActivity.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No recent login activity.
                </p>
              ) : (
                loginActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {describeUserAgent(activity.user_agent)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {activity.ip_address || "Unknown IP"} ·{" "}
                        {formatSecurityDate(activity.created_at)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${activity.outcome === "success" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}
                    >
                      {activity.outcome === "success" ? "Successful" : "Failed"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Data retention ─── */}
      {tab === "retention" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
          <PageHeader
            title={meta.title}
            description={meta.description}
            icon={meta.icon}
          />
          <div className="mt-2 border-t border-slate-100 pt-5 dark:border-white/5">
            {isRetentionLoading && !retention ? (
              <div className="py-14 text-center text-sm text-slate-400">
                ڕێکخستنەکان بار دەکرێن…
              </div>
            ) : retention ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <RetentionCount
                    icon={Clock3}
                    label="داواکارییە کۆنەکان"
                    value={retention.eligible.request_logs}
                  />
                  <RetentionCount
                    icon={Database}
                    label="مێژووی API"
                    value={retention.eligible.api_history}
                  />
                  <RetentionCount
                    icon={Archive}
                    label="پەیوەندییە ئەرشیڤکراوەکان"
                    value={retention.eligible.communications}
                  />
                </div>

                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  تۆمارەکانی چاودێریی ئاسایش هەمیشەییین و لە پاککردنەوەی داتا
                  ناگرێنەوە.
                </p>

                <div className="grid gap-5 sm:grid-cols-2">
                  <RetentionDaysField
                    label="تۆماری داواکارییەکانی سیستەم"
                    hint="7–365 ڕۆژ"
                    value={retention.policy.request_log_days}
                    min={7}
                    max={365}
                    onChange={(value) =>
                      updateRetentionField("request_log_days", value)
                    }
                  />
                  <RetentionDaysField
                    label="مێژووی API و Webhook"
                    hint="30–730 ڕۆژ"
                    value={retention.policy.api_history_days}
                    min={30}
                    max={730}
                    onChange={(value) =>
                      updateRetentionField("api_history_days", value)
                    }
                  />
                  <RetentionDaysField
                    label="پەیام و ڕاگەیاندنی ئەرشیڤکراو"
                    hint="30–3650 ڕۆژ"
                    value={retention.policy.communication_history_days}
                    min={30}
                    max={3650}
                    onChange={(value) =>
                      updateRetentionField("communication_history_days", value)
                    }
                  />
                </div>

                <div className="grid items-end gap-5 border-t border-slate-100 pt-5 dark:border-white/5 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <Toggle
                      enabled={retention.policy.automatic_cleanup}
                      onChange={(value) =>
                        updateRetentionField("automatic_cleanup", value)
                      }
                      label="پاککردنەوەی خۆکار چالاک بکە"
                    />
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      تەنها تۆمارە کۆن و تەواوبووەکان بە پارچەی بچووک پاک
                      دەکرێنەوە.
                    </p>
                  </div>
                  <CustomSelect
                    label="کاتی پاککردنەوە (UTC)"
                    value={String(retention.policy.cleanup_hour_utc)}
                    options={Array.from({ length: 24 }, (_, hour) => ({
                      value: String(hour),
                      label: `${String(hour).padStart(2, "0")}:00 UTC`,
                    }))}
                    onChange={(value) =>
                      updateRetentionField("cleanup_hour_utc", Number(value))
                    }
                    disabled={!retention.policy.automatic_cleanup}
                    triggerClassName="h-11"
                  />
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                    {retention.last_run ? (
                      <p>
                        دوا پاککردنەوە:{" "}
                        {formatSecurityDate(
                          retention.last_run.completed_at ||
                            retention.last_run.started_at,
                        )}{" "}
                        ·{" "}
                        {retention.last_run.status === "completed"
                          ? "سەرکەوتوو"
                          : retention.last_run.status === "running"
                            ? "لە کاردایە"
                            : "شکستی هێنا"}
                      </p>
                    ) : (
                      <p>هێشتا هیچ پاککردنەوەیەک ئەنجام نەدراوە.</p>
                    )}
                    <p className="mt-1">
                      داتای چالاکی بزنس، پەڕەکان و کۆی ئاماری ئەنالیتیکس ناخرێنە
                      ناو پاککردنەوە.
                    </p>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setShowCleanupConfirm(true)}
                      disabled={isCleanupRunning || isRetentionSaving}
                      className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> پاککردنەوە ئێستا
                    </button>
                    <SaveButton
                      label={
                        isRetentionSaving ? "پاشەکەوت دەکرێت…" : "پاشەکەوتکردن"
                      }
                      onClick={() => void saveRetention()}
                      disabled={isRetentionSaving || isCleanupRunning}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void loadRetention()}
                className="mx-auto flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
              >
                <RefreshCw className="h-4 w-4" /> دووبارە هەوڵبدەوە
              </button>
            )}
          </div>
        </section>
      )}

      {/* ─── Media & uploads ─── */}
      {tab === "media" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
          <PageHeader
            title={meta.title}
            description={meta.description}
            icon={meta.icon}
          />
          <div className="mt-2 border-t border-slate-100 pt-5 dark:border-white/5">
            {isMediaLoading && !media ? (
              <div className="py-14 text-center text-sm text-slate-400">
                ڕێکخستنەکان بار دەکرێن…
              </div>
            ) : media ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <RetentionCount
                    icon={ImageIcon}
                    label="فایلی تۆمارکراو"
                    value={media.stats.asset_count}
                  />
                  <MediaSizeCard
                    icon={HardDrive}
                    label="بۆشایی بەکارهاتوو"
                    bytes={media.stats.stored_bytes}
                  />
                  <MediaSizeCard
                    icon={Archive}
                    label="بۆشایی پاشەکەوتکراو"
                    bytes={media.stats.saved_bytes}
                  />
                  <RetentionCount
                    icon={Trash2}
                    label="فایلی بەکارنەهاتوو"
                    value={media.unused_assets}
                  />
                </div>

                <div>
                  <p className="mb-3 text-xs font-bold text-slate-700 dark:text-slate-200">
                    جۆری فایلە ڕێگەپێدراوەکان
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {(["jpeg", "png", "ico"] as MediaFormat[]).map((format) => (
                      <label
                        key={format}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={media.policy.allowed_formats.includes(
                            format,
                          )}
                          onChange={() => toggleMediaFormat(format)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[var(--multitree-accent)]"
                        />
                        <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                          {format === "jpeg" ? "JPG / JPEG" : format}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <MediaNumberField
                    label="زۆرترین قەبارەی فایل"
                    suffix="MB"
                    value={media.policy.max_upload_size_mb}
                    min={1}
                    max={10}
                    onChange={(value) =>
                      updateMediaField("max_upload_size_mb", value)
                    }
                  />
                  <MediaNumberField
                    label="زۆرترین ڕەهەندی وێنە"
                    suffix="px"
                    value={media.policy.max_image_dimension}
                    min={512}
                    max={4096}
                    step={128}
                    onChange={(value) =>
                      updateMediaField("max_image_dimension", value)
                    }
                  />
                  <MediaNumberField
                    label="کوالێتی پەستاندن"
                    suffix="%"
                    value={media.policy.image_quality}
                    min={40}
                    max={100}
                    onChange={(value) =>
                      updateMediaField("image_quality", value)
                    }
                    disabled={!media.policy.optimize_images}
                  />
                  <MediaNumberField
                    label="ماوەی پاراستنی فایلی بەکارنەهاتوو"
                    suffix="کاتژمێر"
                    value={media.policy.unused_grace_hours}
                    min={24}
                    max={720}
                    onChange={(value) =>
                      updateMediaField("unused_grace_hours", value)
                    }
                  />
                </div>

                <div className="grid gap-4 border-t border-slate-100 pt-5 dark:border-white/5 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <Toggle
                      enabled={media.policy.optimize_images}
                      onChange={(value) =>
                        updateMediaField("optimize_images", value)
                      }
                      label="پەستاندن و کەمکردنەوەی ڕەهەند بە خۆکار"
                    />
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      JPG، PNG و WebP بەبێ گۆڕینی جۆری فایل خێراتر دەکرێن.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <Toggle
                      enabled={media.policy.auto_cleanup_unused}
                      onChange={(value) =>
                        updateMediaField("auto_cleanup_unused", value)
                      }
                      label="پاککردنەوەی خۆکاری فایلی بەکارنەهاتوو"
                    />
                    <p className="mt-1 text-[11px] leading-5 text-slate-400">
                      تەنها فایلێک پاک دەکرێتەوە کە لە هیچ بزنس، پەڕە یان API
                      ـێک بەکارنەهاتووە.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] leading-5 text-slate-400">
                    پشکنینی ناوەڕۆکی فایل و ڕەتکردنەوەی فایلە ساختەکان هەمیشە
                    چالاکە.
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setShowMediaCleanupConfirm(true)}
                      disabled={
                        isMediaCleanupRunning ||
                        isMediaSaving ||
                        media.unused_assets === 0
                      }
                      className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> پاککردنەوەی فایلی
                      بەکارنەهاتوو
                    </button>
                    <SaveButton
                      label={
                        isMediaSaving ? "پاشەکەوت دەکرێت…" : "پاشەکەوتکردن"
                      }
                      onClick={() => void saveMedia()}
                      disabled={isMediaSaving || isMediaCleanupRunning}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void loadMedia()}
                className="mx-auto flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300"
              >
                <RefreshCw className="h-4 w-4" /> دووبارە هەوڵبدەوە
              </button>
            )}
          </div>
        </section>
      )}

      <ColorGradientModal
        isOpen={showColorPicker}
        value={accentColor}
        onChange={setAccentColor}
        onClose={() => setShowColorPicker(false)}
        solidFallback={MULTITREE_ACCENT_COLOR}
        gradientFallback="#0066ff"
      />
      <ConfirmDeleteModal
        isOpen={showCleanupConfirm}
        onClose={() => setShowCleanupConfirm(false)}
        onConfirm={runCleanup}
        title="پاککردنەوەی داتای کۆن"
        message="هەموو تۆمارە کۆنە شیاوەکان بەپێی ماوە دیاریکراوەکان بە هەمیشەیی پاک دەکرێنەوە. داتای چالاک ناگیرێتەوە."
        confirmLabel="پاککردنەوە ئێستا"
        loadingLabel="پاک دەکرێتەوە…"
        isDeleting={isCleanupRunning}
      />
      <ConfirmDeleteModal
        isOpen={showMediaCleanupConfirm}
        onClose={() => setShowMediaCleanupConfirm(false)}
        onConfirm={cleanupMedia}
        title="پاککردنەوەی فایلی بەکارنەهاتوو"
        message="تەنها فایلە کۆنە تۆمارکراوەکان پاک دەکرێنەوە کە لە هیچ ناسنامەی بزنس، پەڕەی لینک، داواکاری گۆڕانکاری یان API ـێک بەکارنەهاتوون."
        confirmLabel="پاککردنەوە"
        loadingLabel="پاک دەکرێتەوە…"
        isDeleting={isMediaCleanupRunning}
      />
    </div>
  );
}

/* ─── Tab Forms ─── */

function RetentionCount({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
        <Icon
          className="h-4 w-4"
          style={{ color: "var(--multitree-accent)" }}
        />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-slate-400">{label}</p>
        <p className="mt-0.5 text-base font-bold tabular-nums text-slate-800 dark:text-white">
          {value.toLocaleString("en-US")}
        </p>
      </div>
    </div>
  );
}

function RetentionDaysField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(
              Math.min(max, Math.max(min, Number(event.target.value) || min)),
            )
          }
          className={`${inputClass} pr-14 tabular-nums`}
          dir="ltr"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
          ڕۆژ
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
    </Field>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value.toLocaleString("en-US")} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function MediaSizeCard({
  icon: Icon,
  label,
  bytes,
}: {
  icon: typeof HardDrive;
  label: string;
  bytes: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
        <Icon
          className="h-4 w-4"
          style={{ color: "var(--multitree-accent)" }}
        />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-base font-bold tabular-nums text-slate-800 dark:text-white">
          {formatBytes(bytes)}
        </p>
      </div>
    </div>
  );
}

function MediaNumberField({
  label,
  suffix,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              Math.min(max, Math.max(min, Number(event.target.value) || min)),
            )
          }
          className={`${inputClass} pr-20 tabular-nums disabled:cursor-not-allowed disabled:opacity-50`}
          dir="ltr"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
          {suffix}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">
        {min.toLocaleString("en-US")}–{max.toLocaleString("en-US")}
      </p>
    </Field>
  );
}

/* ─── Shared UI ─── */

function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Chrome/")
      ? "Chrome"
      : userAgent.includes("Firefox/")
        ? "Firefox"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const platform = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iPad")
        ? "iOS"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown device";
  return `${browser} on ${platform}`;
}

function formatSecurityDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500 dark:[color-scheme:dark]";

function SaveButton({
  label,
  onClick,
  icon: Icon,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  icon?: typeof Save;
  disabled?: boolean;
}) {
  const Ico = Icon || Save;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="sa-gradient sa-gradient-hover flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Ico className="h-4 w-4" />
      {label}
    </button>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200 ${enabled ? "sa-gradient" : "bg-slate-200 dark:bg-slate-700"}`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-4.5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function UploadOverlay({ label }: { label: string }) {
  return (
    <>
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
        <Upload className="h-5 w-5" />
      </span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] text-white">
        {label}
      </span>
    </>
  );
}
