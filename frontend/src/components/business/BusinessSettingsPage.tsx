"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  Check,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  MessageSquare,
  Palette,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ColorGradientModal } from "@/features/link-editor/ColorGradientModal";
import { PageHeaderSection } from "@/components/shared/PageHeaderSection";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { TabSaveButton } from "@/components/shared/TabSaveButton";
import { AccentActionButton } from "@/components/shared/AccentActionButton";
import { StatCard } from "@/components/shared/StatCard";
import { Skeleton, SkeletonDashboardPage } from "@/components/shared/Skeleton";
import { TemplateCombobox } from "@/components/ui/TemplateCombobox";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import type { EffectiveAccessManifest } from "@linktree/types";
import { SessionManagementPanel } from "@/components/shared/SessionManagementPanel";
import { BusinessMessagesPanel } from "@/features/communications/BusinessMessagesPanel";
import { isBusinessSettingsTabLocked } from "@/lib/business-page-access";
import { DashboardSurface } from "@/components/shared/DashboardSurface";
import { LockedContent } from "@/components/shared/LockedContent";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import {
  createUploadFailureError,
  inlineRequestErrorFromResponse,
  type InlineRequestErrorData,
  validateUploadFile,
} from "@/lib/api/inline-request-error";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

type Tab = "profile" | "defaults" | "security" | "messages";
type SettingsData = {
  name: string;
  username: string;
  phone: string;
  email: string;
  subdomain: string;
  logo: string;
  favicon: string;
  default_avatar: string;
  website_color: string;
  default_footer_text: string;
  default_footer_phone: string;
  default_template: string;
  default_background_color: string;
  default_footer_hidden: boolean;
  default_whatsapp_enabled: boolean;
  pending_profile_changes?: Partial<SettingsData> | null;
  profile_request_status?: string | null;
};

