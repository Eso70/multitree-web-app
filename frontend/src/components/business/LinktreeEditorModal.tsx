"use client";

import {
  memo,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { BasicInfoStep } from "@/features/link-editor/components/BasicInfoStep";
import { PlatformSelectionStep } from "@/features/link-editor/components/PlatformSelectionStep";
import { LinksStep } from "@/features/link-editor/components/LinksStep";
import {
  BACKGROUND_COLORS,
  DEFAULT_SUBTITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_FOOTER_TEXT,
  DEFAULT_FOOTER_PHONE,
  getPlatformNameKurdish,
} from "@/features/link-editor/modal-constants";
import {
  buildSlugFromName,
  generateUrl,
  extractValueFromUrl,
} from "@/features/link-editor/modal-utils";
import {
  validateLinktreeName,
  validateSingleLink,
  validateSlug as validateSlugValue,
  validateWhatsappQuestion,
} from "@/features/link-editor/components/validation";
import {
  TEMPLATE_DEFAULT_ID,
  isTemplateKey,
  normalizeTemplateConfig,
} from "@/lib/templates/config";
import { debounce } from "@/lib/utils/debounce";
import type { WhatsAppQuestion } from "@/components/public/WhatsAppQuestionModal";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { ModalWizardProgress } from "@/components/shared/ModalWizardProgress";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { shouldAdvanceModalWizardOnEnter } from "@/components/shared/modal-wizard-keyboard";
import { useSubmissionLock } from "@/hooks/useSubmissionLock";
import type { SocialLink } from "@/features/link-editor/types";
import {
  groupSocialLinksByPlatform,
  normalizeSelectedSocialLinks,
} from "@/features/link-editor/link-payload";
import { useTheme } from "@/lib/contexts/ThemeProvider";
import { InlineRequestError } from "@/components/shared/InlineRequestError";
import { SkeletonLinktreeBasicInfo } from "@/components/shared/SkeletonModalLayouts";
import {
  createUploadFailureError,
  inlineRequestErrorFromResponse,
  type InlineRequestErrorData,
  validateUploadFile,
} from "@/lib/api/inline-request-error";
import { enqueueImageUpload } from "@/lib/api/enqueue-image-upload";
import {
  BACKGROUND_IMAGE_CONFIG_KEY,
  isBackgroundImageUrl,
  readBackgroundImage,
} from "@/lib/templates/background-image";
import { readBackgroundPattern } from "@/lib/templates/background-pattern";
import {
  BACKGROUND_PATTERN_CONFIG_KEY,
  BACKGROUND_PATTERN_DEFAULT,
  type BackgroundPatternStyle,
} from "@linktree/types";
import type {
  EditLinkData,
  LinktreeEditorSubmitData,
} from "@/features/link-editor/editor-types";
export type {
  EditLinkData,
  LinktreeEditorSubmitData,
} from "@/features/link-editor/editor-types";

export interface LinktreeEditorWorkflow {
  /** Local demo mode never calls availability or upload endpoints. */
  persistence: "api" | "browser-local";
  allowedTemplateKeys?: readonly string[];
  maxLinks?: number;
  allowImageUploads?: boolean;
  maxImageBytes?: number;
  hideBusinessFields?: boolean;
  hideFooterSection?: boolean;
  hideWhatsappQuestions?: boolean;
  title?: string;
  submitLabel?: string;
}

export interface LinktreeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDefault?: boolean;
  onSubmit: (data: LinktreeEditorSubmitData, editId?: string) => void;
  editData?: EditLinkData | null;
  isLoadingEditData?: boolean;
  /** Business defaults set by the platform administrator. */
  businessDefaults?: {
    default_footer_text?: string | null;
    default_footer_phone?: string | null;
    default_template?: string | null;
    default_background_color?: string | null;
    default_footer_hidden?: boolean;
    default_whatsapp_enabled?: boolean;
    default_avatar?: string | null;
  } | null;
  businessIdentity?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  apiEndpoints?: {
    upload: string;
    checkSlug: string;
    checkName: string;
  };
  workflow?: LinktreeEditorWorkflow;
}

const DEFAULT_API_ENDPOINTS = {
  upload: "/api/linktrees/upload",
  checkSlug: "/api/linktrees/check-slug",
  checkName: "/api/linktrees/check-name",
} as const;

/**
 * What a new page's canvas starts as when the business has set no page default.
 *
 * White, and never the tenant colour — `website_color` themes the dashboard and
 * the public shell, and presetting it here made every new page open on the
 * brand colour. Mirrors DEFAULT_LINKTREE_BACKGROUND_COLOR in
 * backend/src/common/linktree-defaults.ts.
 */
const DEFAULT_BACKGROUND_COLOR = "#ffffff";

function extractSolidHex(color: string | undefined | null): string {
  if (!color) return "";
  const trimmed = color.trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
  if (trimmed.startsWith("gradient:")) {
    const parts = trimmed.split(":");
    if (parts.length >= 4 && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(parts[2])) {
      return parts[2];
    }
  }
  return "";
}

function resolveDefaultBackgroundColor(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_BACKGROUND_COLOR;
  }

  const preset = BACKGROUND_COLORS.find((color) => {
    return (
      color.id === trimmed ||
      color.value.toLowerCase() === trimmed.toLowerCase()
    );
  });

  return preset?.value ?? trimmed;
}

function resolveDefaultTemplateKey(value?: string | null): string {
  return value && isTemplateKey(value) ? value : TEMPLATE_DEFAULT_ID;
}

function normalizeBusinessPhone(value?: string | null): {
  value: string;
  countryCode: string;
} {
  const digits = value?.replace(/\D/g, "") || "";
  if (!digits) return { value: "", countryCode: "964" };
  return extractValueFromUrl("phone", `tel:+${digits}`);
}

