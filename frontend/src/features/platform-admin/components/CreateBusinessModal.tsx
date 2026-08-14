"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import {
  memo,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Loader2, X } from "lucide-react";
import { BusinessInfoStep } from "@/features/link-editor/components/BusinessInfoStep";
import { debounce } from "@/lib/utils/debounce";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { useSubmissionLock } from "@/hooks/useSubmissionLock";
import { buildSlugFromName } from "@/features/link-editor/modal-utils";
import type { PlatformBusiness } from "@linktree/types";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import {
  createUploadFailureError,
  inlineRequestErrorFromResponse,
  type InlineRequestErrorData,
  validateUploadFile,
} from "@/lib/api/inline-request-error";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";
import {
  AVATAR_MIME_TYPES,
  FAVICON_MIME_TYPES,
  LOGO_MIME_TYPES,
} from "@/lib/brand/brand-assets";

type Business = Pick<
  PlatformBusiness,
  "id" | "username" | "name" | "status" | "created_at" | "updated_at"
> &
  Partial<PlatformBusiness>;

interface SubscriptionPlanOption {
  id: string;
  name: string;
  permissionProfileName: string;
  status: string;
  isDefault: boolean;
}

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    username?: string;
    subscriptionPlanId?: string;
    subdomain?: string;
    phone?: string;
    logo?: string | null;
    favicon?: string | null;
    default_avatar?: string | null;
    website_color?: string;
    pixel_id?: string;
    events_token?: string;
    tiktok_configs?: Array<{ pixel_id: string; events_token: string }>;
  }, editId?: string) => void;
  editData?: Business | null;
  isLoadingEditData?: boolean;
  existingBusinesses?: Array<{
    id: string;
    username: string;
    name: string;
    subdomain?: string | null;
  }>;
}

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;
const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const GRADIENT_PATTERN = /^gradient:([\w-]+):(#[0-9a-fA-F]{3,6}):(#[0-9a-fA-F]{3,6})$/;

function sanitizeHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 32);
}

function buildHandleFromName(value: string): string {
  return sanitizeHandle(buildSlugFromName(value));
}

function sanitizeLocalPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("964")) digits = digits.slice(3);
  return digits.slice(0, 15);
}

function isValidColorValue(value: string): boolean {
  return HEX_PATTERN.test(value.trim()) || GRADIENT_PATTERN.test(value.trim());
}