const emptySettings: SettingsData = {
  name: "",
  username: "",
  phone: "",
  email: "",
  subdomain: "",
  logo: "",
  favicon: "",
  default_avatar: "",
  website_color: "#000000",
  default_footer_text: "",
  default_footer_phone: "",
  // Mirrors backend/src/common/linktree-defaults.ts. `normalizeSettings`
  // spreads these under the API response, so a field the server omits is shown
  // from here — two different answers to "what is the default" would surface as
  // the form disagreeing with the page it configures.
  default_template: "spectrum",
  default_background_color: "#ffffff",
  default_footer_hidden: true,
  default_whatsapp_enabled: false,
};
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500 dark:[color-scheme:dark]";
const PASSWORD_STRENGTH = [
  { label: "Weak", color: "bg-red-500", textColor: "text-red-600" },
  { label: "Fair", color: "bg-amber-500", textColor: "text-amber-600" },
  { label: "Good", color: "bg-blue-500", textColor: "text-blue-600" },
  { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600" },
];

export function BusinessSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get("tab") === "messages" ? "messages" : "profile",
  );
  const [initialConversationId] = useState(
    () => searchParams.get("conversation") || undefined,
  );

  useEffect(() => {
    if (searchParams.get("tab") || searchParams.get("conversation")) {
      router.replace("/business/settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [data, setData] = useState<SettingsData>(emptySettings);
  const [savedSnapshot, setSavedSnapshot] =
    useState<SettingsData>(emptySettings);
  const [brandAssetError, setBrandAssetError] =
    useState<InlineRequestErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDefaultColorPicker, setShowDefaultColorPicker] = useState(false);
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(true);
  const [showNewPw, setShowNewPw] = useState(true);
  const [showConfirmPw, setShowConfirmPw] = useState(true);
  const [defaultLinktree, setDefaultLinktree] = useState<
    | {
        id: string;
        name: string;
        uid: string;
        seo_name?: string;
        image?: string | null;
        status?: string;
      }
    | null
    | undefined
  >(undefined);
  const [effectiveAccess, setEffectiveAccess] =
    useState<EffectiveAccessManifest | null>(null);
  const passwordStrength = useMemo(() => {
    if (!passwords.new_password) return null;
    let score = 0;
    if (passwords.new_password.length >= 8) score += 1;
    if (
      /[a-z]/.test(passwords.new_password) &&
      /[A-Z]/.test(passwords.new_password)
    )
      score += 1;
    if (/\d/.test(passwords.new_password)) score += 1;
    if (
      /[^A-Za-z0-9]/.test(passwords.new_password) ||
      passwords.new_password.length >= 12
    )
      score += 1;
    const level = Math.max(
      0,
      Math.min(score - 1, PASSWORD_STRENGTH.length - 1),
    );
    return { ...PASSWORD_STRENGTH[level], score };
  }, [passwords.new_password]);
  const passwordReqs = useMemo(
    () => [
      {
        key: "length",
        label: "لانیکەم ٨ پیت",
        met: passwords.new_password.length >= 8,
      },
      {
        key: "case",
        label: "پیتی گەورە و بچووک",
        met:
          /[a-z]/.test(passwords.new_password) &&
          /[A-Z]/.test(passwords.new_password),
      },
      {
        key: "digit",
        label: "بەلانی کەم یەک ژمارە",
        met: /\d/.test(passwords.new_password),
      },
      {
        key: "special",
        label: "نووسەی تایبەت",
        met:
          /[^A-Za-z0-9]/.test(passwords.new_password) ||
          passwords.new_password.length >= 12,
      },
    ],
    [passwords.new_password],
  );

  const loadSettings = useCallback(async (rethrow = false) => {
    try {
      const [settingsResponse, accessResponse, defaultResponse] =
        await Promise.all([
          fetch("/api/auth/settings", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/auth/effective-access", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/linktrees/default", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
      if (!settingsResponse.ok || !accessResponse.ok) {
        throw new Error("Failed to load settings");
      }
      const [settingsResult, accessResult] = await Promise.all([
        settingsResponse.json(),
        accessResponse.json(),
      ]);
      const normalizedSettings = normalizeSettings(settingsResult.data);
      setData(normalizedSettings);
      setSavedSnapshot(normalizedSettings);
      setEffectiveAccess(accessResult.data || null);
      if (defaultResponse.ok) {
        const defaultData = await defaultResponse.json();
        setDefaultLinktree(defaultData.data || null);
      } else {
        setDefaultLinktree(null);
      }
    } catch (error) {
      if (rethrow) throw error;
      toast.error("بارکردنی ڕێکخستنەکان سەرکەوتوو نەبوو");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings().finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  useEffect(() => {
    const syncAccess = (event: Event) => {
      const detail = (event as CustomEvent<EffectiveAccessManifest>).detail;
      if (detail) setEffectiveAccess(detail);
    };
    window.addEventListener("multitree:access-updated", syncAccess);
    return () =>
      window.removeEventListener("multitree:access-updated", syncAccess);
  }, []);

  const save = async () => {
    if (
      activeTab === "security" &&
      passwords.new_password !== passwords.confirm_password
    ) {
      toast.error("وشە نهێنییە نوێیەکان یەکسان نین");
      return;
    }
    setSaving(true);
    try {
      // Only send the fields the backend DTO whitelists for the active
      // section. The global pipe rejects unknown properties, so spreading the
      // whole settings object (email, subdomain, pending_profile_changes, …)
      // would 400 every tab.
      let body: Record<string, unknown>;
      if (activeTab === "security") {
        body = {
          section: activeTab,
          current_password: passwords.current_password,
          new_password: passwords.new_password,
          email: data.email,
        };
      } else if (activeTab === "defaults") {
        body = {
          section: activeTab,
          default_footer_text: data.default_footer_text,
          default_footer_phone: data.default_footer_phone,
          default_template: data.default_template,
          default_background_color: data.default_background_color,
          default_footer_hidden: data.default_footer_hidden,
          default_whatsapp_enabled: data.default_whatsapp_enabled,
        };
      } else if (
        effectiveAccess?.permissions["business:profile:update"]?.outcome ===
        "deny"
      ) {
        body = { section: activeTab, username: data.username };
      } else {
        body = {
          section: activeTab,
          name: data.name,
          username: data.username,
          phone: data.phone,
          logo: data.logo,
          favicon: data.favicon,
          default_avatar: data.default_avatar,
          website_color: data.website_color,
        };
      }
      const response = await fetch("/api/auth/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Save failed");
      if (result?.data) {
        const normalized = normalizeSettings(result.data);
        setData(normalized);
        setSavedSnapshot(normalized);
        window.dispatchEvent(
          new CustomEvent("multitree:business-settings-updated", {
            detail: normalized,
          }),
        );
      }
      if (activeTab === "security")
        setPasswords({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      toast.info(
        activeTab === "profile"
          ? "داواکارییەکەت بۆ بەڕێوەبەری پلاتفۆرم نێردرا"
          : "ڕێکخستنەکان بە سەرکەوتوویی نوێکرانەوە",
      );
    } catch (error) {
      toast.error("پاشەکەوتکردنی ڕێکخستنەکان سەرکەوتوو نەبوو", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Creates the default page outright rather than opening the builder.
   *
   * The server seeds it from what the business has already registered — name,
   * logo, colours, and WhatsApp and phone buttons built from its own phone
   * number — so the page is live and reachable immediately. Nothing here is
   * final: it opens in the editor from the pages list like any other.
   */
  const handleCreateDefaultPage = async () => {
    if (creatingDefault) return;
    setCreatingDefault(true);
    try {
      const response = await fetch("/api/linktrees/default", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || "Create failed");
      }
      setDefaultLinktree(result?.data || null);
      toast.success("پەیجی بنەڕەت دروستکرا", {
        description: "دوگمەی واتساپ و تەلەفۆن بە ژمارەی بزنسەکەت زیادکران",
      });
    } catch (error) {
      toast.error("دروستکردنی پەیجی بنەڕەت سەرکەوتوو نەبوو", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setCreatingDefault(false);
    }
  };

  const tabs = useMemo(
    () => [
      { id: "profile" as const, label: "پڕۆفایلی بزنس", icon: UserRound },
      {
        id: "defaults" as const,
        label: "پەڕە بنەڕەتییەکان",
        icon: SlidersHorizontal,
      },
      {
        id: "security" as const,
        label: "چوونەژوورەوە و دانیشتنەکان",
        icon: ShieldCheck,
      },
      {
        id: "messages" as const,
        label: "پەیامەکان",
        icon: MessageSquare,
      },
    ],
    [],
  );
  const activeTab = tabs.some((item) => item.id === tab) ? tab : "profile";
  const tabLocked = isBusinessSettingsTabLocked(activeTab, effectiveAccess);
  // Header save button matches the advertising page tabs: it stays idle
  // ("پاشەکەوت کرا") until something changed, then flips to a live save.
  // Only user-editable fields count — server-managed response fields
  // (pending_profile_changes, profile_request_status) would otherwise keep the
  // form permanently dirty after every approval round-trip.
  const dirty = useMemo(() => {
    if (
      passwords.current_password ||
      passwords.new_password ||
      passwords.confirm_password
    )
      return true;
    return (
      data.name !== savedSnapshot.name ||
      data.username !== savedSnapshot.username ||
      data.phone !== savedSnapshot.phone ||
      data.email !== savedSnapshot.email ||
      data.subdomain !== savedSnapshot.subdomain ||
      data.logo !== savedSnapshot.logo ||
      data.favicon !== savedSnapshot.favicon ||
      data.default_avatar !== savedSnapshot.default_avatar ||
      data.website_color !== savedSnapshot.website_color ||
      data.default_footer_text !== savedSnapshot.default_footer_text ||
      data.default_footer_phone !== savedSnapshot.default_footer_phone ||
      data.default_template !== savedSnapshot.default_template ||
      data.default_background_color !==
        savedSnapshot.default_background_color ||
      data.default_footer_hidden !== savedSnapshot.default_footer_hidden ||
      data.default_whatsapp_enabled !== savedSnapshot.default_whatsapp_enabled
    );
  }, [data, savedSnapshot, passwords]);
  const profileEditingOutcome =
    effectiveAccess?.permissions["business:profile:update"]?.outcome;
  const profileEditingAllowed =
    profileEditingOutcome === "allow" || profileEditingOutcome === "approval";
  const usernameEditingOutcome =
    effectiveAccess?.permissions["business:security:username-update"]?.outcome;
  const usernameEditingAllowed =
    usernameEditingOutcome === "allow" || usernameEditingOutcome === "approval";
  const brandingEditingOutcome =
    effectiveAccess?.permissions["business:profile-assets:upload"]?.outcome;
  const brandingEditingAllowed =
    brandingEditingOutcome === "allow" || brandingEditingOutcome === "approval";
  const uploadBrandAsset = async (
    file: File,
    assetType: "logo" | "favicon" | "default-avatar",
  ) => {
    const allowedMimeTypes =
      assetType === "favicon"
        ? ["image/x-icon", "image/vnd.microsoft.icon"]
        : assetType === "default-avatar"
          ? ["image/png"]
          : ["image/jpeg"];
    const validationError = validateUploadFile(file, {
      allowedMimeTypes,
      maxBytes: 10 * 1024 * 1024,
    });
    if (validationError) {
      setBrandAssetError(validationError);
      return;
    }
    setBrandAssetError(null);
    await enqueueImageUpload(async () => {
      try {
        const form = new FormData();
        form.append("assetType", assetType);
        form.append("file", file);
        const response = await fetch("/api/auth/profile-assets/upload", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.url) {
          setBrandAssetError(
            response.ok
              ? createUploadFailureError()
              : inlineRequestErrorFromResponse(response),
          );
          return null;
        }
        const key =
          assetType === "default-avatar" ? "default_avatar" : assetType;
        setData((current) => ({ ...current, [key]: result.url }));
        return result.url;
      } catch {
        setBrandAssetError(createUploadFailureError());
        return null;
      }
    });
  };

  if (loading)
    return (
      <SkeletonDashboardPage body="form" statCount={4} tabCount={tabs.length} />
    );

  return (
    <section
      className="relative w-full space-y-5 pb-10 dark:[color-scheme:dark]"
      dir="ltr"
    >
      <StatCardGrid className="mb-5">
        <StatCard
          icon={SlidersHorizontal}
          label="تابەکان"
          value="4"
          color="blue"
        />
        <StatCard
          icon={Building2}
          label="ناوی بزنس"
          value={data.name || "—"}
          color="green"
        />
        <StatCard
          icon={Palette}
          label="قالبی بنەڕەتی"
          value={data.default_template || "—"}
          color="purple"
        />
        <StatCard
          icon={ShieldCheck}
          label="دۆخی هەژمار"
          value={
            data.profile_request_status === "pending" ? "چاوەڕوان" : "چالاک"
          }
          color={data.profile_request_status === "pending" ? "orange" : "green"}
        />
      </StatCardGrid>
      <div>
        <div className="mb-4">
          <SegmentedTabs tabs={tabs} value={activeTab} onChange={setTab} />
        </div>

        <LockedContent
          locked={tabLocked}
          icon={ShieldCheck}
          description="بۆ بەکارهێنانی ئەم بەشە پێویستە پلانی بەشداربوونت بەرزبکەیتەوە"
        >
          <DashboardSurface>
            {activeTab === "profile" && (
              <PageHeaderSection
                icon={Building2}
                title="پڕۆفایلی بزنس"
                description="گۆڕانکارییەکانی ناسنامە دوای پەسەندکردنی بەڕێوەبەری پلاتفۆرم بڵاودەبنەوە"
                action={
                  <TabSaveButton
                    dirty={dirty}
                    saving={saving}
                    disabled={tabLocked}
                    accent
                    onSave={() => void save()}
                  />
                }
              >
                {data.profile_request_status === "pending" && (
                  <div className="col-span-full flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    <Clock3 className="h-4 w-4" />
                    داواکارییەکەت چاوەڕێی پەسەندکردنی بەڕێوەبەری پلاتفۆرمە
                  </div>
                )}
                <div className="col-span-full">
                  <BrandImageStack
                    data={data}
                    onUpload={uploadBrandAsset}
                    enabled={brandingEditingAllowed}
                  />
                  {brandAssetError && (
                    <InlineRequestError
                      className="mx-auto mt-3 max-w-xl"
                      error={brandAssetError}
                    />
                  )}
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(true)}
                      disabled={!profileEditingAllowed}
                      className="group inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-white hover:text-gray-800 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-gray-100"
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm"
                        style={{
                          background: parseWebsiteColor(data.website_color).css,
                        }}
                      >
                        <Palette className="h-3.5 w-3.5" />
                      </span>
                      <span>ڕەنگی وێبسایت</span>
                    </button>
                  </div>
                </div>
                <Field label="ناوی بزنس">
                  <input
                    className={inputClass}
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    placeholder="ناوی بزنس"
                    disabled={!profileEditingAllowed}
                  />
                </Field>
                <Field label="ژمارەی مۆبایل">
                  <input
                    className={inputClass}
                    value={data.phone || ""}
                    onChange={(e) =>
                      setData({ ...data, phone: e.target.value })
                    }
                    placeholder="+964 7XX XXX XXXX"
                    disabled={!profileEditingAllowed}
                  />
                </Field>
                <Field label="ناوی بەکارهێنەر">
                  <input
                    className={`${inputClass} ${usernameEditingAllowed ? "" : "opacity-70"}`}
                    value={data.username}
                    onChange={(e) =>
                      setData({ ...data, username: e.target.value })
                    }
                    readOnly={!usernameEditingAllowed}
                    placeholder="ناوی بەکارهێنەر"
                  />
                </Field>
                <Field label="سەبدۆمەین">
                  <input
                    className={`${inputClass} opacity-70`}
                    value={data.subdomain}
                    readOnly
                    placeholder="سەبدۆمەین"
                  />
                </Field>
              </PageHeaderSection>
            )}

            {activeTab === "defaults" && (
              <>
                <PageHeaderSection
                  icon={Palette}
                  title="پەڕە بنەڕەتییەکان"
                  description="ڕووکار و ناوەڕۆکی سەرەتایی پەڕە نوێیەکان دیاری بکە"
                  action={
                    <TabSaveButton
                      dirty={dirty}
                      saving={saving}
                      disabled={tabLocked}
                      accent
                      onSave={() => void save()}
                    />
                  }
                >
                  <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="قالبی بنەڕەتی">
                        <TemplateCombobox
                          value={data.default_template}
                          onChange={(value) =>
                            setData({ ...data, default_template: value })
                          }
                        />
                      </Field>
                      <Field label="ڕەنگی پاشبنەما">
                        <button
                          type="button"
                          onClick={() => setShowDefaultColorPicker(true)}
                          className={`${inputClass} flex items-center justify-between gap-3`}
                        >
                          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {data.default_background_color || "ڕەنگی پاشبنەما"}
                          </span>
                          <span
                            className="h-5 w-5 shrink-0 rounded border-2 border-white shadow-sm ring-1 ring-slate-200 dark:border-[#161B22] dark:ring-white/10"
                            style={{
                              background: parseWebsiteColor(
                                data.default_background_color || "#000000",
                              ).css,
                            }}
                          />
                        </button>
                      </Field>
                      <Field label="دەقی فوتر">
                        <input
                          className={inputClass}
                          value={data.default_footer_text || ""}
                          onChange={(e) =>
                            setData({
                              ...data,
                              default_footer_text: e.target.value,
                            })
                          }
                          placeholder="دەقی بنەڕەتی فوتر"
                        />
                      </Field>
                      <Field label="ژمارەی فوتر">
                        <input
                          className={inputClass}
                          value={data.default_footer_phone || ""}
                          onChange={(e) =>
                            setData({
                              ...data,
                              default_footer_phone: e.target.value,
                            })
                          }
                          placeholder="+964 7XX XXX XXXX"
                        />
                      </Field>
                      <Toggle
                        label="شاردنەوەی فوتر"
                        checked={data.default_footer_hidden}
                        onChange={(value) =>
                          setData({ ...data, default_footer_hidden: value })
                        }
                      />
                      <Toggle
                        label="چالاککردنی مۆداڵی واتساپ"
                        checked={data.default_whatsapp_enabled}
                        onChange={(value) =>
                          setData({ ...data, default_whatsapp_enabled: value })
                        }
                      />
                    </div>
                  </div>
                </PageHeaderSection>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  {defaultLinktree === undefined ? (
                    <div
                      className="flex items-center gap-3.5"
                      role="status"
                      aria-label="Loading default Linktree"
                    >
                      <Skeleton className="h-12 w-12 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Skeleton
                          className="mb-2 h-4 w-40 max-w-full"
                          rounded="rounded-md"
                        />
                        <Skeleton
                          className="h-3 w-56 max-w-full"
                          rounded="rounded-md"
                        />
                      </div>
                    </div>
                  ) : defaultLinktree ? (
                    <div className="flex items-center gap-3.5">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-inset ring-slate-200 dark:ring-white/10"
                        style={{
                          background:
                            "color-mix(in srgb, var(--theme-primary, #64748b) 12%, white)",
                        }}
                      >
                        {defaultLinktree.image ? (
                          <Image
                            src={defaultLinktree.image}
                            alt={defaultLinktree.name}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FileText
                            className="h-5 w-5"
                            style={{ color: "var(--theme-primary, #64748b)" }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-700 truncate dark:text-slate-200">
                            {defaultLinktree.name}
                          </p>
                          <span
                            className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              background:
                                "color-mix(in srgb, var(--theme-primary, #64748b) 14%, white)",
                              color: "var(--theme-primary, #64748b)",
                            }}
                          >
                            بنەڕەت
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-slate-400 dark:text-slate-500">
                          {defaultLinktree.uid}
                          {defaultLinktree.seo_name &&
                            ` · ${defaultLinktree.seo_name}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 text-center">
                      <div
                        className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
                        style={{
                          background:
                            "color-mix(in srgb, var(--theme-primary, #64748b) 12%, white)",
                        }}
                      >
                        <FileText
                          className="h-5 w-5"
                          style={{ color: "var(--theme-primary, #64748b)" }}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        هیچ پەیجی بنەڕەتێک نییە
                      </p>
                      <p className="mx-auto mt-1 mb-4 max-w-sm text-xs text-slate-400 dark:text-slate-500">
                        یەکەم پەڕەت دروست بکە تا وەک پەیجی بنەڕەتی بزنسەکەت
                        کاربکات
                      </p>
                      <AccentActionButton
                        onClick={() => void handleCreateDefaultPage()}
                        disabled={creatingDefault}
                      >
                        {creatingDefault ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {creatingDefault
                          ? "دروستکردن..."
                          : "دروستکردنی پەیجی بنەڕەت"}
                      </AccentActionButton>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "security" && (
              <PageHeaderSection
                icon={ShieldCheck}
                title="Google و دانیشتنەکان"
                description="چوونەژوورەوە تەنها بە هەژماری Googleـی پشتڕاستکراو دەکرێت. پاسۆردی بزنس بوونی نییە."
              >
                <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  ئیمەیڵی خاوەن: <strong>{data.email}</strong>. چوونەژوورەوەی
                  نوێ دانیشتنی پێشوو دادەخات.
                </div>
                <SessionManagementPanel endpoint="/api/auth/sessions" />
              </PageHeaderSection>
            )}

            {Boolean(0) && activeTab === "security" && (
              <PageHeaderSection
                icon={KeyRound}
                title="چوونەژوورەوە و دانیشتنەکان"
                description="وشەی نهێنی، ئامێرە چالاکەکان و مێژووی چوونەژوورەوە بەڕێوەببە"
                action={
                  <TabSaveButton
                    dirty={dirty}
                    saving={saving}
                    disabled={tabLocked}
                    accent
                    onSave={() => void save()}
                  />
                }
              >
                <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="ئیمەیڵ">
                      <input
                        type="email"
                        className={inputClass}
                        value={data.email || ""}
                        onChange={(e) =>
                          setData({ ...data, email: e.target.value })
                        }
                        placeholder="ئیمێڵەکەت بنووسە (داواکراو نییە)"
                      />
                    </Field>
                    <Field label="وشەی نهێنی ئێستا">
                      <div className="relative">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          autoComplete="current-password"
                          className={`${inputClass} pr-11`}
                          value={passwords.current_password}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              current_password: e.target.value,
                            })
                          }
                          placeholder="وشەی نهێنی ئێستا"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw((v) => !v)}
                          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        >
                          {showCurrentPw ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </Field>
                    <Field label="وشەی نهێنی نوێ">
                      <div className="relative">
                        <input
                          type={showNewPw ? "text" : "password"}
                          autoComplete="new-password"
                          className={`${inputClass} pr-11`}
                          value={passwords.new_password}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              new_password: e.target.value,
                            })
                          }
                          placeholder="وشەی نهێنی نوێ"
                        />
                        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                          {passwordStrength && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${passwordStrength.textColor} bg-slate-100 dark:bg-white/10`}
                            >
                              {passwordStrength.label}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowNewPw((v) => !v)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          >
                            {showNewPw ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        {passwordReqs.map((r) => (
                          <div
                            key={r.key}
                            className={`flex items-center gap-1.5 text-[11px] ${r.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}
                          >
                            {r.met ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            {r.label}
                          </div>
                        ))}
                      </div>
                    </Field>
                    <Field label="دووبارەکردنەوەی وشەی نهێنی">
                      <div className="relative">
                        <input
                          type={showConfirmPw ? "text" : "password"}
                          autoComplete="new-password"
                          className={`${inputClass} pr-11`}
                          value={passwords.confirm_password}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              confirm_password: e.target.value,
                            })
                          }
                          placeholder="دووبارەکردنەوەی وشەی نهێنی"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw((v) => !v)}
                          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        >
                          {showConfirmPw ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {passwords.confirm_password && (
                        <div
                          className={`mt-2 flex items-center gap-1.5 text-[11px] ${passwords.confirm_password === passwords.new_password ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}
                        >
                          {passwords.confirm_password ===
                          passwords.new_password ? (
                            <>
                              <Check className="h-3 w-3" />
                              وشە نهێنییەکان یەکسانن
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              وشە نهێنییەکان یەکسان نین
                            </>
                          )}
                        </div>
                      )}
                    </Field>
                  </div>
                </div>
                <SessionManagementPanel endpoint="/api/auth/sessions" />
              </PageHeaderSection>
            )}

            {activeTab === "messages" && (
              <PageHeaderSection
                icon={MessageSquare}
                title="پەیامەکان"
                description="پەیام بنێرە بۆ بەڕێوەبەری پلاتفۆرم و وەڵامەکانی ببینە"
              >
                <div className="col-span-full">
                  <BusinessMessagesPanel
                    initialConversationId={initialConversationId}
                  />
                </div>
              </PageHeaderSection>
            )}
          </DashboardSurface>
        </LockedContent>
        <ColorGradientModal
          isOpen={showColorPicker}
          value={data.website_color}
          onChange={(value) =>
            setData((current) => ({ ...current, website_color: value }))
          }
          onClose={() => setShowColorPicker(false)}
          solidFallback="#000000"
          gradientFallback="#0066ff"
        />
        <ColorGradientModal
          isOpen={showDefaultColorPicker}
          value={data.default_background_color}
          onChange={(value) =>
            setData((current) => ({
              ...current,
              default_background_color: value,
            }))
          }
          onClose={() => setShowDefaultColorPicker(false)}
          solidFallback="#000000"
          gradientFallback="#0066ff"
        />
      </div>
    </section>
  );
}
function normalizeSettings(
  value: Partial<SettingsData> | null | undefined,
): SettingsData {
  const raw = value || {};
  const pending = raw.pending_profile_changes || {};
  return {
    ...emptySettings,
    ...raw,
    ...pending,
    pending_profile_changes: raw.pending_profile_changes,
    profile_request_status: raw.profile_request_status,
  };
}

function BrandImageStack({
  data,
  onUpload,
  enabled,
}: {
  data: SettingsData;
  onUpload: (file: File, type: "logo" | "favicon" | "default-avatar") => void;
  enabled: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 py-1 ${
        enabled ? "" : "pointer-events-none opacity-60"
      }`}
    >
      <div className="relative h-44 w-72 sm:h-48 sm:w-80">
        <label className="group absolute left-5 top-7 z-30 h-24 w-24 rotate-[-8deg] cursor-pointer overflow-hidden rounded-full border-4 border-white bg-white shadow-xl ring-1 ring-gray-200 transition hover:rotate-0 hover:scale-105 dark:border-[#161B22] dark:bg-[#161B22] dark:ring-white/10">
          <Image
            src={data.default_avatar || "/images/DefaultAvatar.png"}
            alt="Default avatar"
            width={112}
            height={112}
            className="h-full w-full object-cover"
          />
          <UploadOverlay label="ئەڤاتار" />
          <input
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] &&
              onUpload(e.target.files[0], "default-avatar")
            }
          />
        </label>
        <label className="group absolute right-6 top-4 z-30 h-20 w-20 rotate-[10deg] cursor-pointer overflow-hidden rounded-2xl border-4 border-white bg-white p-2 shadow-lg ring-1 ring-gray-200 transition hover:rotate-0 hover:scale-105 dark:border-[#161B22] dark:bg-[#161B22] dark:ring-white/10">
          <Image
            src={data.favicon || "/images/Logo.jpg"}
            alt="Favicon"
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />
          <UploadOverlay label="فایڤ" />
          <input
            type="file"
            accept=".ico,image/x-icon"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && onUpload(e.target.files[0], "favicon")
            }
          />
        </label>
        <label className="group absolute left-1/2 top-12 z-20 h-32 w-32 -translate-x-1/2 cursor-pointer overflow-hidden rounded-3xl border-4 border-white bg-white p-3 shadow-2xl ring-1 ring-gray-200 transition hover:scale-105 dark:border-[#161B22] dark:bg-[#161B22] dark:ring-white/10">
          <Image
            src={data.logo || "/images/Logo.jpg"}
            alt="Logo"
            width={144}
            height={144}
            className="h-full w-full object-contain"
          />
          <UploadOverlay label="لۆگۆ" />
          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && onUpload(e.target.files[0], "logo")
            }
          />
        </label>
      </div>
      <div className="-mt-2 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#161B22]/90 dark:text-gray-300">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: "var(--theme-primary)" }}
        />
        Logo<span>·</span>Avatar<span>·</span>Favicon
      </div>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-[#161B22] dark:text-slate-300"
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${checked ? "" : "bg-slate-200 dark:bg-slate-700"}`}
        style={checked ? { background: "var(--theme-css)" } : undefined}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full shadow transition ${checked ? "left-6" : "left-1 bg-white"}`}
          style={checked ? { background: "var(--theme-ink)" } : undefined}
        />
      </span>
    </button>
  );
}