export const LinktreeEditorModal = memo(function LinktreeEditorModal({
  isOpen,
  onClose,
  onSubmit,
  editData,
  isLoadingEditData = false,
  businessDefaults,
  businessIdentity,
  isDefault = false,
  apiEndpoints = DEFAULT_API_ENDPOINTS,
  workflow = { persistence: "api" },
}: LinktreeEditorModalProps) {
  const isBrowserLocal = workflow.persistence === "browser-local";
  const maxLinks = workflow.maxLinks
    ? Math.max(1, Math.floor(workflow.maxLinks))
    : undefined;
  const defaultTemplateKey =
    workflow.allowedTemplateKeys?.[0] ??
    resolveDefaultTemplateKey(businessDefaults?.default_template);
  const { color: businessTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState<"basic" | "select" | "links">(
    "basic",
  );
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    businessDefaults?.default_avatar || null,
  );
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [subtitleColor, setSubtitleColor] = useState("");
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [slug, setSlug] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(() =>
    resolveDefaultBackgroundColor(businessDefaults?.default_background_color),
  );
  // A background image replaces the background colour on the public page. Like
  // the profile image, the file is held until submit and uploaded once.
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<
    string | null
  >(null);
  const [templateKey, setTemplateKey] = useState<string>(defaultTemplateKey);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const selectedPlatforms = useMemo(
    () =>
      [...socialLinks]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((link) => link.id),
    [socialLinks],
  );
  const { isSubmitting, beginSubmission, resetSubmission } =
    useSubmissionLock();
  const [footerText, setFooterText] = useState(
    businessDefaults?.default_footer_text || DEFAULT_FOOTER_TEXT,
  );
  const [footerPhone, setFooterPhone] = useState(
    businessDefaults?.default_footer_phone || DEFAULT_FOOTER_PHONE,
  );
  const [footerHidden, setFooterHidden] = useState(
    businessDefaults?.default_footer_hidden ?? false,
  );
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [templateConfig, setTemplateConfig] = useState<Record<string, unknown>>(
    () =>
      normalizeTemplateConfig(
        resolveDefaultTemplateKey(businessDefaults?.default_template),
        null,
      ),
  );

  // WhatsApp modal questions state
  const [whatsappModalEnabled, setWhatsappModalEnabled] = useState(
    businessDefaults?.default_whatsapp_enabled ?? false,
  );
  const [whatsappModalTitle, setWhatsappModalTitle] = useState("پەیوەندی کردن");
  const [whatsappModalSubtitle, setWhatsappModalSubtitle] =
    useState("پرسیارێک هەڵبژێرە");
  const [whatsappQuestions, setWhatsappQuestions] = useState<
    WhatsAppQuestion[]
  >([
    { id: "order", text: "داواکردن", message: "سڵاو بەڕێز دەمەوێت داوا بکەم." },
    { id: "price", text: "زانینی نرخ", message: "سڵاو بەڕێز، نرخی چەندە ؟" },
    { id: "other", text: "پرسیارێکی تر", message: "سڵاو" },
  ]);

  // Validation errors state
  const [errors, setErrors] = useState<{
    name?: string;
    slug?: string;
    backgroundColor?: string;
    templateKey?: string;
    platforms?: string;
    links?: string;
    footerPhone?: string;
    image?: string;
    questions?: string;
    subtitleColor?: string;
  }>({});

  // Per-link validation errors: { platformId_linkIndex: errorMessage }
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    slug?: boolean;
    backgroundColor?: boolean;
    templateKey?: boolean;
    platforms?: boolean;
    links?: boolean;
    footerPhone?: boolean;
    subtitleColor?: boolean;
  }>({});

  const [backgroundPattern, setBackgroundPattern] =
    useState<BackgroundPatternStyle>(BACKGROUND_PATTERN_DEFAULT);
  const [slugApiError, setSlugApiError] = useState<string | null>(null);
  /**
   * A duplicate display name is a warning, never an error: `linktrees.name`
   * has no unique constraint and two pages may legitimately share one. It is
   * surfaced so the owner does not end up with two cards they cannot tell
   * apart in the pages list.
   */
  const [nameWarning, setNameWarning] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<InlineRequestErrorData | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<InlineRequestErrorData | null>(
    null,
  );
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [questionErrors, setQuestionErrors] = useState<
    Record<string, { text?: string; message?: string }>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!editData;
  const initializedLinktreeIdRef = useRef<string | null>(null);

  // Generate unique ID for links - memoized to prevent dependency issues
  const generateLinkId = useCallback((platformId: string): string => {
    return `${platformId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Real-time validation, delegated to the shared rules so the modal, the DTO
  // and the table CHECK constraints cannot disagree.
  const validateName = useCallback(validateLinktreeName, []);

  const validateSlug = useCallback(validateSlugValue, []);

  /**
   * Half-filled question rows.
   *
   * The server drops a question that has a label but no message, so without
   * this the row the owner typed disappears on save with nothing said.
   */
  const validateQuestions = useCallback(
    (questions: WhatsAppQuestion[], enabled: boolean): string | undefined => {
      // The rows are only rendered while the modal is switched on. Blocking on
      // a row nobody can see would be an error with nowhere to point.
      if (!enabled) {
        setQuestionErrors({});
        return undefined;
      }
      const next: Record<string, { text?: string; message?: string }> = {};
      for (const question of questions) {
        const error = validateWhatsappQuestion(question);
        if (error) next[question.id] = error;
      }
      setQuestionErrors(next);
      return Object.keys(next).length > 0
        ? "تکایە پرسیارە ناتەواوەکان تەواو بکە"
        : undefined;
    },
    [],
  );

  const validateBackgroundColor = useCallback(
    (value: string): string | undefined => {
      const selectedBgColor =
        BACKGROUND_COLORS.find((c) => c.id === value)?.value || value;
      if (!selectedBgColor) {
        return "تکایە ڕەنگی باکگڕاوند هەڵبژێرە";
      }
      return undefined;
    },
    [],
  );

  const validateTemplateKey = useCallback(
    (value: string): string | undefined => {
      if (!value || !isTemplateKey(value)) {
        return "تکایە شێوازی پەڕە هەڵبژێرە";
      }
      if (
        workflow.allowedTemplateKeys &&
        !workflow.allowedTemplateKeys.includes(value)
      ) {
        return "ئەم شێوازی پەڕەیە بۆ ئەم بانگهێشتنامەیە ڕێگەپێنەدراوە";
      }
      return undefined;
    },
    [workflow.allowedTemplateKeys],
  );

  const validatePlatforms = useCallback(
    (platforms: string[]): string | undefined => {
      if (!platforms || platforms.length === 0) {
        return "لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە";
      }
      return undefined;
    },
    [],
  );

  const validateLinks = useCallback(
    (links: SocialLink[], selected: string[]): string | undefined => {
      if (!selected || selected.length === 0) {
        return "لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە";
      }
      if (maxLinks && selected.length > maxLinks) {
        return `زۆرترین ژمارەی لینک بۆ ئەم بانگهێشتنامەیە ${maxLinks} ـە`;
      }

      let hasError = false;
      const newLinkErrors: Record<string, string> = {};

      // Validate each link
      for (const linkId of selected) {
        const link = links.find((l) => l.id === linkId);
        if (!link) continue;

        const linkValue = link.value?.trim() || "";
        const linkUrl = link.url?.trim() || "";

        // Must have either value or URL
        if (!linkValue && !linkUrl) {
          newLinkErrors[linkId] = "تکایە بەهای لینکەکە بنووسە";
          hasError = true;
          continue;
        }

        const error = validateSingleLink(
          link.platform,
          linkValue,
          link.countryCode,
        );
        if (error) {
          newLinkErrors[linkId] = error;
          hasError = true;
        }
      }

      if (hasError) {
        setLinkErrors(newLinkErrors);
        return "تکایە هەڵەی لینکەکان چاک بکەرەوە";
      } else {
        setLinkErrors({});
      }

      return undefined;
    },
    [maxLinks],
  );

  const validateFooterPhone = useCallback(
    (value: string): string | undefined => {
      const trimmed = value.trim();
      if (trimmed && !/^\+?\d{10,15}$/.test(trimmed)) {
        return "ژمارەی مۆبایلی دەستپێکردن نادروستە (دەبێت ١٠-١٥ ژمارە بێت)";
      }
      return undefined;
    },
    [],
  );

  // Validate all fields before submission
  const _validateAllFields = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    newErrors.name = validateName(name);
    const effectiveSlug =
      slug.trim() || (name.trim() ? buildSlugFromName(name.trim()) : "");
    newErrors.slug =
      (effectiveSlug ? validateSlug(effectiveSlug) : validateSlug(slug)) ||
      slugApiError ||
      undefined;
    newErrors.backgroundColor = validateBackgroundColor(backgroundColor);
    newErrors.templateKey = validateTemplateKey(templateKey);
    newErrors.platforms = validatePlatforms(selectedPlatforms);
    newErrors.links = validateLinks(socialLinks, selectedPlatforms);
    newErrors.questions = validateQuestions(
      whatsappQuestions,
      whatsappModalEnabled,
    );
    if (footerPhone.trim()) {
      newErrors.footerPhone = validateFooterPhone(footerPhone);
    }
    if (subtitleColor.trim()) {
      const isSolidHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(
        subtitleColor.trim(),
      );
      if (!isSolidHex) {
        newErrors.subtitleColor = "ڕەنگ دەبێت کۆدی Hex بێت (وەک #000000)";
      }
    }

    setErrors(newErrors);
    setTouched({
      name: true,
      slug: true,
      backgroundColor: true,
      templateKey: true,
      platforms: true,
      links: true,
      footerPhone: true,
      subtitleColor: true,
    });

    return !Object.values(newErrors).some((error) => error !== undefined);
  }, [
    name,
    slug,
    slugApiError,
    backgroundColor,
    templateKey,
    selectedPlatforms,
    socialLinks,
    whatsappQuestions,
    whatsappModalEnabled,
    footerPhone,
    subtitleColor,
    validateName,
    validateSlug,
    validateBackgroundColor,
    validateTemplateKey,
    validatePlatforms,
    validateLinks,
    validateQuestions,
    validateFooterPhone,
  ]);

  // Question rows clear their own error as soon as the missing half is typed.
  useEffect(() => {
    setQuestionErrors((previous) => {
      if (Object.keys(previous).length === 0) return previous;
      const next: Record<string, { text?: string; message?: string }> = {};
      for (const question of whatsappQuestions) {
        if (!previous[question.id]) continue;
        const error = validateWhatsappQuestion(question);
        if (error) next[question.id] = error;
      }
      return next;
    });
  }, [whatsappQuestions]);

  // Debounced name validation
  const debouncedNameValidation = useMemo(
    () =>
      debounce((value: unknown) => {
        if (touched.name && typeof value === "string") {
          setErrors((prev) => ({ ...prev, name: validateName(value) }));
        }
      }, 200),
    [touched.name, validateName],
  );

  // Update validation on field changes - optimized
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      debouncedNameValidation(value);
    },
    [debouncedNameValidation],
  );

  const handleNameBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, name: true }));
    setErrors((prev) => ({ ...prev, name: validateName(name) }));
  }, [name, validateName]);

  const handleBackgroundColorChange = useCallback(
    (value: string) => {
      setBackgroundColor(value);
      if (touched.backgroundColor) {
        setErrors((prev) => ({
          ...prev,
          backgroundColor: validateBackgroundColor(value),
        }));
      }
    },
    [touched.backgroundColor, validateBackgroundColor],
  );

  const handleBackgroundColorBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, backgroundColor: true }));
    setErrors((prev) => ({
      ...prev,
      backgroundColor: validateBackgroundColor(backgroundColor),
    }));
  }, [backgroundColor, validateBackgroundColor]);

  const handleTemplateKeyChange = useCallback(
    (value: string) => {
      setTemplateKey(value);
      setTemplateConfig((prev) => normalizeTemplateConfig(value, prev));
      setTouched((prev) => ({ ...prev, templateKey: true }));
      setErrors((prev) => ({
        ...prev,
        templateKey: validateTemplateKey(value),
      }));
    },
    [validateTemplateKey],
  );

  // Handle image upload - memoized for performance
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const validationError = validateUploadFile(file, {
          allowedMimeTypes: ["image/png", "image/jpeg"],
          maxBytes: workflow.maxImageBytes ?? 10 * 1024 * 1024,
        });
        if (validationError) {
          setUploadError(validationError);
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }
        setUploadError(null);

        // Clear any previous image errors
        setErrors((prev) => ({ ...prev, image: undefined }));

        setProfileImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [workflow.maxImageBytes],
  );

  const handleBackgroundImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset the input so re-picking the same file still fires a change.
      e.target.value = "";
      if (!file) {
        return;
      }

      const validationError = validateUploadFile(file, {
        allowedMimeTypes: ["image/png", "image/jpeg"],
        maxBytes: workflow.maxImageBytes ?? 10 * 1024 * 1024,
      });
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setUploadError(null);
      setBackgroundImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [workflow.maxImageBytes],
  );

  const handleRemoveBackgroundImage = useCallback(() => {
    setBackgroundImage(null);
    setBackgroundImagePreview(null);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setProfileImage(null);
    // Reset to business's default avatar instead of null
    setProfileImagePreview(businessDefaults?.default_avatar || null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [businessDefaults]);

  // Upload image to local file system storage
  const uploadImage = async (
    file: File,
    assetType: "profile-image" | "background-image",
  ): Promise<string | null> => {
    if (isBrowserLocal) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => reject(new Error("Unable to read local image"));
        reader.readAsDataURL(file);
      });
    }
    return enqueueImageUpload(async () => {
      setUploadError(null);
      try {
        const formData = new FormData();
        const linktreeKey = (editData?.linktree.id || slug || name || "draft")
          .trim()
          .toLowerCase();
        formData.append("file", file);
        formData.append("linktreeKey", linktreeKey);
        formData.append("assetType", assetType);

        const response = await fetch(apiEndpoints.upload, {
          method: "POST",
          cache: "no-store", // Always fetch fresh data
          credentials: "include", // Include cookies for authentication
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

  // Removed processedLinks memo - now computed inline in useEffect to avoid dependency issues

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      initializedLinktreeIdRef.current = null;
      setUploadError(null);
      resetSubmission();
      setLinkErrors({});
      setBackgroundImage(null);
      setBackgroundImagePreview(null);
      const defaultTemplate =
        workflow.allowedTemplateKeys?.[0] ??
        resolveDefaultTemplateKey(businessDefaults?.default_template);
      setBackgroundColor(
        resolveDefaultBackgroundColor(
          businessDefaults?.default_background_color,
        ),
      );
      setTemplateKey(defaultTemplate);
      setTemplateConfig(normalizeTemplateConfig(defaultTemplate, null));
    }
  }, [
    isOpen,
    businessDefaults?.default_background_color,
    businessDefaults?.default_template,
    resetSubmission,
    workflow.allowedTemplateKeys,
  ]);

  // Initialize form data when editing (optimized - only runs when editData changes)
  useEffect(() => {
    if (!isOpen || isLoadingEditData) {
      return;
    }

    // Initialize only once when editData is first loaded or when switching between edit/create modes
    const shouldInitialize = editData
      ? initializedLinktreeIdRef.current !== editData.linktree.id
      : initializedLinktreeIdRef.current !== "create";

    if (!shouldInitialize) {
      return;
    }

    if (editData) {
      // ============================================
      // VALIDATE AND SANITIZE EDIT DATA
      // ============================================
      const linktree = editData.linktree;

      // Validate linktree ID
      if (!linktree.id || typeof linktree.id !== "string") {
        console.error("Invalid linktree ID in edit data");
        console.error("Invalid linktree data");
        return;
      }

      // Sanitize and set name (max 100 chars)
      const sanitizedName = (linktree.name || "").trim().slice(0, 100);
      if (!sanitizedName) {
        setName("Untitled Linktree");
      } else {
        setName(sanitizedName);
      }

      // Sanitize and set subtitle (max 200 chars)
      const sanitizedSubtitle = (linktree.subtitle || "").trim().slice(0, 200);
      setSubtitle(sanitizedSubtitle || DEFAULT_SUBTITLE);
      setSubtitleColor(extractSolidHex(linktree.subtitle_color));
      setSubmitError(null);

      // Sanitize and set description (max 500 chars)
      const sanitizedDescription = (linktree.description || "")
        .trim()
        .slice(0, 500);
      setDescription(sanitizedDescription || DEFAULT_DESCRIPTION);

      // Sanitize and set slug (max 100 chars, validate format)
      const sanitizedSlug = (
        linktree.seo_name || buildSlugFromName(sanitizedName)
      )
        .trim()
        .slice(0, 100);
      setSlug(sanitizedSlug || buildSlugFromName(sanitizedName));

      // Validate and set background color
      const bgColor = linktree.background_color || "#eab308";
      setBackgroundColor(resolveDefaultBackgroundColor(bgColor));

      const normalizedConfig = normalizeTemplateConfig(
        undefined,
        (linktree.template_config as Record<string, unknown> | null) ?? null,
      );
      const configTemplateKey = normalizedConfig["templateKey"];
      const sanitizedTemplate =
        typeof configTemplateKey === "string" &&
        isTemplateKey(configTemplateKey)
          ? configTemplateKey
          : TEMPLATE_DEFAULT_ID;
      setTemplateKey(sanitizedTemplate);
      setTemplateConfig(normalizedConfig);

      // Only a stored upload path survives hydration; anything else is treated
      // as no image, matching what the public page will agree to paint.
      setBackgroundImage(null);
      setBackgroundImagePreview(readBackgroundImage(normalizedConfig));
      setBackgroundPattern(readBackgroundPattern(normalizedConfig));

      // Load WhatsApp modal config from template_config
      const whatsappModal = (
        linktree.template_config as Record<string, unknown> | null
      )?.whatsapp_modal;
      if (
        whatsappModal &&
        typeof whatsappModal === "object" &&
        !Array.isArray(whatsappModal)
      ) {
        const modal = whatsappModal as Record<string, unknown>;
        // Load enabled flag, default to false if not found
        const enabled =
          typeof modal.enabled === "boolean" ? modal.enabled : false;
        setWhatsappModalEnabled(enabled);
        if (typeof modal.title === "string") setWhatsappModalTitle(modal.title);
        if (typeof modal.subtitle === "string")
          setWhatsappModalSubtitle(modal.subtitle);
        if (Array.isArray(modal.questions)) {
          const questions = modal.questions
            .filter((q): q is WhatsAppQuestion => {
              if (!q || typeof q !== "object") return false;
              const obj = q as unknown as Record<string, unknown>;
              return (
                typeof obj.id === "string" &&
                typeof obj.text === "string" &&
                typeof obj.message === "string"
              );
            })
            .map((q) => {
              const obj = q as unknown as Record<string, unknown>;
              return {
                id: obj.id as string,
                text: obj.text as string,
                message: obj.message as string,
              };
            });
          if (questions.length > 0) setWhatsappQuestions(questions);
        }
      }

      // Load Dark Card config from template_config
      // Sanitize footer text (max 200 chars)
      const sanitizedFooterText = (linktree.footer_text || "")
        .trim()
        .slice(0, 200);
      // Always default to "Sponsor.krd" if empty
      setFooterText(sanitizedFooterText || DEFAULT_FOOTER_TEXT);

      // Validate and sanitize footer phone
      const footerPhoneValue = (linktree.footer_phone || "").trim();
      if (footerPhoneValue && /^\+?\d{10,15}$/.test(footerPhoneValue)) {
        setFooterPhone(footerPhoneValue);
      } else {
        setFooterPhone(DEFAULT_FOOTER_PHONE);
      }

      // Set footer hidden
      setFooterHidden(linktree.footer_hidden ?? false);

      // Set status
      setStatus(linktree.status === "inactive" ? "inactive" : "active");

      // Validate and set image
      if (linktree.image && typeof linktree.image === "string") {
        const imageUrl = linktree.image.trim();
        // Accept valid URLs (absolute or relative) and data URLs
        if (
          imageUrl.startsWith("http://") ||
          imageUrl.startsWith("https://") ||
          imageUrl.startsWith("/") ||
          imageUrl.startsWith("data:image/")
        ) {
          setProfileImagePreview(imageUrl);
        } else {
          // Silently handle invalid URLs - don't log warnings for edge cases
          setProfileImagePreview(null);
        }
      } else {
        setProfileImagePreview(null);
      }

      // Use memoized processed links (already validated in useMemo)
      // Access processedLinks directly from the memoized value
      const currentProcessedLinks =
        editData.links && editData.links.length > 0
          ? (() => {
              const sortedLinks = [...editData.links].sort(
                (a, b) => (a.display_order || 0) - (b.display_order || 0),
              );
              return sortedLinks.map((link, index) => {
                const linkId = `${link.platform}-${link.id}-${index}`;
                const extracted = extractValueFromUrl(
                  link.platform,
                  link.url,
                  link.metadata || null,
                );
                return {
                  id: linkId,
                  platform: link.platform,
                  url: link.url,
                  value: extracted.value,
                  countryCode: extracted.countryCode,
                  displayName:
                    link.display_name || getPlatformNameKurdish(link.platform), // Pre-fill with Kurdish if not set
                  customColor: (link.metadata as Record<string, string>)
                    ?.custom_color,
                  customIcon: (link.metadata as Record<string, string>)
                    ?.custom_icon,
                  enabled: true,
                  order: link.display_order || index,
                };
              });
            })()
          : [];

      if (currentProcessedLinks.length > 0) {
        setSocialLinks(currentProcessedLinks);
      } else {
        setSocialLinks([]);
      }

      // Only reset to first step when first opening edit mode, not on subsequent renders
      if (initializedLinktreeIdRef.current === null) {
        setCurrentStep("basic");
        resetSubmission();
      }

      initializedLinktreeIdRef.current = editData.linktree.id;
    } else if (!editData) {
      // Reset form for create mode - use business defaults if available
      const defaultTemplate = resolveDefaultTemplateKey(
        businessDefaults?.default_template,
      );
      const defaultBusinessName = businessIdentity?.name?.trim() || "";
      const defaultBusinessPhone =
        businessIdentity?.phone?.trim() ||
        businessDefaults?.default_footer_phone?.trim() ||
        "";
      setName(isDefault ? defaultBusinessName : "");
      setSubtitle(DEFAULT_SUBTITLE);
      setSubtitleColor("");
      setDescription(DEFAULT_DESCRIPTION);
      setSlug("");
      setBackgroundColor(
        resolveDefaultBackgroundColor(
          businessDefaults?.default_background_color,
        ),
      );
      setTemplateKey(defaultTemplate);
      setTemplateConfig(normalizeTemplateConfig(defaultTemplate, null));
      setProfileImage(null);
      setProfileImagePreview(businessDefaults?.default_avatar || null);
      setBackgroundImage(null);
      setBackgroundImagePreview(null);
      setBackgroundPattern(BACKGROUND_PATTERN_DEFAULT);
      if (isDefault) {
        const normalizedPhone = normalizeBusinessPhone(defaultBusinessPhone);
        setSocialLinks(
          ["whatsapp", "phone"].map((platform, order) => ({
            id: generateLinkId(platform),
            platform,
            url: generateUrl(
              platform,
              normalizedPhone.value,
              normalizedPhone.countryCode,
            ),
            value: normalizedPhone.value,
            countryCode: normalizedPhone.countryCode,
            displayName: getPlatformNameKurdish(platform),
            enabled: true,
            order,
          })),
        );
      } else {
        setSocialLinks([]);
      }
      setFooterText(
        businessDefaults?.default_footer_text || DEFAULT_FOOTER_TEXT,
      );
      setFooterPhone(
        businessDefaults?.default_footer_phone || DEFAULT_FOOTER_PHONE,
      );
      setFooterHidden(businessDefaults?.default_footer_hidden ?? false);
      setStatus("active");
      setWhatsappModalEnabled(
        businessDefaults?.default_whatsapp_enabled ?? false,
      );
      setWhatsappModalTitle("پەیوەندی کردن");
      setWhatsappModalSubtitle("پرسیارێک هەڵبژێرە");
      setWhatsappQuestions([
        {
          id: "order",
          text: "داواکردن",
          message: "سڵاو بەڕێز دەمەوێت داوا بکەم.",
        },
        {
          id: "price",
          text: "زانینی نرخ",
          message: "سڵاو بەڕێز، نرخی چەندە ؟",
        },
        { id: "other", text: "پرسیارێکی تر", message: "سڵاو" },
      ]);
      setCurrentStep("basic");
      resetSubmission();
      initializedLinktreeIdRef.current = "create";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData?.linktree.id, isOpen, isLoadingEditData]);

  // Debounced slug generation - optimized for performance
  const debouncedSlugUpdate = useMemo(
    () =>
      debounce((newName: unknown) => {
        if (typeof newName === "string" && newName && !isEditMode) {
          const generatedSlug = buildSlugFromName(newName);
          startTransition(() => {
            setSlug(generatedSlug);
            // Validate auto-generated slug
            if (touched.slug) {
              setErrors((prev) => ({
                ...prev,
                slug: validateSlug(generatedSlug),
              }));
            }
          });
        }
      }, 300),
    [isEditMode, touched.slug, validateSlug],
  );

  // Auto-generate slug from name
  useEffect(() => {
    debouncedSlugUpdate(name);
  }, [name, debouncedSlugUpdate]);

  /**
   * Debounced slug availability check.
   *
   * `cancelled` is not the same guard as the cleared timer: clearing the timer
   * only stops a request that has not been sent. Typing `abc` then `abcd` puts
   * two requests in flight, and without this the slower `abc` answer can land
   * last and paint an error for a slug the field no longer holds.
   */
  useEffect(() => {
    if (isBrowserLocal) {
      setSlugApiError(null);
      setCheckingSlug(false);
      return;
    }
    const s = slug.trim();
    if (!s) {
      setSlugApiError(null);
      setCheckingSlug(false);
      return;
    }
    let cancelled = false;
    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ slug: s });
        if (isEditMode && editData?.linktree?.id)
          params.set("excludeId", editData.linktree.id);
        const res = await fetch(`${apiEndpoints.checkSlug}?${params}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setSlugApiError(json.data ? null : "ئەم سلاگە پێشتر بەکارهاتووە");
          if (!json.data) setTouched((prev) => ({ ...prev, slug: true }));
        }
      } catch {
        // network error — don't block
      } finally {
        if (!cancelled) setCheckingSlug(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    slug,
    isEditMode,
    editData?.linktree?.id,
    apiEndpoints.checkSlug,
    isBrowserLocal,
  ]);

  /**
   * Debounced duplicate-name check.
   *
   * Advisory only. It never reaches `errors`, so it cannot block a save the
   * server would have accepted.
   */
  useEffect(() => {
    if (isBrowserLocal) {
      setNameWarning(null);
      setCheckingName(false);
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameWarning(null);
      setCheckingName(false);
      return;
    }
    let cancelled = false;
    setCheckingName(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ name: trimmed });
        if (isEditMode && editData?.linktree?.id)
          params.set("excludeId", editData.linktree.id);
        const res = await fetch(`${apiEndpoints.checkName}?${params}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setNameWarning(json.data ? null : "پەڕەیەکی تر بە هەمان ناو هەیە");
        }
      } catch {
        // network error — the name is not required to be unique anyway
      } finally {
        if (!cancelled) setCheckingName(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    name,
    isEditMode,
    editData?.linktree?.id,
    apiEndpoints.checkName,
    isBrowserLocal,
  ]);

  // Merge API slug error into displayed errors
  const displayErrors = useMemo(() => {
    if (!slugApiError) return errors;
    return { ...errors, slug: slugApiError };
  }, [errors, slugApiError]);

  // Note: platformMap removed - using functional state updates instead for better reliability

  useEffect(() => {
    if (!touched.platforms) return;
    setErrors((previous) => ({
      ...previous,
      platforms: validatePlatforms(selectedPlatforms),
    }));
  }, [selectedPlatforms, touched.platforms, validatePlatforms]);

  // Toggle a platform by updating the canonical link list. Selected IDs are
  // derived from this list so the selection and links steps cannot drift.
  const togglePlatform = useCallback(
    (platformId: string) => {
      const isSelected = socialLinks.some(
        (link) => link.platform === platformId,
      );
      if (!isSelected && maxLinks && socialLinks.length >= maxLinks) {
        setErrors((previous) => ({
          ...previous,
          platforms: `زۆرترین ژمارەی لینک بۆ ئەم بانگهێشتنامەیە ${maxLinks} ـە`,
        }));
        setTouched((previous) => ({ ...previous, platforms: true }));
        return;
      }
      startTransition(() => {
        setSocialLinks((prevLinks) => {
          const existingLinks = prevLinks.filter(
            (l) => l.platform === platformId,
          );
          const isSelected = existingLinks.length > 0;

          if (isSelected) {
            return prevLinks
              .filter((l) => l.platform !== platformId)
              .map((link, index) => ({ ...link, order: index }));
          }

          const newLink: SocialLink = {
            id: generateLinkId(platformId),
            platform: platformId,
            url: "",
            value: "",
            displayName: getPlatformNameKurdish(platformId),
            enabled: true,
            order: prevLinks.length,
          };
          const nonGpsLinks = prevLinks.filter(
            (link) => link.platform !== "gps",
          );
          const gpsLinks = prevLinks.filter((link) => link.platform === "gps");
          const nextLinks =
            platformId === "gps"
              ? [...nonGpsLinks, newLink]
              : [...nonGpsLinks, newLink, ...gpsLinks];

          return nextLinks.map((link, index) => ({ ...link, order: index }));
        });
      });
    },
    [generateLinkId, maxLinks, socialLinks],
  );

  // Add another instance of a platform - memoized for performance
  const addPlatformInstance = useCallback(
    (platformId: string) => {
      if (platformId === "gps") {
        return;
      }
      if (maxLinks && socialLinks.length >= maxLinks) {
        setErrors((previous) => ({
          ...previous,
          links: `زۆرترین ژمارەی لینک بۆ ئەم بانگهێشتنامەیە ${maxLinks} ـە`,
        }));
        setTouched((previous) => ({ ...previous, links: true }));
        return;
      }
      const newLinkId = generateLinkId(platformId);
      setSocialLinks((prev) => {
        const newLink: SocialLink = {
          id: newLinkId,
          platform: platformId,
          url: "",
          value: "",
          displayName: getPlatformNameKurdish(platformId), // Pre-fill with Kurdish
          enabled: true,
          order: prev.length,
        };
        const nonGpsLinks = prev.filter((link) => link.platform !== "gps");
        const gpsLinks = prev.filter((link) => link.platform === "gps");
        const nextLinks = [...nonGpsLinks, newLink, ...gpsLinks];
        return nextLinks.map((link, index) => ({ ...link, order: index }));
      });
    },
    [generateLinkId, maxLinks, socialLinks.length],
  );

  // Remove a link instance - memoized for performance
  const removeLinkInstance = useCallback((linkId: string) => {
    setSocialLinks((prev) =>
      prev
        .filter((link) => link.id !== linkId)
        .map((link, index) => ({ ...link, order: index })),
    );
    setLinkErrors((previous) => {
      const next = { ...previous };
      delete next[linkId];
      return next;
    });
  }, []);

  // Update social link
  const updateSocialLink = useCallback(
    (id: string, value: string) => {
      setSocialLinks((prev) => {
        const existing = prev.find((link) => link.id === id);
        const platformId = existing
          ? existing.platform
          : id.includes("-")
            ? id.split("-")[0]
            : id;
        const isPhoneBased =
          platformId === "whatsapp" ||
          platformId === "phone" ||
          platformId === "viber";
        const code = isPhoneBased ? existing?.countryCode || "964" : "";
        const url = generateUrl(
          platformId,
          value || "",
          isPhoneBased ? code : undefined,
        );

        // If this link already has an error, re-validate it in real-time
        if (linkErrors[id]) {
          const error = validateSingleLink(platformId, value || "", code);
          setLinkErrors((prevErrors) => {
            if (error) {
              return { ...prevErrors, [id]: error };
            } else {
              const nextErrors = { ...prevErrors };
              delete nextErrors[id];
              return nextErrors;
            }
          });
        }

        if (!existing) {
          // Create new link if it doesn't exist
          const newLink: SocialLink = {
            id,
            platform: platformId,
            url,
            value: value || "",
            countryCode: code,
            displayName: getPlatformNameKurdish(platformId), // Pre-fill with Kurdish
            enabled: true,
            order: prev.length,
          };
          return [...prev, newLink];
        }

        // Update existing link
        const updatedLink: SocialLink = {
          ...existing,
          url,
          value: value || "",
          countryCode: code,
        };

        // Return new array with updated link
        return prev.map((link) => (link.id === id ? updatedLink : link));
      });
    },
    [linkErrors],
  );

  // Update display name for a link
  const updateDisplayName = useCallback((id: string, displayName: string) => {
    setSocialLinks((prev) => {
      const existing = prev.find((link) => link.id === id);
      if (!existing) {
        return prev; // Link doesn't exist
      }

      // Create updated link object
      const updatedLink: SocialLink = {
        ...existing,
        displayName: displayName || undefined,
      };

      // Return new array with updated link
      return prev.map((link) => (link.id === id ? updatedLink : link));
    });
  }, []);

  // Update custom color for a link
  const updateCustomColor = useCallback((id: string, customColor: string) => {
    setSocialLinks((prev) => {
      const existing = prev.find((link) => link.id === id);
      if (!existing) {
        return prev;
      }
      return prev.map((link) =>
        link.id === id ? { ...existing, customColor } : link,
      );
    });
  }, []);

  // Update custom icon for a link
  const updateCustomIcon = useCallback((id: string, customIcon: string) => {
    setSocialLinks((prev) => {
      const existing = prev.find((link) => link.id === id);
      if (!existing) {
        return prev;
      }
      return prev.map((link) =>
        link.id === id ? { ...existing, customIcon } : link,
      );
    });
  }, []);

  const updateCountryCode = useCallback((id: string, countryCode: string) => {
    if (!countryCode || !/^\d{1,3}$/.test(countryCode.trim())) {
      return;
    }

    const trimmedCode = countryCode.trim();

    // Update the link with new country code
    setSocialLinks((prev) => {
      const existing = prev.find((link) => link.id === id);
      if (!existing) {
        return prev; // Link doesn't exist
      }

      // Only update country code for phone-based platforms
      const isPhoneBased =
        existing.platform === "whatsapp" ||
        existing.platform === "phone" ||
        existing.platform === "viber";
      if (!isPhoneBased) {
        return prev; // Not a phone-based platform
      }

      // Generate new URL with updated country code and current value
      const newUrl = generateUrl(
        existing.platform,
        existing.value || "",
        trimmedCode,
      );

      // Create updated link object
      const updatedLink: SocialLink = {
        ...existing,
        url: newUrl,
        countryCode: trimmedCode,
      };

      // Run validation with the new country code and current value
      const error = validateSingleLink(
        existing.platform,
        existing.value || "",
        trimmedCode,
      );
      setLinkErrors((prevErrors) => {
        if (error) {
          return { ...prevErrors, [id]: error };
        } else {
          const nextErrors = { ...prevErrors };
          delete nextErrors[id];
          return nextErrors;
        }
      });

      // Return new array with updated link
      return prev.map((link) => (link.id === id ? updatedLink : link));
    });
  }, []);

  const handleLinkBlur = useCallback(
    (id: string) => {
      const link = socialLinks.find((l) => l.id === id);
      if (!link) return;

      const error = validateSingleLink(
        link.platform,
        link.value || "",
        link.countryCode,
      );
      setLinkErrors((prev) => {
        if (error) {
          return { ...prev, [id]: error };
        } else {
          const next = { ...prev };
          delete next[id];
          return next;
        }
      });
    },
    [socialLinks],
  );

  // Handle next step with validation - memoized for performance
  const handleNextStep = useCallback(() => {
    if (currentStep === "basic") {
      // Validate basic fields before moving to next step
      const nameError = validateName(name);
      const slugError = slug.trim() ? validateSlug(slug) : undefined;
      const bgError = validateBackgroundColor(backgroundColor);
      const templateError = validateTemplateKey(templateKey);

      if (nameError || slugError || slugApiError || bgError || templateError) {
        setErrors((prev) => ({
          ...prev,
          name: nameError,
          slug: slugError || slugApiError || undefined,
          backgroundColor: bgError,
          templateKey: templateError,
        }));
        setTouched((prev) => ({
          ...prev,
          name: true,
          slug: slug.trim() ? true : false,
          backgroundColor: true,
          templateKey: true,
        }));

        if (nameError) {
          console.error(nameError);
          document.getElementById("name")?.focus();
        } else if (slugError || slugApiError) {
          console.error(slugError || slugApiError);
          document.getElementById("slug")?.focus();
        } else if (bgError) {
          console.error(bgError);
        } else if (templateError) {
          console.error(templateError);
        }
        return;
      }

      // Clear errors if validation passes
      setErrors((prev) => ({
        ...prev,
        name: undefined,
        slug: slugApiError || undefined,
        backgroundColor: undefined,
        templateKey: undefined,
      }));
      setCurrentStep("select");
    } else if (currentStep === "select") {
      // Validate platforms before moving to links step
      const platformsError = validatePlatforms(selectedPlatforms);

      if (platformsError) {
        setErrors((prev) => ({ ...prev, platforms: platformsError }));
        setTouched((prev) => ({ ...prev, platforms: true }));
        console.error(platformsError);
        return;
      }

      // Clear errors if validation passes
      setErrors((prev) => ({ ...prev, platforms: undefined }));
      setCurrentStep("links");
    }
  }, [
    currentStep,
    name,
    slug,
    slugApiError,
    backgroundColor,
    templateKey,
    selectedPlatforms,
    validateName,
    validateSlug,
    validateBackgroundColor,
    validateTemplateKey,
    validatePlatforms,
  ]);

  // Handle back step - memoized for performance
  const handleBackStep = useCallback(() => {
    setSubmitError(null);
    if (currentStep === "select") {
      setCurrentStep("basic");
    } else if (currentStep === "links") {
      setCurrentStep("select");
    }
  }, [currentStep]);

  // Handle submit - ONLY called when "پاشەکەوتکردن" button is clicked,
  // or by "تۆمارکردنەوە" save-current on edit mode (which allows saving
  // without advancing to the final step).
  const handleSubmit = async (
    e: React.FormEvent,
    opts?: { allowNonFinalStep?: boolean },
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // CRITICAL: Prevent duplicate submissions
    // CRITICAL: Only allow submission on the links step
    if (currentStep !== "links" && !opts?.allowNonFinalStep) {
      return;
    }
    if (!beginSubmission()) return;

    try {
      setSubmitError(null);

      // ============================================
      // VALIDATION CHECKS
      // ============================================

      // Validate all fields before submission
      const fieldErrors: typeof errors = {};
      fieldErrors.name = validateName(name);
      const effectiveSlug =
        slug.trim() || (name.trim() ? buildSlugFromName(name.trim()) : "");
      fieldErrors.slug =
        (effectiveSlug ? validateSlug(effectiveSlug) : validateSlug(slug)) ||
        slugApiError ||
        undefined;
      fieldErrors.backgroundColor = validateBackgroundColor(backgroundColor);
      fieldErrors.templateKey = validateTemplateKey(templateKey);
      fieldErrors.platforms = validatePlatforms(selectedPlatforms);
      fieldErrors.links = validateLinks(socialLinks, selectedPlatforms);
      fieldErrors.questions = validateQuestions(
        whatsappQuestions,
        whatsappModalEnabled,
      );
      if (footerPhone.trim()) {
        fieldErrors.footerPhone = validateFooterPhone(footerPhone);
      }
      if (subtitleColor.trim()) {
        const isSolidHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(
          subtitleColor.trim(),
        );
        if (!isSolidHex) {
          fieldErrors.subtitleColor = "ڕەنگ دەبێت کۆدی Hex بێت (وەک #000000)";
        }
      }

      const hasValidationErrors = Object.values(fieldErrors).some(
        (err) => err !== undefined,
      );

      if (hasValidationErrors) {
        setErrors(fieldErrors);
        setTouched({
          name: true,
          slug: true,
          backgroundColor: true,
          templateKey: true,
          platforms: true,
          links: true,
          footerPhone: true,
          subtitleColor: true,
        });

        let firstErrorMsg = "تکایە هەموو خانە پێویستەکان بە دروستی پڕبکەرەوە.";
        if (fieldErrors.name) {
          firstErrorMsg = fieldErrors.name;
          if (currentStep !== "basic") setCurrentStep("basic");
          setTimeout(() => document.getElementById("name")?.focus(), 50);
        } else if (fieldErrors.slug) {
          firstErrorMsg = fieldErrors.slug;
          if (currentStep !== "basic") setCurrentStep("basic");
          setTimeout(() => document.getElementById("slug")?.focus(), 50);
        } else if (fieldErrors.subtitleColor) {
          firstErrorMsg = fieldErrors.subtitleColor;
          if (currentStep !== "basic") setCurrentStep("basic");
        } else if (fieldErrors.backgroundColor) {
          firstErrorMsg = fieldErrors.backgroundColor;
          if (currentStep !== "basic") setCurrentStep("basic");
          document
            .querySelector("[data-bg-color-section]")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (
          fieldErrors.templateKey ||
          !templateKey ||
          !isTemplateKey(templateKey)
        ) {
          firstErrorMsg = fieldErrors.templateKey || "شێوازی پەڕە هەڵبژێرە";
          if (currentStep !== "basic") setCurrentStep("basic");
          document
            .querySelector("[data-template-section]")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (fieldErrors.platforms) {
          firstErrorMsg = fieldErrors.platforms;
          if (currentStep !== "select") setCurrentStep("select");
        } else if (fieldErrors.links) {
          firstErrorMsg = fieldErrors.links;
          if (currentStep !== "links") setCurrentStep("links");
        } else if (fieldErrors.questions) {
          firstErrorMsg = fieldErrors.questions;
          if (currentStep !== "basic") setCurrentStep("basic");
        } else if (fieldErrors.footerPhone) {
          firstErrorMsg = fieldErrors.footerPhone;
          if (currentStep !== "basic") setCurrentStep("basic");
        }

        setSubmitError({
          code: "VALIDATION_FAILED",
          title: "زانیارییەکان تەواو نین",
          message: firstErrorMsg,
          status: 400,
        });
        throw new Error("Validation failed");
      }

      // Validate name
      const sanitizedName = name.trim();

      // Validate slug
      const sanitizedSlug = slug.trim() || buildSlugFromName(sanitizedName);

      // Validate background color
      const selectedBgColor =
        BACKGROUND_COLORS.find((c) => c.id === backgroundColor)?.value ||
        backgroundColor;

      const selectedTemplateKey = isTemplateKey(templateKey)
        ? templateKey
        : TEMPLATE_DEFAULT_ID;

      // Validate links
      if (!selectedPlatforms || selectedPlatforms.length === 0) {
        console.error("لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە");
        throw new Error("No platforms selected");
      }

      // ============================================
      // IMAGE UPLOAD
      // ============================================
      let imageUrl: string | null = null;
      if (profileImage) {
        try {
          imageUrl = await uploadImage(profileImage, "profile-image");
          if (!imageUrl) {
            console.error("هەڵە لە بارکردنی وێنە");
            throw new Error("Image upload failed");
          }
        } catch (imageError) {
          console.error("Image upload error:", imageError);
          console.error("هەڵە لە بارکردنی وێنە");
          throw imageError;
        }
      } else if (profileImagePreview && !profileImage) {
        // Use existing image URL (only if it's not the default avatar)
        // Don't store default avatar in database - UI will handle it
        if (profileImagePreview !== "/images/DefaultAvatar.png") {
          imageUrl = profileImagePreview;
        }
        // If preview is default avatar, leave imageUrl as null
      }
      // If no image provided, imageUrl stays null - UI will show default avatar

      // A newly picked background is uploaded now; an untouched one keeps the
      // path it was hydrated with, and a removed one resolves to null.
      let backgroundImageUrl: string | null = null;
      if (backgroundImage) {
        backgroundImageUrl = await uploadImage(
          backgroundImage,
          "background-image",
        );
        if (!backgroundImageUrl) {
          throw new Error("Background image upload failed");
        }
      } else if (isBackgroundImageUrl(backgroundImagePreview)) {
        backgroundImageUrl = backgroundImagePreview;
      }

      // ============================================
      // PROCESS LINKS DATA
      // ============================================
      const normalizedLinks = normalizeSelectedSocialLinks(
        socialLinks,
        selectedPlatforms,
      );
      const { urls: processedLinks, metadata: linkMetadata } =
        groupSocialLinksByPlatform(normalizedLinks);
      // Final validation: ensure we have at least one link
      if (Object.keys(processedLinks).length === 0) {
        const hasSelectedPlatforms = selectedPlatforms.length > 0;
        if (hasSelectedPlatforms) {
          console.error("تکایە بەروارەکان بۆ لینکەکان بنووسە");
        } else {
          console.error("لانیکەم یەک پلاتفۆڕمەکان هەڵبژێرە");
        }
        throw new Error("No valid links provided");
      }

      // ============================================
      // SANITIZE TEXT FIELDS
      // ============================================
      const sanitizedSubtitle = subtitle.trim();
      const sanitizedDescription = description.trim() || DEFAULT_DESCRIPTION;
      const sanitizedFooterText = footerText.trim() || undefined;
      const sanitizedFooterPhone = footerPhone.trim() || undefined;

      // Validate footer phone format if provided
      if (sanitizedFooterPhone) {
        const phoneError = validateFooterPhone(sanitizedFooterPhone);
        if (phoneError) {
          setErrors((prev) => ({ ...prev, footerPhone: phoneError }));
          setTouched((prev) => ({ ...prev, footerPhone: true }));
          console.error(phoneError);
          throw new Error(phoneError);
        }
      }

      // ============================================
      // PREPARE PLATFORMS ARRAY
      // ============================================
      const platforms = Array.from(
        new Set(
          socialLinks
            .filter((l) => selectedPlatforms.includes(l.id))
            .map((l) => l.platform),
        ),
      );

      // ============================================
      // CALL PARENT SUBMIT HANDLER (AWAIT IT)
      // ============================================
      // Store WhatsApp modal config in template_config before normalization
      const templateConfigWithMessage = {
        ...templateConfig,
        [BACKGROUND_IMAGE_CONFIG_KEY]: backgroundImageUrl,
        [BACKGROUND_PATTERN_CONFIG_KEY]: backgroundPattern,
        // Include whatsapp_modal with enabled flag
        whatsapp_modal: {
          enabled: whatsappModalEnabled,
          ...(whatsappModalEnabled && whatsappQuestions.length > 0
            ? {
                title: whatsappModalTitle.trim() || "پەیوەندی کردن",
                subtitle: whatsappModalSubtitle.trim() || "پرسیارێک هەڵبژێرە",
                questions: whatsappQuestions.filter(
                  (q) => q.text.trim() && q.message.trim(),
                ),
              }
            : {}),
        },
      };
      const normalizedTemplateConfig = normalizeTemplateConfig(
        selectedTemplateKey,
        templateConfigWithMessage,
      );

      await onSubmit(
        {
          name: sanitizedName,
          subtitle: sanitizedSubtitle,
          subtitle_color: extractSolidHex(subtitleColor) || undefined,
          description: sanitizedDescription,
          slug: sanitizedSlug,
          image: imageUrl,
          background_color: selectedBgColor,
          templateKey: selectedTemplateKey,
          templateConfig: normalizedTemplateConfig,
          footer_text: sanitizedFooterText,
          footer_phone: sanitizedFooterPhone,
          footer_hidden: footerHidden,
          platforms: platforms,
          links: processedLinks,
          linkMetadata:
            Object.keys(linkMetadata).length > 0 ? linkMetadata : undefined,
          status,
          ...(isDefault ? { is_default: true } : {}),
        },
        editData?.linktree.id,
      );

      // Note: Modal closing is handled by parent component after successful submission
      // Don't reset isSubmitting here - let the modal close naturally reset the state
      // This keeps the button disabled with spinner until modal closes
    } catch (error) {
      console.error("Error submitting:", error);

      if (error instanceof Error && error.message === "Validation failed") {
        // submitError is already set with the specific field error
      } else if (error && typeof error === "object" && "linkErrors" in error) {
        const linkErrorsData = (
          error as Error & { linkErrors?: Record<string, string> }
        ).linkErrors;
        if (linkErrorsData && Object.keys(linkErrorsData).length > 0) {
          const mappedErrors: Record<string, string> = {};
          const platformLinkCounts = new Map<string, number>();
          selectedPlatforms.forEach((linkId) => {
            const link = socialLinks.find((l) => l.id === linkId);
            if (!link) return;

            const count = platformLinkCounts.get(link.platform) || 0;
            const errorKey = `${link.platform}_${count}`;

            if (linkErrorsData[errorKey]) {
              mappedErrors[linkId] = linkErrorsData[errorKey];
            }

            platformLinkCounts.set(link.platform, count + 1);
          });

          if (Object.keys(mappedErrors).length > 0) {
            setLinkErrors(mappedErrors);
            if (currentStep !== "links") setCurrentStep("links");
          }
        }
        setSubmitError({
          code: "LINK_ERRORS",
          title: "هەڵە لە لینکەکاندا هەیە",
          message:
            error instanceof Error &&
            error.message &&
            error.message !== "Some links have validation errors"
              ? error.message
              : "تکایە بەستەر و زانیاری لینکەکان بپشکنە و هەڵەکان چاک بکەوە.",
          status: 400,
        });
      } else {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن. تکایە دووبارە هەوڵبدەوە.";
        setSubmitError({
          code: "SUBMIT_FAILED",
          title: "پاشەکەوتکردن سەرکەوتوو نەبوو",
          message,
          status: 400,
        });
      }

      // ALWAYS reset submission flag on error so user can retry
      resetSubmission();
    }
  };

  // Handle reorder links - move up or down
  const handleMoveLink = useCallback(
    (linkId: string, direction: "up" | "down") => {
      // Get current sorted links for reordering
      const currentSorted = selectedPlatforms
        .map((linkId) => {
          const link = socialLinks.find((l) => l.id === linkId);
          if (!link) return null;
          return { linkId, link };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => (a.link.order ?? 0) - (b.link.order ?? 0));

      const currentIndex = currentSorted.findIndex(
        (item) => item.linkId === linkId,
      );

      if (currentIndex === -1) return;

      const currentItem = currentSorted[currentIndex];
      if (currentItem.link.platform === "gps") return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= currentSorted.length) return;

      // Swap items
      const reorderedLinks = [...currentSorted];
      [reorderedLinks[currentIndex], reorderedLinks[newIndex]] = [
        reorderedLinks[newIndex],
        reorderedLinks[currentIndex],
      ];

      const gpsItems = reorderedLinks.filter(
        (item) => item.link.platform === "gps",
      );
      const nonGpsItems = reorderedLinks.filter(
        (item) => item.link.platform !== "gps",
      );
      const orderedItems = [...nonGpsItems, ...gpsItems];

      const newSelectedPlatforms = orderedItems.map(
        (item: { linkId: string }) => item.linkId,
      );

      setSocialLinks((prev) =>
        prev.map((link) => {
          const index = newSelectedPlatforms.indexOf(link.id);
          return index !== -1 ? { ...link, order: index } : link;
        }),
      );
    },
    [selectedPlatforms, socialLinks],
  );

  // Check if there are any valid links (with values filled in) - optimized
  const hasValidLinks = useMemo(() => {
    if (selectedPlatforms.length === 0) return false;

    // Create a map for O(1) lookup instead of O(n) find
    const linksMap = new Map(socialLinks.map((link) => [link.id, link]));

    // Every selected platform must have a completed, valid link.
    for (const linkId of selectedPlatforms) {
      const link = linksMap.get(linkId);
      if (!link) return false;

      // Check if link has a value (user has filled in the input)
      const hasValue = link.value && link.value.trim();
      if (!hasValue) return false;

      if (
        validateSingleLink(link.platform, link.value || "", link.countryCode)
      ) {
        return false;
      }

      // Generate URL to verify it's valid
      const linkUrl =
        link.url && link.url.trim()
          ? link.url
          : generateUrl(link.platform, link.value || "", link.countryCode);

      if (!linkUrl || !linkUrl.trim()) return false;
    }

    return true;
  }, [selectedPlatforms, socialLinks]);

  const canContinueToNextStep = useMemo(() => {
    if (isLoadingEditData) return false;

    if (currentStep === "basic") {
      const slugError = slug.trim() ? validateSlug(slug) : undefined;
      return (
        !checkingSlug &&
        !slugApiError &&
        !validateName(name) &&
        !slugError &&
        !validateBackgroundColor(backgroundColor) &&
        !validateTemplateKey(templateKey)
      );
    }

    if (currentStep === "select") {
      return selectedPlatforms.length > 0;
    }

    return false;
  }, [
    isLoadingEditData,
    currentStep,
    checkingSlug,
    slugApiError,
    name,
    slug,
    backgroundColor,
    templateKey,
    selectedPlatforms.length,
    validateName,
    validateSlug,
    validateBackgroundColor,
    validateTemplateKey,
  ]);

  if (!isOpen) return null;

  return (
    <ManagementModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        workflow.title ??
        (isEditMode
          ? "دەستکاریکردنی پەڕە"
          : isDefault
            ? "دروستکردنی پەڕەی بنەڕەتی"
            : "پەڕەی نوێ دروست بکە")
      }
      description={
        currentStep === "basic"
          ? "زانیارییە سەرەکییەکان"
          : currentStep === "select"
            ? "پلاتفۆڕمەکان هەڵبژێرە"
            : "لینکەکان زیاد بکە"
      }
      createBusinessStyle
      sponsorKrdTheme={false}
      // The page being designed owns the modal's colour, so a checkbox or a
      // required marker in here matches what the visitor will actually see.
      accentColor={businessTheme.primary}
      progress={
        <ModalWizardProgress
          currentStep={currentStep}
          steps={[
            { id: "basic", label: "زانیارییەکان" },
            { id: "select", label: "پلاتفۆڕمەکان" },
            { id: "links", label: "لینکەکان" },
          ]}
        />
      }
      flushFooter
      footer={
        <ModalWizardActions
          isFirstStep={currentStep === "basic"}
          isFinalStep={currentStep === "links"}
          isLoadingData={isLoadingEditData}
          isSubmitting={isSubmitting}
          canContinue={
            currentStep === "links" ? hasValidLinks : canContinueToNextStep
          }
          disableWhenInvalid={false}
          submitLabel={
            workflow.submitLabel ??
            (isEditMode
              ? "پاشەکەوتکردن"
              : isDefault
                ? "دروستکردنی پەڕەی بنەڕەتی"
                : "دروستکردن")
          }
          saveCurrentLabel="ئێستا پاشەکەوت بکە"
          onSaveCurrent={
            isEditMode && currentStep !== "links"
              ? () => {
                  if (isSubmitting) return;
                  handleSubmit(
                    {
                      preventDefault: () => {},
                      stopPropagation: () => {},
                    } as React.FormEvent<HTMLFormElement>,
                    { allowNonFinalStep: true },
                  );
                }
              : undefined
          }
          onBack={handleBackStep}
          onCancel={onClose}
          onNext={handleNextStep}
          onSubmit={() => {
            if (currentStep !== "links" || isSubmitting) return;
            handleSubmit({
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.FormEvent<HTMLFormElement>);
          }}
        />
      }
    >
      <div
        dir="ltr"
        onKeyDown={(e) => {
          if (!shouldAdvanceModalWizardOnEnter(e)) return;
          e.preventDefault();
          e.stopPropagation();

          if (currentStep === "basic" || currentStep === "select") {
            handleNextStep();
          } else if (currentStep === "links" && !isSubmitting) {
            const syntheticEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.FormEvent<HTMLFormElement>;
            handleSubmit(syntheticEvent);
          }
        }}
      >
        {submitError && (
          <InlineRequestError className="mb-4" error={submitError} />
        )}
        {uploadError && (
          <InlineRequestError className="mb-4" error={uploadError} />
        )}
        {/* Loading state mirrors the first editor step to prevent layout shift. */}
        {isLoadingEditData && <SkeletonLinktreeBasicInfo />}

        {/* Step 1: Basic Info */}
        {!isLoadingEditData && currentStep === "basic" && (
          <BasicInfoStep
            profileImagePreview={profileImagePreview}
            hideRemoveImage={
              !profileImage && !!businessDefaults?.default_avatar
            }
            fileInputRef={fileInputRef}
            name={name}
            subtitle={subtitle}
            description={description}
            slug={slug}
            backgroundColor={backgroundColor}
            backgroundImagePreview={backgroundImagePreview}
            onBackgroundImageChange={handleBackgroundImageChange}
            onBackgroundImageRemove={handleRemoveBackgroundImage}
            templateKey={templateKey}
            footerText={footerText}
            footerPhone={footerPhone}
            footerHidden={footerHidden}
            isDefault={isDefault}
            errors={displayErrors}
            nameWarning={nameWarning}
            checkingName={checkingName}
            checkingSlug={checkingSlug}
            questionErrors={questionErrors}
            touched={touched}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
            onNameChange={handleNameChange}
            onNameBlur={handleNameBlur}
            onSubtitleChange={setSubtitle}
            subtitleColor={subtitleColor}
            onSubtitleColorChange={setSubtitleColor}
            onDescriptionChange={setDescription}
            onSlugChange={setSlug}
            onBackgroundColorChange={handleBackgroundColorChange}
            onBackgroundColorBlur={handleBackgroundColorBlur}
            onTemplateKeyChange={handleTemplateKeyChange}
            backgroundPattern={backgroundPattern}
            onBackgroundPatternChange={setBackgroundPattern}
            onFooterTextChange={setFooterText}
            onFooterPhoneChange={setFooterPhone}
            onFooterHiddenChange={setFooterHidden}
            whatsappModalEnabled={whatsappModalEnabled}
            onWhatsappModalEnabledChange={setWhatsappModalEnabled}
            whatsappModalTitle={whatsappModalTitle}
            whatsappModalSubtitle={whatsappModalSubtitle}
            whatsappQuestions={whatsappQuestions}
            onWhatsappModalTitleChange={setWhatsappModalTitle}
            onWhatsappModalSubtitleChange={setWhatsappModalSubtitle}
            onWhatsappQuestionsChange={setWhatsappQuestions}
            hideFooterSection={
              workflow.hideFooterSection ?? workflow.hideBusinessFields
            }
            hideWhatsappQuestions={
              workflow.hideWhatsappQuestions ?? workflow.hideBusinessFields
            }
            hideImageUploads={workflow.allowImageUploads === false}
            allowedTemplateKeys={workflow.allowedTemplateKeys}
          />
        )}

        {/* Step 2: Select Platforms */}
        {!isLoadingEditData && currentStep === "select" && (
          <PlatformSelectionStep
            socialLinks={socialLinks}
            error={errors.platforms}
            touched={touched.platforms}
            onTogglePlatform={togglePlatform}
          />
        )}

        {/* Step 3: Add Links */}
        {!isLoadingEditData && currentStep === "links" && (
          <LinksStep
            selectedPlatforms={selectedPlatforms}
            socialLinks={socialLinks}
            linkErrors={linkErrors}
            error={errors.links}
            touched={touched.links}
            onUpdateLink={updateSocialLink}
            onUpdateCountryCode={updateCountryCode}
            onUpdateDisplayName={updateDisplayName}
            onUpdateCustomColor={updateCustomColor}
            onUpdateCustomIcon={updateCustomIcon}
            onRemoveLink={removeLinkInstance}
            onAddPlatformInstance={addPlatformInstance}
            onMoveLink={handleMoveLink}
            onBlurLink={handleLinkBlur}
          />
        )}
      </div>
    </ManagementModal>
  );
});