export const CreateBusinessModal = memo(function CreateBusinessModal({
  isOpen,
  onClose,
  onSubmit,
  editData,
  isLoadingEditData = false,
  existingBusinesses = [],
}: CreateBusinessModalProps) {
  const [businessName, setBusinessName] = useState("");
  const [username, setUsername] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlanOption[]>([]);
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(false);
  const [tiktokConfigs, setTikTokConfigs] = useState<Array<{ pixel_id: string; events_token: string }>>([]);
  const [websiteColor, setWebsiteColor] = useState(MULTITREE_ACCENT_COLOR);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [defaultAvatarFile, setDefaultAvatarFile] = useState<File | null>(null);
  const [defaultAvatarPreview, setDefaultAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] =
    useState<InlineRequestErrorData | null>(null);

  const { isSubmitting, beginSubmission, resetSubmission } = useSubmissionLock();

  const [businessErrors, setBusinessErrors] = useState<{
    name?: string;
    username?: string;
    subdomain?: string;
    phone?: string;
    websiteColor?: string;
  }>({});
  const [businessTouched, setBusinessTouched] = useState<{
    name?: boolean;
    username?: boolean;
    subdomain?: boolean;
    phone?: boolean;
    websiteColor?: boolean;
  }>({});
  const [showAllValidation, setShowAllValidation] = useState(false);

  const isEditMode = !!editData;
  const initializedBusinessIdRef = useRef<string | null>(null);

  const allFieldsValid = useMemo(() => {
    if (isEditMode) return true;
    return (
      businessName.trim().length >= 2 &&
      HANDLE_PATTERN.test(sanitizeHandle(username)) &&
      HANDLE_PATTERN.test(sanitizeHandle(subdomain)) &&
      /^\d{7,15}$/.test(sanitizeLocalPhone(businessPhone)) &&
      !!subscriptionPlanId &&
      isValidColorValue(websiteColor) &&
      tiktokConfigs.some((c) => c.pixel_id.trim())
    );
  }, [businessName, username, subdomain, businessPhone, subscriptionPlanId, websiteColor, tiktokConfigs, isEditMode]);

  const validateBusinessName = useCallback(
    (value: string): string | undefined => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length < 2) return "Business name must be at least 2 characters";
      const exists = existingBusinesses.some(
        (business) => business.id !== editData?.id && business.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) return "Business name is already in use";
      return undefined;
    },
    [existingBusinesses, editData?.id],
  );

  const validateUsername = useCallback(
    (value: string): string | undefined => {
      const trimmed = sanitizeHandle(value);
      if (!trimmed) return "Username is required";
      if (!HANDLE_PATTERN.test(trimmed)) return "Username must be 3-32 lowercase letters, numbers, hyphens or underscores";
      const exists = existingBusinesses.some(
        (business) => business.id !== editData?.id && business.username.toLowerCase() === trimmed,
      );
      if (exists) return "Username is already in use";
      return undefined;
    },
    [existingBusinesses, editData?.id],
  );

  const validateBusinessPhone = useCallback(
    (value: string): string | undefined => {
      const trimmed = sanitizeLocalPhone(value);
      if (!trimmed) return "Phone number is required";
      if (!/^\d{7,15}$/.test(trimmed)) return "Phone number must be 7 to 15 digits without 964";
      return undefined;
    },
    [],
  );

  const validateSubdomain = useCallback(
    (value: string): string | undefined => {
      const trimmed = sanitizeHandle(value);
      if (!trimmed) return "Subdomain is required";
      if (!HANDLE_PATTERN.test(trimmed))
        return "Subdomain must be 3-32 lowercase letters, numbers, hyphens or underscores";
      const exists = existingBusinesses.some(
        (business) => business.id !== editData?.id && (business.subdomain || "").toLowerCase() === trimmed,
      );
      if (exists) return "Subdomain is already in use";
      return undefined;
    },
    [existingBusinesses, editData?.id],
  );

  const validateWebsiteColor = useCallback(
    (value: string): string | undefined => isValidColorValue(value) ? undefined : "Choose a valid website color",
    [],
  );

  const debouncedBusinessNameValidation = useMemo(
    () =>
      debounce((value: unknown) => {
        if (businessTouched.name && typeof value === "string")
          setBusinessErrors((prev) => ({ ...prev, name: validateBusinessName(value) }));
      }, 200),
    [businessTouched.name, validateBusinessName],
  );

  const handleBusinessNameChange = useCallback(
    (value: string) => {
      setBusinessName(value);
      debouncedBusinessNameValidation(value);
      const generated = buildHandleFromName(value);
      if (!isEditMode && generated) {
        if (!businessTouched.username) setUsername(generated);
        if (!businessTouched.subdomain) setSubdomain(generated);
      }
    },
    [businessTouched.username, businessTouched.subdomain, debouncedBusinessNameValidation, isEditMode],
  );

  const handleBusinessNameBlur = useCallback(() => {
    setBusinessTouched((prev) => ({ ...prev, name: true }));
    setBusinessErrors((prev) => ({ ...prev, name: validateBusinessName(businessName) }));
  }, [businessName, validateBusinessName]);

  const handleUsernameChange = useCallback(
    (value: string) => {
      const next = sanitizeHandle(value);
      setUsername(next);
      setBusinessTouched((prev) => ({ ...prev, username: true }));
      setBusinessErrors((prev) => ({ ...prev, username: validateUsername(next) }));
    },
    [validateUsername],
  );


  const handleSubdomainChange = useCallback(
    (value: string) => {
      const next = value.toLowerCase().trim();
      setSubdomain(next);
      setBusinessTouched((prev) => ({ ...prev, subdomain: true }));
      setBusinessErrors((prev) => ({ ...prev, subdomain: validateSubdomain(next) }));
    },
    [validateSubdomain],
  );

  const handleSubdomainBlur = useCallback(() => {
    setBusinessTouched((prev) => ({ ...prev, subdomain: true }));
    setBusinessErrors((prev) => ({ ...prev, subdomain: validateSubdomain(subdomain) }));
  }, [subdomain, validateSubdomain]);

  const handleGenerateSubdomain = useCallback(() => {
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    setSubdomain("adm-" + rand);
    setBusinessTouched((prev) => ({ ...prev, subdomain: true }));
    setBusinessErrors((prev) => ({ ...prev, subdomain: undefined }));
  }, []);

  const handleBusinessPhoneChange = useCallback(
    (value: string) => {
      const next = sanitizeLocalPhone(value);
      setBusinessPhone(next);
      setBusinessTouched((prev) => ({ ...prev, phone: true }));
      setBusinessErrors((prev) => ({ ...prev, phone: validateBusinessPhone(next) }));
    },
    [validateBusinessPhone],
  );

  const handleWebsiteColorChange = useCallback(
    (value: string) => {
      setWebsiteColor(value);
      setBusinessErrors((prev) => ({ ...prev, websiteColor: validateWebsiteColor(value) }));
    },
    [validateWebsiteColor],
  );

  const handleWebsiteColorBlur = useCallback(() => {
    setBusinessTouched((prev) => ({ ...prev, websiteColor: true }));
    setBusinessErrors((prev) => ({ ...prev, websiteColor: validateWebsiteColor(websiteColor) }));
  }, [validateWebsiteColor, websiteColor]);

  const handleLogoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const validationError = validateUploadFile(file, {
          allowedMimeTypes: LOGO_MIME_TYPES,
          maxBytes: 10 * 1024 * 1024,
        });
        if (validationError) {
          setUploadError(validationError);
          return;
        }
        setUploadError(null);
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            const toHex = (c: number) => c.toString(16).padStart(2, "0");
            setWebsiteColor(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
          }
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => URL.revokeObjectURL(img.src);
        img.src = URL.createObjectURL(file);
      }
    },
    [],
  );

  const handleFaviconChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const validationError = validateUploadFile(file, {
          allowedMimeTypes: FAVICON_MIME_TYPES,
          maxBytes: 10 * 1024 * 1024,
        });
        if (validationError) {
          setUploadError(validationError);
          return;
        }
        setUploadError(null);
        setFaviconFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setFaviconPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    [],
  );

  const handleDefaultAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const validationError = validateUploadFile(file, {
          allowedMimeTypes: AVATAR_MIME_TYPES,
          maxBytes: 10 * 1024 * 1024,
        });
        if (validationError) {
          setUploadError(validationError);
          return;
        }
        setUploadError(null);
        setDefaultAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setDefaultAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    },
    [],
  );

  const uploadImage = async (
    file: File,
    assetType: "logo" | "favicon" | "default-avatar",
  ): Promise<string | null> => {
setUploadError(null);
    return enqueueImageUpload(async () => {
      try {
        const formData = new FormData();
        const businessKey = (subdomain || username || businessName || "pending-business").trim().toLowerCase();
        formData.append("file", file);
        formData.append("scope", "business");
        formData.append("businessKey", businessKey);
        formData.append("assetType", assetType);

        const response = await fetch("/api/platform/businesses/upload", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          setUploadError(inlineRequestErrorFromResponse(response));
          return null;
        }
        const result = await response.json();
        return result.url || null;
      } catch {
        setUploadError(createUploadFailureError());
        return null;
      }
    });
  };

  useEffect(() => {
    if (!isOpen) {
      initializedBusinessIdRef.current = null;
      setUploadError(null);
      resetSubmission();
    }
  }, [isOpen, resetSubmission]);

  useModalKeyboard({ isOpen, onEscape: onClose });

  useEffect(() => {
    if (!isOpen || isLoadingEditData) return;
    const shouldInitialize = editData
      ? initializedBusinessIdRef.current !== editData.id
      : initializedBusinessIdRef.current !== "create";
    if (!shouldInitialize) return;

    if (editData) {
      setBusinessName(editData.name || "");
      setUsername(editData.username || "");
      setSubdomain(editData.subdomain || "");
      setBusinessPhone(sanitizeLocalPhone(editData.phone || ""));
      setSubscriptionPlanId(editData.subscriptionPlanId || "");
      const configs = editData.tiktok_configs && editData.tiktok_configs.length > 0
        ? editData.tiktok_configs
        : [{ pixel_id: editData.pixel_id || "", events_token: editData.events_token || "" }];
      setTikTokConfigs(
        configs
          .slice(0, 3)
          .map((item) => ({ pixel_id: item.pixel_id?.trim() || "", events_token: item.events_token?.trim() || "" }))
          .filter((item) => item.pixel_id),
      );
      setWebsiteColor(editData.website_color || MULTITREE_ACCENT_COLOR);
      setLogoFile(null);
      setLogoPreview(editData.logo || null);
      setFaviconFile(null);
      setFaviconPreview(editData.favicon || null);
      setDefaultAvatarFile(null);
      setDefaultAvatarPreview(editData.default_avatar || null);
      initializedBusinessIdRef.current = editData.id;
    } else {
      setBusinessName("");
      setUsername("");
      setSubdomain("");
      setBusinessPhone("");
      setSubscriptionPlanId("");
      setTikTokConfigs([]);
      setWebsiteColor(MULTITREE_ACCENT_COLOR);
      setLogoFile(null);
      setLogoPreview(null);
      setFaviconFile(null);
      setFaviconPreview(null);
      setDefaultAvatarFile(null);
      setDefaultAvatarPreview(null);
      initializedBusinessIdRef.current = "create";
    }
  }, [editData, isOpen, isLoadingEditData]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setSubscriptionPlansLoading(true);
    void fetch("/api/platform/billing", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Failed to load subscription plans");
        const plans = (result.data?.plans || [] as SubscriptionPlanOption[]).filter(
          (plan: SubscriptionPlanOption) => plan.status === "active",
        );
        setSubscriptionPlans(plans);
        setSubscriptionPlanId((current) =>
          plans.some((plan: SubscriptionPlanOption) => plan.id === current)
            ? current
            : plans.find((plan: SubscriptionPlanOption) => plan.isDefault)?.id || plans[0]?.id || "",
        );
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to load subscription plans:", error);
        setSubscriptionPlans([]);
        setSubscriptionPlanId("");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSubscriptionPlansLoading(false);
      });
    return () => controller.abort();
  }, [isOpen]);

  const validateAllFields = useCallback((): boolean => {
    const nameErr = validateBusinessName(businessName);
    const usernameErr = validateUsername(username);
    const subErr = validateSubdomain(subdomain);
    const phoneErr = validateBusinessPhone(businessPhone);
    const websiteErr = validateWebsiteColor(websiteColor);

    setBusinessErrors({
      name: nameErr,
      username: usernameErr,
      subdomain: subErr,
      phone: phoneErr,
      websiteColor: websiteErr,
    });
    setBusinessTouched({
      name: true,
      username: true,
      subdomain: true,
      phone: true,
      websiteColor: true,
    });

    return !nameErr && !usernameErr && !subErr && !phoneErr && !websiteErr && !!subscriptionPlanId;
  }, [
    businessName, username, subdomain, businessPhone, websiteColor,
    subscriptionPlanId, validateBusinessName, validateUsername,
    validateSubdomain, validateBusinessPhone, validateWebsiteColor,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!beginSubmission()) return;

    try {
      if (!validateAllFields()) throw new Error("Validation failed");

      let uploadedLogoUrl: string | null = null;
      if (logoFile) {
        uploadedLogoUrl = await uploadImage(logoFile, "logo");
        if (!uploadedLogoUrl) throw new Error("Logo upload failed");
      }
      else if (logoPreview) uploadedLogoUrl = logoPreview;

      // The favicon follows a newly picked logo, reusing the same uploaded
      // file. Picking a favicon explicitly still wins over it. The default
      // avatar is deliberately left alone — it stands in for a person, not for
      // the brand.
      let uploadedFaviconUrl: string | null = null;
      if (faviconFile) {
        uploadedFaviconUrl = await uploadImage(faviconFile, "favicon");
        if (!uploadedFaviconUrl) throw new Error("Favicon upload failed");
      }
      else if (logoFile && uploadedLogoUrl) uploadedFaviconUrl = uploadedLogoUrl;
      else if (faviconPreview) uploadedFaviconUrl = faviconPreview;

      let uploadedDefaultAvatarUrl: string | null = null;
      if (defaultAvatarFile) {
        uploadedDefaultAvatarUrl = await uploadImage(defaultAvatarFile, "default-avatar");
        if (!uploadedDefaultAvatarUrl) throw new Error("Avatar upload failed");
      }
      else if (defaultAvatarPreview) uploadedDefaultAvatarUrl = defaultAvatarPreview;

      const submittedTikTokConfigs = tiktokConfigs
        .slice(0, 3)
        .map((item) => ({ pixel_id: item.pixel_id.trim(), events_token: item.events_token.trim() }))
        .filter((item) => item.pixel_id);
      const primaryTikTok = submittedTikTokConfigs[0];

      await onSubmit(
        {
          name: businessName.trim(),
          username: sanitizeHandle(username),
          subscriptionPlanId: subscriptionPlanId || undefined,
          subdomain: sanitizeHandle(subdomain),
          phone: sanitizeLocalPhone(businessPhone),
          ...(uploadedLogoUrl ? { logo: uploadedLogoUrl } : {}),
          ...(uploadedFaviconUrl ? { favicon: uploadedFaviconUrl } : {}),
          ...(uploadedDefaultAvatarUrl ? { default_avatar: uploadedDefaultAvatarUrl } : {}),
          website_color: websiteColor || MULTITREE_ACCENT_COLOR,
          pixel_id: primaryTikTok?.pixel_id || undefined,
          events_token: primaryTikTok?.events_token || undefined,
          tiktok_configs: submittedTikTokConfigs,
        },
        editData?.id,
      );

      resetSubmission();
    } catch {
      resetSubmission();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("multitree-theme-portals");
    return () => document.body.classList.remove("multitree-theme-portals");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-ltr fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      dir="ltr"
      data-multitree-theme
      style={{ "--theme-primary": "var(--multitree-accent)", "--theme-css": "var(--multitree-accent)" } as React.CSSProperties}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md   duration-300" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-2xl bg-primary-95 backdrop-blur-sm border border-gray-100 shadow-2xl    duration-300"
        style={{ contain: "layout style paint" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          <div className="flex items-center justify-between border-b border-gray-100/50 p-4 sm:p-5 md:p-6 bg-linear-to-r from-white to-slate-50/30" dir="ltr">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-700 truncate">
                {isEditMode ? "دەستکاریکردنی بزنس" : "زیادکردنی بزنسی نوێ"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">زانیارییە سەرەکییەکان و وێنەکانی بڕاند</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-xl p-2 bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-500 hover:text-slate-700 transition-all duration-300 border border-slate-100 shadow-sm hover:shadow"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 bg-linear-to-br from-white to-slate-50/20"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(156,163,175,0.5) transparent" }}
          >
            {uploadError && (
              <InlineRequestError className="mb-4" error={uploadError} />
            )}
            {isLoadingEditData ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MotionSpinner className="mb-4">
                  <span className="sa-border-top h-12 w-12 rounded-full border-3 border-slate-200" />
                </MotionSpinner>
                <p className="text-sm text-slate-500">Loading business data...</p>
              </div>
            ) : (
              <BusinessInfoStep
                name={businessName}
                ownerName={editData?.ownerName || editData?.name}
                ownerEmail={editData?.ownerEmail || editData?.email}
                username={username}
                subdomain={subdomain}
                phone={businessPhone}
                subscriptionPlanId={subscriptionPlanId}
                subscriptionPlans={subscriptionPlans}
                subscriptionPlansLoading={subscriptionPlansLoading}
                tiktokConfigs={tiktokConfigs}
                websiteColor={websiteColor}
                onNameChange={handleBusinessNameChange}
                onNameBlur={handleBusinessNameBlur}
                onUsernameChange={handleUsernameChange}
                onSubdomainChange={handleSubdomainChange}
                onSubdomainBlur={handleSubdomainBlur}
                onGenerateSubdomain={handleGenerateSubdomain}
                onPhoneChange={handleBusinessPhoneChange}
                onSubscriptionPlanChange={setSubscriptionPlanId}
                onTikTokConfigsChange={setTikTokConfigs}
                onWebsiteColorChange={handleWebsiteColorChange}
                onWebsiteColorBlur={handleWebsiteColorBlur}
                errors={businessErrors}
                touched={businessTouched}
                isEditMode={isEditMode}
                onLogoChange={handleLogoChange}
                onDefaultAvatarChange={handleDefaultAvatarChange}
                onFaviconChange={handleFaviconChange}
                logoPreview={logoPreview}
                faviconPreview={faviconPreview}
                defaultAvatarPreview={defaultAvatarPreview}
              />
            )}
          </div>

          <div
            className="flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-gray-100/50 p-4 sm:p-5 md:p-6 bg-linear-to-r from-white to-slate-50/30"
            onMouseEnter={() => {
              if (isEditMode || showAllValidation) return;
              setShowAllValidation(true);
              setBusinessTouched({ name: true, username: true, subdomain: true, phone: true, websiteColor: true });
              setBusinessErrors({
                name: validateBusinessName(businessName),
                username: validateUsername(username),
                subdomain: validateSubdomain(subdomain),
                phone: validateBusinessPhone(businessPhone),
                websiteColor: validateWebsiteColor(websiteColor),
              });
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border border-slate-100 text-slate-600 hover:text-slate-700 text-xs sm:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow"
            >
              هەڵوەشاندنەوە
            </button>
            <button
                type="submit"
                disabled={isSubmitting || isLoadingEditData || subscriptionPlansLoading || (!isEditMode && !allFieldsValid)}
                className="w-full rounded-xl px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold sa-ink shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sa-gradient sa-gradient-hover"
              >
                {isSubmitting ? (
                  <>
                    <MotionSpinner><Loader2 className="h-4 w-4 "  /></MotionSpinner>
                    <span>پاشەکەوتکردن...</span>
                  </>
                ) : (
                  <span>{isEditMode ? "نوێکردنەوە" : "دروستکردن"}</span>
                )}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
});
